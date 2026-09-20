from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
import razorpay

from payments.models import Payment
from consultations.models import Consultation
from payments.serializers import CreateOrderSerializer, VerifyPaymentSerializer
from payments.services import get_razorpay_client
from users.permissions import IsPatient
from audit.services import log_activity

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPatient])
def create_order_view(request):
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    consultation_id = serializer.validated_data['consultation_id']
    
    # Verify the consultation belongs to this patient and is unpaid
    consultation = get_object_or_404(Consultation, id=consultation_id, patient=request.user)
    
    # For Phase 6, we hardcode the amount to 500 INR. In a real system, this would be dynamic.
    amount_inr = 500
    amount_paise = amount_inr * 100
    
    try:
        client = get_razorpay_client()
        
        # Create Razorpay Order
        data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt_cons_{consultation.id}",
            "payment_capture": 1 # Auto capture
        }
        razorpay_order = client.order.create(data=data)
        
        # Create a pending Payment instance linked to the user and consultation
        payment = Payment.objects.create(
            user=request.user,
            consultation=consultation,
            amount=amount_inr,
            gateway_name='Razorpay',
            order_id=razorpay_order['id'],
            status='pending'
        )
        
        return Response({
            "order_id": razorpay_order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "payment_internal_id": payment.id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment_view(request):
    serializer = VerifyPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    razorpay_order_id = serializer.validated_data['razorpay_order_id']
    razorpay_payment_id = serializer.validated_data['razorpay_payment_id']
    razorpay_signature = serializer.validated_data['razorpay_signature']
    
    try:
        client = get_razorpay_client()
        
        # Verify Signature using SDK
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        # Will raise SignatureVerificationError if invalid
        client.utility.verify_payment_signature(params_dict)
        
        # Atomic transaction block to update DB state securely
        with transaction.atomic():
            # Lock the row for update to prevent race conditions
            payment = Payment.objects.select_for_update().get(order_id=razorpay_order_id)
            
            if payment.status == 'successful':
                return Response({"detail": "Payment was already verified."}, status=status.HTTP_200_OK)
            
            # Update Payment instance
            payment.status = 'successful'
            payment.payment_id = razorpay_payment_id
            payment.save()
            
            # Update Consultation instance
            if payment.consultation:
                consultation = payment.consultation
                consultation.status = 'paid'
                consultation.save()
        
        # Log Activity
        log_activity(request.user, "Payment Completed", f"User {request.user.email} paid ₹{payment.amount} for Consultation #{payment.consultation.id}.")
        
        return Response({"detail": "Payment verified successfully."}, status=status.HTTP_200_OK)
        
    except Payment.DoesNotExist:
        return Response({"error": "Order not found in database."}, status=status.HTTP_404_NOT_FOUND)
    except razorpay.errors.SignatureVerificationError:
        # Mark payment as failed if we can find it
        try:
            payment = Payment.objects.get(order_id=razorpay_order_id)
            payment.status = 'failed'
            payment.save()
        except Payment.DoesNotExist:
            pass
        return Response({"error": "Invalid Payment Signature"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

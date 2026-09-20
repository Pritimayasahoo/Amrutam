from rest_framework import serializers
from payments.models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'user', 'consultation', 'amount', 'gateway_name', 'status', 'order_id', 'payment_id', 'refund_id', 'created_at', 'updated_at')
        read_only_fields = ('user', 'amount', 'gateway_name', 'status', 'order_id', 'payment_id', 'refund_id', 'created_at', 'updated_at')

class CreateOrderSerializer(serializers.Serializer):
    consultation_id = serializers.IntegerField(required=True)

class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(required=True)
    razorpay_payment_id = serializers.CharField(required=True)
    razorpay_signature = serializers.CharField(required=True)

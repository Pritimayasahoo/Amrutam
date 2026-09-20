from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from users.permissions import IsAdmin
from users.models import Doctor
from consultations.models import Consultation
from payments.models import Payment

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def system_overview_view(request):
    total_doctors = Doctor.objects.count()
    total_patients = User.objects.filter(is_staff=False, doctor_profile__isnull=True).count()
    total_consultations = Consultation.objects.count()
    
    # Calculate total revenue from successful payments
    payments = Payment.objects.filter(status='successful')
    total_revenue = sum(p.amount for p in payments)
    
    data = {
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_consultations": total_consultations,
        "total_revenue": total_revenue
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def all_consultations_view(request):
    consultations = Consultation.objects.all().select_related('patient', 'doctor__user', 'slot').order_by('-created_at')
    
    # We will construct a lightweight list for the admin dashboard
    data = []
    for cons in consultations.order_by('-created_at'):
        data.append({
            "id": cons.id,
            "patient_email": cons.patient.email,
            "doctor_email": cons.doctor.user.email,
            "status": cons.status,
            "created_at": cons.created_at,
            "has_prescription": hasattr(cons, 'prescription'),
            "prescription_text": cons.prescription.medications if hasattr(cons, 'prescription') else None,
            "slot_time": cons.slot.start_time if cons.slot else None
        })
        
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def all_users_view(request):
    users = User.objects.all().select_related('doctor_profile').order_by('-date_joined')
    
    data = []
    for user in users:
        role = 'Admin' if user.is_staff else ('Doctor' if hasattr(user, 'doctor_profile') else 'Patient')
        data.append({
            "id": user.id,
            "email": user.email,
            "role": role,
            "date_joined": user.date_joined,
            "is_active": user.is_active
        })
        
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def system_logs_view(request):
    from audit.models import AuditLog
    logs = AuditLog.objects.all().order_by('-created_at')[:50]
    
    data = []
    for log in logs:
        data.append({
            "id": log.id,
            "user": log.user.email if log.user else "System",
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at
        })
        
    return Response(data, status=status.HTTP_200_OK)

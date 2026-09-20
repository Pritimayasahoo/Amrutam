from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from consultations.models import AvailabilitySlot, Consultation, Prescription
from users.models import Doctor
from consultations.serializers import DoctorSerializer, AvailabilitySlotSerializer, ConsultationSerializer, PrescriptionSerializer
from users.permissions import IsDoctor, IsPatient
from audit.services import log_activity

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_list_view(request):
    doctors = Doctor.objects.all()
    serializer = DoctorSerializer(doctors, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_slots_view(request):
    queryset = AvailabilitySlot.objects.filter(is_booked=False)
    doctor_id = request.query_params.get('doctor_id')
    
    # If a doctor is calling this and wants their own slots (booked or unbooked), they can pass doctor_id=self
    if doctor_id:
        queryset = queryset.filter(doctor_id=doctor_id)
        
    # If the requesting user is a doctor and didn't specify doctor_id, we can optionally return their slots, 
    # but for now we follow the explicit query param.
    if hasattr(request.user, 'doctor_profile'):
        # Override to show all slots (booked and unbooked) for the logged-in doctor
        queryset = AvailabilitySlot.objects.filter(doctor=request.user.doctor_profile)
        
    serializer = AvailabilitySlotSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def create_slot_view(request):
    serializer = AvailabilitySlotSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    # Validate no overlapping slots (realistic logic)
    start_time = serializer.validated_data['start_time']
    end_time = serializer.validated_data['end_time']
    
    if start_time >= end_time:
        return Response({"detail": "Start time must be before end time."}, status=status.HTTP_400_BAD_REQUEST)
        
    overlapping_slots = AvailabilitySlot.objects.filter(
        doctor=request.user.doctor_profile,
        start_time__lt=end_time,
        end_time__gt=start_time
    )
    
    if overlapping_slots.exists():
        return Response({"detail": "This slot overlaps with an existing slot."}, status=status.HTTP_400_BAD_REQUEST)
        
    serializer.save(doctor=request.user.doctor_profile)
    
    # Log Activity
    log_activity(request.user, "Doctor Slot Created", f"Dr. {request.user.email} created a slot for {start_time}.")
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_consultations_view(request):
    if hasattr(request.user, 'doctor_profile'):
        # Doctors see consultations booked with them
        queryset = Consultation.objects.filter(doctor=request.user.doctor_profile).select_related('patient', 'slot')
    else:
        # Patients see their own bookings
        queryset = Consultation.objects.filter(patient=request.user).select_related('doctor__user', 'slot')
        
    serializer = ConsultationSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPatient])
def create_consultation_view(request):
    serializer = ConsultationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    slot = serializer.validated_data.get('slot')
    
    # Validate slot is not already booked
    if slot and slot.is_booked:
        return Response({"detail": "This slot is already booked."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark slot as booked
    if slot:
        slot.is_booked = True
        slot.save()
        
    serializer.save(patient=request.user, status='payment_pending')
    
    # Log Activity
    log_activity(request.user, "Consultation Booked", f"User {request.user.email} booked a consultation (ID: {serializer.instance.id}).")
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_prescriptions_view(request):
    if hasattr(request.user, 'doctor_profile'):
        queryset = Prescription.objects.filter(consultation__doctor=request.user.doctor_profile)
    else:
        queryset = Prescription.objects.filter(consultation__patient=request.user)
        
    serializer = PrescriptionSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def create_prescription_view(request):
    serializer = PrescriptionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    consultation = serializer.validated_data['consultation']
    
    if consultation.doctor != request.user.doctor_profile:
        return Response({"detail": "You can only prescribe for your own consultations."}, status=status.HTTP_403_FORBIDDEN)
        
    if consultation.status != 'paid':
        return Response({"detail": "You can only issue a prescription for a paid consultation."}, status=status.HTTP_400_BAD_REQUEST)
        
    if hasattr(consultation, 'prescription'):
        return Response({"detail": "A prescription has already been issued for this consultation."}, status=status.HTTP_400_BAD_REQUEST)
        
    serializer.save()
    
    # Mark the consultation as completed
    consultation.status = 'completed'
    consultation.save()
    
    # Log Activity
    log_activity(request.user, "Prescription Issued", f"Dr. {request.user.email} issued a prescription for Consultation #{consultation.id}.")
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)

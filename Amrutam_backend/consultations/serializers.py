from rest_framework import serializers
from consultations.models import AvailabilitySlot, Consultation, Prescription
from users.models import Doctor

class DoctorSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Doctor
        fields = ('id', 'email', 'specialization', 'license_number', 'bio')

class AvailabilitySlotSerializer(serializers.ModelSerializer):
    doctor_details = DoctorSerializer(source='doctor', read_only=True)

    class Meta:
        model = AvailabilitySlot
        fields = ('id', 'doctor', 'doctor_details', 'start_time', 'end_time', 'is_booked')
        read_only_fields = ('doctor',)

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ('id', 'consultation', 'medications', 'instructions', 'issued_at')
        read_only_fields = ('issued_at',)

class ConsultationSerializer(serializers.ModelSerializer):
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    doctor_details = DoctorSerializer(source='doctor', read_only=True)
    slot_details = AvailabilitySlotSerializer(source='slot', read_only=True)
    prescription = PrescriptionSerializer(read_only=True)

    class Meta:
        model = Consultation
        fields = ('id', 'patient', 'patient_email', 'doctor', 'doctor_details', 'slot', 'slot_details', 'prescription', 'status', 'notes', 'created_at', 'updated_at')
        read_only_fields = ('patient', 'status')

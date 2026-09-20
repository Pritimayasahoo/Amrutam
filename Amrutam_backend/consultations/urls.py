from django.urls import path
from consultations.views import (
    doctor_list_view, 
    list_slots_view, create_slot_view, 
    list_consultations_view, create_consultation_view, 
    list_prescriptions_view, create_prescription_view
)

urlpatterns = [
    path('doctors/', doctor_list_view, name='doctors'),
    path('slots/', list_slots_view, name='list_slots'),
    path('slots/create/', create_slot_view, name='create_slot'),
    path('bookings/', list_consultations_view, name='list_bookings'),
    path('bookings/create/', create_consultation_view, name='create_booking'),
    path('prescriptions/', list_prescriptions_view, name='list_prescriptions'),
    path('prescriptions/create/', create_prescription_view, name='create_prescription'),
]

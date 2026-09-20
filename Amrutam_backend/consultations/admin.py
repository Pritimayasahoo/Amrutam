from django.contrib import admin
from consultations.models import AvailabilitySlot, Consultation, Prescription

admin.site.register(AvailabilitySlot)
admin.site.register(Consultation)
admin.site.register(Prescription)

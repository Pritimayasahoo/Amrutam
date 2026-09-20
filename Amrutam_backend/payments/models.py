from django.db import models
from django.conf import settings
from consultations.models import Consultation

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('successful', 'Successful'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    # Relationships
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='payments')
    consultation = models.ForeignKey(Consultation, on_delete=models.SET_NULL, null=True, related_name='payments')
    
    # Payment Details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    gateway_name = models.CharField(max_length=50, default='Razorpay')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Gateway specific tracking fields
    order_id = models.CharField(max_length=100, blank=True, null=True, help_text="Order ID returned by the payment gateway.")
    payment_id = models.CharField(max_length=100, blank=True, null=True, help_text="Transaction ID after successful payment.")
    refund_id = models.CharField(max_length=100, blank=True, null=True, help_text="Refund ID if payment was refunded.")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.id} for User {self.user.email if self.user else 'Unknown'} - {self.status}"

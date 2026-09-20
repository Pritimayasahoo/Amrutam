from django.urls import path
from payments.views import create_order_view, verify_payment_view

urlpatterns = [
    path('create-order/', create_order_view, name='create_order'),
    path('verify/', verify_payment_view, name='verify_payment'),
]

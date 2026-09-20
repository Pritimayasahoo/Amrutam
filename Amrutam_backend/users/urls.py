from django.urls import path
from users.views import send_otp_view, verify_signup_view, reset_password_view, user_profile_view, forgot_password_request_view

urlpatterns = [
    path('send-otp/', send_otp_view, name='send_otp'),
    path('verify-signup/', verify_signup_view, name='verify_signup'),
    path('forgot-password-request/', forgot_password_request_view, name='forgot_password_request'),
    path('reset-password/', reset_password_view, name='reset_password'),
    path('profile/', user_profile_view, name='user_profile'),
]

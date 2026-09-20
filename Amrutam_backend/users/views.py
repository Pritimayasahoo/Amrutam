from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from users.serializers import SendOTPSerializer, VerifySignupSerializer, ResetPasswordSerializer
from users.services import OTPService
from audit.services import log_activity

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp_view(request):
    serializer = SendOTPSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    
    success, message = OTPService.send_and_store_otp(email)
    
    if success:
        return Response({"detail": message}, status=status.HTTP_200_OK)
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_request_view(request):
    serializer = SendOTPSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    
    # Generic success message to prevent email enumeration
    generic_msg = "If this email exists and is a normal user account, an OTP has been sent."
    
    # Check if user exists and is a normal user (not admin, not doctor)
    user = User.objects.filter(email=email).first()
    if user and not user.is_staff and not hasattr(user, 'doctor_profile'):
        OTPService.send_and_store_otp(email)
        
    return Response({"detail": generic_msg}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_signup_view(request):
    serializer = VerifySignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    otp = serializer.validated_data['otp']
    
    # Verify OTP
    is_valid, message = OTPService.verify_otp(email, otp)
    if not is_valid:
        return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response({"detail": "User with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Create user
    user = User.objects.create_user(email=email, password=password)
    
    # Log Activity
    log_activity(user, "User Registered", f"New user {email} registered successfully.")
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        "detail": "Account created successfully.",
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    new_password = serializer.validated_data['new_password']
    otp = serializer.validated_data['otp']
    
    # Verify OTP
    is_valid, message = OTPService.verify_otp(email, otp)
    if not is_valid:
        return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password reset successfully. Please log in."}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    user = request.user
    is_doctor = hasattr(user, 'doctor_profile')
    is_admin = user.is_staff
    
    data = {
        "email": user.email,
        "is_doctor": is_doctor,
        "is_admin": is_admin
    }
    
    if is_doctor:
        data['doctor_profile'] = {
            "id": user.doctor_profile.id,
            "specialization": user.doctor_profile.specialization,
            "bio": user.doctor_profile.bio
        }
        
    return Response(data, status=status.HTTP_200_OK)

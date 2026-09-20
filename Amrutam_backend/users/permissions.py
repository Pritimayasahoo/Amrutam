from rest_framework import permissions

class IsDoctor(permissions.BasePermission):
    """
    Custom permission to only allow doctors to access certain views.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Check if the user has a doctor_profile
        return hasattr(request.user, 'doctor_profile')

class IsPatient(permissions.BasePermission):
    """
    Custom permission to only allow patients (normal users without a doctor profile) to access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # If user has a doctor_profile, they are not a normal patient
        return not hasattr(request.user, 'doctor_profile')

class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow admin (staff) to access.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

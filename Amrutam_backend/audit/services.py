from audit.models import AuditLog

def log_activity(user, action, details=""):
    """
    Helper function to create a System Activity Log.
    """
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            details=details
        )
    except Exception as e:
        # We don't want logging failures to crash the main request.
        print(f"Failed to create AuditLog: {e}")

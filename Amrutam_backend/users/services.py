import random
import requests
import json
import os
from django.core.cache import cache

def generate_otp():
    """Generates a 6-digit OTP."""
    return str(random.randint(100000, 999999))

def send_otp_message(email, otp):
    """Send OTP via email using MSG91 external service"""
    template = os.environ.get('MSG91_TEMPLATE_ID', 'global_otp')
    auth_key = os.environ.get('MSG91_AUTH_KEY')
    sender_email = os.environ.get('MSG91_SENDER_EMAIL')
    domain = os.environ.get('MSG91_DOMAIN')

    if not auth_key:
        print(f"Mock sending OTP {otp} to {email}")
        return True # Mock for local dev without key

    try:
        url = "https://control.msg91.com/api/v5/email/send"

        headers = {
            "Content-Type": "application/json",
            "authkey": auth_key,
            'content-type': "application/json"
        }

        payload = {
            "recipients": [
                {
                    "to": [{"email": email}],
                    "variables": {
                        "company_name": "Amrutam",
                        "otp": otp  
                    }
                }
            ],  
            "from": {"email": sender_email},
            "domain": domain,
            "template_id": template
        }
        
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        return response.status_code == 200
    except Exception as e:
        return False

class OTPService:
    @staticmethod
    def send_and_store_otp(email):
        """Generates, stores in Redis with limits, and sends an OTP."""
        # Rate limit: Max 3 OTP sends per 10 minutes
        send_attempts_key = f"otp_send_attempts_{email}"
        attempts = cache.get(send_attempts_key, 0)
        
        if attempts >= 3:
            return False, "Maximum OTP requests exceeded. Please try again later."
            
        otp = generate_otp()
        
        # Store OTP and reset validation attempts
        cache.set(f"otp_{email}", otp, timeout=600) # 10 mins TTL
        cache.set(f"otp_val_attempts_{email}", 0, timeout=600)
        
        # Increment send attempts
        cache.set(send_attempts_key, attempts + 1, timeout=600)
        
        success = send_otp_message(email, otp)
        if success:
            return True, "OTP sent successfully."
        else:
            return False, "Failed to send OTP email."

    @staticmethod
    def verify_otp(email, provided_otp):
        """Verifies the OTP against Redis and handles validation rate limiting."""
        val_attempts_key = f"otp_val_attempts_{email}"
        attempts = cache.get(val_attempts_key, 0)
        
        if attempts >= 3:
            return False, "Maximum invalid OTP attempts exceeded. Please request a new OTP after 10 minutes."
            
        stored_otp = cache.get(f"otp_{email}")
        
        if not stored_otp:
            return False, "OTP expired or not found. Please request a new one."
            
        if stored_otp == provided_otp:
            # Valid OTP! Clear it so it can't be reused.
            cache.delete(f"otp_{email}")
            cache.delete(val_attempts_key)
            return True, "OTP verified successfully."
        else:
            cache.set(val_attempts_key, attempts + 1, timeout=600)
            return False, "Invalid OTP."

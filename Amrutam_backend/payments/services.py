import razorpay
import os

def get_razorpay_client():
    """Initializes and returns a Razorpay client using credentials from the environment."""
    key_id = os.environ.get('RAZORPAY_KEY_ID')
    key_secret = os.environ.get('RAZORPAY_KEY_SECRET')
    
    if not key_id or not key_secret:
        raise Exception("Razorpay credentials not found in environment variables.")
        
    client = razorpay.Client(auth=(key_id, key_secret))
    return client

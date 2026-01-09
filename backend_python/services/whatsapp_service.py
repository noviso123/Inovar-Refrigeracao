import httpx
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# WPPConnect Configuration
WPPCONNECT_URL = os.getenv("WPPCONNECT_URL", "http://localhost:21465")
WPPCONNECT_SECRET = os.getenv("WPPCONNECT_SECRET", "THISISMYSECURETOKEN")
WPPCONNECT_SESSION = os.getenv("WPPCONNECT_SESSION", "inovar")

async def wpp_request(method: str, endpoint: str, data: dict = None, params: dict = None):
    """Make request to WPPConnect Server."""
    headers = {
        "Authorization": f"Bearer {WPPCONNECT_SECRET}",
        "Content-Type": "application/json"
    }
    url = f"{WPPCONNECT_URL}/api/{WPPCONNECT_SESSION}{endpoint}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
    except Exception as e:
        logger.error(f"WPPConnect request error: {e}")
        raise

async def generate_token():
    """Generate authentication token for WPPConnect session."""
    url = f"{WPPCONNECT_URL}/{WPPCONNECT_SESSION}/{WPPCONNECT_SECRET}/generate-token"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url)
            if response.status_code == 200:
                data = response.json()
                return data.get("token")
    except Exception as e:
        logger.error(f"Token generation error: {e}")
    return None

async def send_message_internal(number: str, message: str, media_url: Optional[str] = None) -> bool:
    """
    Internal function to send message via WPPConnect.
    Returns True if sent successfully, False otherwise.
    """
    try:
        # Clean phone number
        clean_number = "".join(filter(str.isdigit, number))
        if not clean_number.startswith("55"):
            clean_number = "55" + clean_number
        
        # Format for WPPConnect (needs @c.us suffix)
        wpp_number = f"{clean_number}@c.us"
        
        if media_url:
            # Send image
            data = {
                "phone": wpp_number,
                "path": media_url,
                "caption": message
            }
            response = await wpp_request("POST", "/send-image", data)
        else:
            # Send text
            data = {
                "phone": wpp_number,
                "message": message
            }
            response = await wpp_request("POST", "/send-message", data)
        
        if response.status_code in [200, 201]:
            logger.info(f"Message sent via WPPConnect to {clean_number}")
            return True
        else:
            logger.warning(f"WPPConnect error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending internal message: {e}")
        return False

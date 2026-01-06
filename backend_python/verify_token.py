import requests

import os
token = os.getenv("VERIFY_TOKEN", "placeholder_token")
url = "https://api.cloudflare.com/client/v4/user/tokens/verify"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

try:
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(response.json())
except Exception as e:
    print(f"Error: {e}")

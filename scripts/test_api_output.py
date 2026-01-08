import requests
import json

# We don't have a token easily available here, but /api/usuarios doesn't seem to have Depends(get_current_user) in the list_users route!
# Wait, let me check usuarios.py again.

url = "http://localhost:8000/api/usuarios"
try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")

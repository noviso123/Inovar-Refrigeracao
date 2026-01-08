import requests
import json

url = "http://localhost:8000/api/usuarios"
try:
    response = requests.get(url)
    data = response.json()
    if data and len(data) > 0:
        user = data[0]
        print("--- FIRST USER KEYS AND VALUES ---")
        for k, v in user.items():
            print(f"{k}: {v}")
        print("----------------------------------")
    else:
        print("No users found in API response.")
except Exception as e:
    print(f"Error: {e}")

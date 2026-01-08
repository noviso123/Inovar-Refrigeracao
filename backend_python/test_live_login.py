import requests
import json

def test_login():
    url = "http://localhost:8001/api/token"
    payload = {
        "username": "gabriel@hotmail.com",
        "password": "123456"
    }
    print(f"Attempting login for {payload['username']} at {url}...")
    try:
        response = requests.post(url, data=payload, timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_login()

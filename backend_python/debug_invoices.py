import requests
import sys

BASE_URL = "http://localhost:8000"
EMAIL = "admin2@admin.com"
PASSWORD = "admin123"

def login():
    print(f"Logging in as {EMAIL}...")
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"Email": EMAIL, "Password": PASSWORD})
    if response.status_code == 200:
        token = response.json()["token"]
        print("Login successful.")
        return token
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        sys.exit(1)

def check_invoices(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- Checking History (/api/admin/invoices) ---")
    try:
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=headers)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success. Data:", response.json())
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Exception: {e}")

    print("\n--- Checking Pending (/api/admin/invoices/pending) ---")
    try:
        response = requests.get(f"{BASE_URL}/api/admin/invoices/pending", headers=headers)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success. Data:", response.json())
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    token = login()
    check_invoices(token)

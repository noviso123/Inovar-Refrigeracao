import requests
import json
import os
from dotenv import load_dotenv

load_dotenv('backend_python/.env')

BASE_URL = "http://localhost:8001/api"
import time
TEST_EMAIL = f"admin_test_{int(time.time())}@test.com"
TEST_PASSWORD = "password123"

def print_status(step, success, message):
    icon = "✅" if success else "❌"
    print(f"{icon} {step}: {message}")

def login_admin():
    print("--- Logging in as Admin ---")
    # Try creating user first to ensure it exists
    try:
        print(f"Creating user {TEST_EMAIL}...")
        resp = requests.post(f"{BASE_URL}/usuarios", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "nome_completo": "Admin Test",
            "cargo": "admin"
        })
        if resp.status_code == 200:
            print("User created.")
        else:
            print(f"User creation failed (might exist): {resp.status_code}")
    except Exception as e:
        print(f"User creation exception: {e}")

    try:
        resp = requests.post(f"{BASE_URL}/token", data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            print_status("Login", True, "Logged in successfully")
            return token
        else:
            print_status("Login", False, f"Failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print_status("Login", False, f"Exception: {str(e)}")
        return None

def verify_settings(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Update Settings with Address
    print("\n--- Updating System Settings ---")
    address_data = {
        "cep": "01001-000",
        "logradouro": "Praça da Sé",
        "numero": "100",
        "complemento": "Lado ímpar",
        "bairro": "Sé",
        "cidade": "São Paulo",
        "estado": "SP"
    }
    
    payload = {
        "nomeFantasia": "Inovar Refrigeração Teste",
        "cnpj": "00.000.000/0001-00",
        "emailContato": "contato@inovar.com",
        "telefoneContato": "(11) 3333-3333",
        "endereco": address_data,
        "site": "https://inovar.com"
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/empresas/me", json=payload, headers=headers)
        if resp.status_code == 200:
            print_status("Update Settings", True, "Settings updated")
        else:
            print_status("Update Settings", False, f"Failed: {resp.status_code} - {resp.text}")
            return
    except Exception as e:
        print_status("Update Settings", False, f"Exception: {str(e)}")
        return

    # 2. Verify Persistence
    print("\n--- Verifying Settings Persistence ---")
    try:
        resp = requests.get(f"{BASE_URL}/empresas/me", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            returned_addr = data.get("endereco")
            
            if returned_addr == address_data:
                print_status("Verify Address", True, "Address data matches exactly")
            else:
                print_status("Verify Address", False, f"Mismatch: {returned_addr}")
                
            if data.get("nomeFantasia") == "Inovar Refrigeração Teste":
                print_status("Verify Name", True, "Business name updated")
        else:
            print_status("Get Settings", False, f"Failed: {resp.status_code}")
    except Exception as e:
        print_status("Get Settings", False, f"Exception: {str(e)}")

if __name__ == "__main__":
    # Ensure admin user exists (reuse existing logic or assume pre-created)
    # For this test, we assume the admin user from previous tests exists
    token = login_admin()
    if token:
        verify_settings(token)

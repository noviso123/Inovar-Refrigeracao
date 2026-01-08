import requests
import os
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001/api"
# Use a known test user email or create a new one
TEST_EMAIL = f"test_address_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
TEST_PASSWORD = "password123"

def print_status(step, success, message=""):
    icon = "✅" if success else "❌"
    print(f"{icon} {step}: {message}")

def test_user_api():
    print("=== Testing User API Address Field ===\n")

    # 1. Create User
    print("--- Creating User ---")
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "nome_completo": "Test User Refactored",
        "cargo": "prestador"
    }
    try:
        resp = requests.post(f"{BASE_URL}/usuarios", json=payload)
        if resp.status_code == 200:
            user_data = resp.json()
            user_id = user_data['id']
            print_status("Create User", True, f"Created user ID {user_id}")
        else:
            print_status("Create User", False, f"Failed: {resp.status_code} - {resp.text}")
            return
    except Exception as e:
        print_status("Create User", False, f"Exception: {str(e)}")
        return

    # 2. Update User with CPF & Address
    print("\n--- Updating User Data ---")
    address_data = {
        "rua": "Rua Teste",
        "numero": "123",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "estado": "SP",
        "cep": "01000-000"
    }
    update_payload = {
        "endereco": address_data,
        "cpf": "123.456.789-00",
        "telefone": "(11) 99999-9999"
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/usuarios/{user_id}", json=update_payload)
        if resp.status_code == 200:
            updated_data = resp.json()
            # Check if address is returned in response
            if "endereco" in updated_data and updated_data["endereco"] == address_data:
                print_status("Update Address", True, "Address updated and returned")
            else:
                print_status("Update Address", False, f"Address missing/incorrect: {updated_data.get('endereco')}")
            
            # Check CPF
            if updated_data.get("cpf") == "123.456.789-00":
                print_status("Update CPF", True, "CPF updated and returned")
            else:
                print_status("Update CPF", False, f"CPF missing/incorrect: {updated_data.get('cpf')}")

            # Verify RG is NOT present (should be ignored or not in model)
            if "rg" not in updated_data:
                print_status("Schema Check", True, "RG field correctly absent from response")
            else:
                print_status("Schema Check", False, f"RG field present in response (should be removed): {updated_data.get('rg')}")

        else:
            print_status("Update User", False, f"Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_status("Update User", False, f"Exception: {str(e)}")

    # 3. Get User (Verify Persistence)
    print("\n--- Fetching User ---")
    try:
        resp = requests.get(f"{BASE_URL}/usuarios/{user_id}")
        if resp.status_code == 200:
            fetched_data = resp.json()
            if "endereco" in fetched_data and fetched_data["endereco"] == address_data:
                print_status("Get User", True, "Address persisted and returned correctly")
            else:
                print_status("Get User", False, f"Address missing in GET response: {fetched_data.get('endereco')}")
        else:
            print_status("Get User", False, f"Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_status("Get User", False, f"Exception: {str(e)}")

    # Cleanup (Optional)
    # requests.delete(f"{BASE_URL}/usuarios/{user_id}")

if __name__ == "__main__":
    test_user_api()

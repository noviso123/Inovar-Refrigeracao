import requests
import json
import os
from dotenv import load_dotenv
import time

from validate_docbr import CPF

def generate_cpf():
    return "13750167338"

load_dotenv('backend_python/.env')

BASE_URL = "http://localhost:8001/api"
TEST_EMAIL = "jtsatiro@hotmail.com"
TEST_PASSWORD = "password123" # Assuming this is the password

def print_status(step, success, message):
    icon = "✅" if success else "❌"
    print(f"{icon} {step}: {message}")

def login_admin():
    print("--- Logging in as Admin ---")
    try:
        resp = requests.post(f"{BASE_URL}/usuarios", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "nome_completo": "Admin Doc Test",
            "cargo": "admin"
        })
        print(f"User creation status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"User creation failed: {resp.text}")
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

def verify_os_data(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create Prerequisites (Client, Location, Equipment)
    print("\n--- Creating Prerequisites ---")
    
    # Client
    ts = int(time.time())
    client_resp = requests.post(f"{BASE_URL}/clientes", json={
        "nome": "Cliente Teste Doc",
        "email": f"cliente_doc_{int(time.time())}@doc.com",
        "telefone": "11999999999",
        "cpf": generate_cpf()
    }, headers=headers)
    
    if client_resp.status_code in [200, 201]:
        client_id = client_resp.json()["id"]
    elif client_resp.status_code == 400 and "já cadastrado" in client_resp.text:
        print("Client already exists, fetching existing client...")
        clients = requests.get(f"{BASE_URL}/clientes", headers=headers).json()
        client_id = next(c["id"] for c in clients if c["cpf"] == generate_cpf() or c.get("documento") == generate_cpf())
    else:
        print(f"Client creation failed: {client_resp.text}")
        return
    
    # Location
    loc_resp = requests.post(f"{BASE_URL}/clientes/{client_id}/locais", json={
        "nickname": "Sede",
        "address": "Rua Teste",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01000-000",
        "street_number": "100",
        "neighborhood": "Centro",
        "complement": "Sala 1"
    }, headers=headers)
    if loc_resp.status_code not in [200, 201]:
        print(f"Location creation failed: {loc_resp.text}")
        return
    loc_id = loc_resp.json()["id"]
    
    # Equipment
    equip_resp = requests.post(f"{BASE_URL}/equipamentos", json={
        "nome": "Ar Split",
        "marca": "LG",
        "modelo": "Dual Inverter",
        "numero_serie": "SN123456",
        "tipo_equipamento": "Split",
        "location_id": loc_id
    }, headers=headers)
    if equip_resp.status_code not in [200, 201]:
        print(f"Equipment creation failed: {equip_resp.text}")
        return
    equip_id = equip_resp.json()["id"]
    
    # 2. Create OS
    print("\n--- Creating Service Order ---")
    os_resp = requests.post(f"{BASE_URL}/solicitacoes", json={
        "titulo": "Manutenção Preventiva",
        "cliente_id": client_id,
        "local_id": loc_id,
        "equipment_id": equip_id,
        "description": "Limpeza geral"
    }, headers=headers)
    os_id = os_resp.json()["id"]
    
    # 3. Verify Rich Data
    print("\n--- Verifying OS Rich Data ---")
    resp = requests.get(f"{BASE_URL}/solicitacoes/{os_id}", headers=headers)
    data = resp.json()
    
    # Checks
    success = True
    
    # Technician
    if data.get("tecnico") and data["tecnico"]["nome"] == "Admin Doc Test":
        print_status("Technician Data", True, "Technician name present")
    else:
        print_status("Technician Data", False, f"Missing or wrong: {data.get('tecnico')}")
        success = False
        
    # Client
    if data.get("cliente") and data["cliente"].get("documento"):
        print_status("Client Data", True, f"Client document present: {data['cliente']['documento']}")
    else:
        print_status("Client Data", False, "Missing client document")
        success = False

    # Location
    if data.get("local") and data["local"].get("bairro") == "Centro":
        print_status("Location Data", True, "Location segmented fields present")
    else:
        print_status("Location Data", False, "Missing location fields")
        success = False

    # Equipment
    if data.get("equipamento") and data["equipamento"].get("numero_serie") == "SN123456":
        print_status("Equipment Data", True, "Equipment serial present")
    else:
        print_status("Equipment Data", False, "Missing equipment serial")
        success = False

    # Company (Empresa)
    if data.get("empresa") and data["empresa"].get("nome_fantasia") == "Inovar Refrigeração":
        print_status("Company Data", True, "Company data present")
    else:
        print_status("Company Data", False, f"Missing or wrong company data: {data.get('empresa')}")
        success = False

    if success:
        print("\n✅ ALL CHECKS PASSED: OS Endpoint returns complete document data.")
    else:
        print("\n❌ SOME CHECKS FAILED.")

if __name__ == "__main__":
    token = login_admin()
    if token:
        verify_os_data(token)

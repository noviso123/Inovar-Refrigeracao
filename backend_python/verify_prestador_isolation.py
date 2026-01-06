import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def register_company(name, email, password):
    print(f"Registering company: {name}...")
    response = requests.post(f"{BASE_URL}/auth/register-company", json={
        "nome": name,
        "email": email,
        "senha": password,
        "telefone": "11999999999",
        "cnpj": "00000000000000"
    })
    if response.status_code != 200:
        print(f"Failed to register company: {response.text}")
        sys.exit(1)
    return response.json()

def login(email, password):
    print(f"Logging in as {email}...")
    response = requests.post(f"{BASE_URL}/auth/token", data={
        "username": email,
        "password": password
    })
    if response.status_code != 200:
        print(f"Failed to login: {response.text}")
        sys.exit(1)
    return response.json()["access_token"]

def create_client(token, name):
    print(f"Creating client: {name}...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/clientes", headers=headers, json={
        "nome": name,
        "email": f"{name.lower().replace(' ', '')}@example.com",
        "telefone": "11988888888"
    })
    if response.status_code != 200:
        print(f"Failed to create client: {response.text}")
        return None
    return response.json()

def list_clients(token):
    print("Listing clients...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/clientes", headers=headers)
    if response.status_code != 200:
        print(f"Failed to list clients: {response.text}")
        return []
    return response.json()

def create_equipment(token, client_id, name):
    print(f"Creating equipment: {name} for client {client_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/equipamentos", headers=headers, json={
        "nome": name,
        "cliente_id": client_id,
        "tipo_equipamento": "ar_condicionado"
    })
    if response.status_code != 200:
        print(f"Failed to create equipment: {response.text}")
        return None
    return response.json()

def update_equipment(token, equip_id, name):
    print(f"Updating equipment {equip_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(f"{BASE_URL}/equipamentos/{equip_id}", headers=headers, json={
        "nome": name
    })
    return response

def main():
    # 1. Register Company A
    email_a = "prestadorA@test.com"
    pass_a = "123456"
    try:
        register_company("Empresa A", email_a, pass_a)
    except:
        pass # Maybe already exists
    token_a = login(email_a, pass_a)

    # 2. Register Company B
    email_b = "prestadorB@test.com"
    pass_b = "123456"
    try:
        register_company("Empresa B", email_b, pass_b)
    except:
        pass
    token_b = login(email_b, pass_b)

    # 3. Company A creates Client A
    client_a = create_client(token_a, "Cliente A")
    if not client_a:
        print("Failed to create Client A")
        sys.exit(1)
    print(f"Client A created with ID: {client_a['id']}")

    # 4. Company B lists clients (Should NOT see Client A)
    clients_b = list_clients(token_b)
    client_a_in_b = any(c['id'] == client_a['id'] for c in clients_b)
    if client_a_in_b:
        print("❌ FAILURE: Company B can see Company A's client!")
    else:
        print("✅ SUCCESS: Company B cannot see Company A's client.")

    # 5. Company A creates Equipment A
    equip_a = create_equipment(token_a, client_a['id'], "Equipamento A")
    if not equip_a:
        print("Failed to create Equipment A")
        sys.exit(1)
    print(f"Equipment A created with ID: {equip_a['id']}")

    # 6. Company B tries to update Equipment A (Should Fail)
    response = update_equipment(token_b, equip_a['id'], "HACKED BY B")
    if response.status_code == 403 or response.status_code == 404:
        print(f"✅ SUCCESS: Company B cannot update Equipment A (Status: {response.status_code})")
    else:
        print(f"❌ FAILURE: Company B updated Equipment A! (Status: {response.status_code})")

    # 7. Company B tries to create equipment for Client A (Should Fail)
    print("Company B trying to create equipment for Client A...")
    response = requests.post(f"{BASE_URL}/equipamentos", headers={"Authorization": f"Bearer {token_b}"}, json={
        "nome": "Equipamento Malicioso",
        "cliente_id": client_a['id'],
        "tipo_equipamento": "ar_condicionado"
    })
    if response.status_code == 403 or response.status_code == 404 or response.status_code == 400:
         print(f"✅ SUCCESS: Company B cannot create equipment for Client A (Status: {response.status_code})")
    else:
         print(f"❌ FAILURE: Company B created equipment for Client A! (Status: {response.status_code})")

if __name__ == "__main__":
    main()

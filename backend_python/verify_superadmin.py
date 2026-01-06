import requests
import json
import sys

BASE_URL = "http://localhost:8000"
EMAIL = "admin2@admin.com"
PASSWORD = "admin123"

def login():
    print(f"Logging in as {EMAIL}...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"Email": EMAIL, "Password": PASSWORD})
        if response.status_code == 200:
            token = response.json()["token"]
            print("Login successful!")
            return token
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            sys.exit(1)
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

def list_companies(token):
    print("Listing companies...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/empresas", headers=headers)
    if response.status_code == 200:
        companies = response.json()
        print(f"Found {len(companies)} companies.")
        return companies
    else:
        print(f"Failed to list companies: {response.status_code} - {response.text}")
        return []

def create_company(token):
    print("Creating test company...")
    # We need to use register-company endpoint which doesn't require auth usually, but let's see.
    # Actually, register-company creates a user AND company.
    # Let's try to find an existing one first.
    pass

def create_client(token, company_id):
    print(f"Creating client for company {company_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "nome": "Cliente Teste SuperAdmin",
        "email": "cliente@teste.com",
        "telefone": "11999999999",
        "company_id": company_id
    }
    response = requests.post(f"{BASE_URL}/api/clientes", json=payload, headers=headers)
    if response.status_code == 200:
        client = response.json()
        print(f"Client created: ID {client['id']}")
        return client['id']
    else:
        with open("error.log", "w") as f:
            f.write(response.text)
        print(f"Failed to create client: {response.status_code}")
        sys.exit(1)

def create_os(token, company_id, client_id):
    print(f"Creating OS for company {company_id}, client {client_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "OS Teste SuperAdmin",
        "description": "Teste de criação por SuperAdmin",
        "client_id": client_id,
        "company_id": company_id,
        "status": "aberto",
        "priority": "alta"
    }
    response = requests.post(f"{BASE_URL}/api/solicitacoes", json=payload, headers=headers)
    if response.status_code == 200:
        os_data = response.json()
        print(f"OS created: ID {os_data['id']}")
        return os_data['id']
    else:
        print(f"Failed to create OS: {response.status_code} - {response.text}")
        sys.exit(1)

def main():
    token = login()
    companies = list_companies(token)
    
    if not companies:
        print("No companies found. Please create a company manually or via register endpoint first.")
        # Optional: Call register endpoint here if needed, but for now let's assume one exists or fail.
        sys.exit(1)
        
    company_id = companies[0]['id']
    print(f"Using Company ID: {company_id}")
    
    client_id = create_client(token, company_id)
    create_os(token, company_id, client_id)
    
    print("\nVerification SUCCESS! SuperAdmin can create data for specific companies.")

if __name__ == "__main__":
    main()

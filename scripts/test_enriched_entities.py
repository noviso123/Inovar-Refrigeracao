import requests
import os
from dotenv import load_dotenv

load_dotenv('backend_python/.env')

BASE_URL = "http://localhost:8001/api"
TEST_EMAIL = "jtsatiro@hotmail.com"
TEST_PASSWORD = "password123"

def login():
    resp = requests.post(f"{BASE_URL}/token", data={
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    return None

def test_enriched_entities(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Test Equipment Enrichment
    print("\n--- Testing Equipment Enrichment ---")
    resp = requests.get(f"{BASE_URL}/equipamentos", headers=headers)
    if resp.status_code == 200:
        equips = resp.json()
        if equips:
            e = equips[0]
            print(f"Equipment: {e.get('nome')}")
            print(f"Client Name: {e.get('client_name')}")
            print(f"Location Name: {e.get('location_name')}")
            if e.get('client_name') and e.get('location_name'):
                print("✅ Equipment enrichment successful")
            else:
                print("❌ Equipment enrichment missing fields")
        else:
            print("⚠️ No equipment found to test")
    else:
        print(f"❌ Failed to fetch equipment: {resp.status_code}")

    # 2. Test User Response Mapping
    print("\n--- Testing User Response Mapping ---")
    resp = requests.get(f"{BASE_URL}/usuarios", headers=headers)
    if resp.status_code == 200:
        users = resp.json()
        if users:
            u = users[0]
            print(f"User: {u.get('nome_completo')}")
            print(f"Role: {u.get('cargo')}")
            if u.get('nome_completo') and u.get('cargo'):
                print("✅ User response mapping successful")
            else:
                print("❌ User response mapping missing fields")
        else:
            print("⚠️ No users found to test")
    else:
        print(f"❌ Failed to fetch users: {resp.status_code}")

    # 3. Test OS List Enrichment
    print("\n--- Testing OS List Enrichment ---")
    resp = requests.get(f"{BASE_URL}/solicitacoes", headers=headers)
    if resp.status_code == 200:
        orders = resp.json()
        if orders:
            o = orders[0]
            print(f"OS: {o.get('titulo')}")
            print(f"Client Name: {o.get('client_name')}")
            print(f"Location Name: {o.get('location_name')}")
            if o.get('client_name') and o.get('location_name'):
                print("✅ OS list enrichment successful")
            else:
                print("❌ OS list enrichment missing fields")
        else:
            print("⚠️ No OS found to test")
    else:
        print(f"❌ Failed to fetch OS: {resp.status_code}")

if __name__ == "__main__":
    token = login()
    if token:
        test_enriched_entities(token)
    else:
        print("❌ Login failed")

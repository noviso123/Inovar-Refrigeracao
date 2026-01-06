import httpx
import json

# URL of the backend
BASE_URL = "http://localhost:8000/api"

# Payload that mimics what the frontend sends
payload_full = {
    "nome": "Plano Teste Update",
    "descricao": "Descricao Update",
    "valorMensal": 99.90,
    "recursos": ["Recurso 1", "Recurso 2"],
    "limiteClientes": 100,
    "limiteServicos": 200,
    "ativo": True
}

payload_partial = {
    "ativo": False
}

payload_with_nulls = {
    "nome": "Plano Nulls",
    "limiteClientes": None,
    "limiteServicos": None
}

# We need a token for super_admin. 
# I'll assume I can get one or I'll try to bypass auth if I can't (but auth is required).
# For this test, I'll try to login first.

def test_put_plan():
    # 1. Login as super_admin
    try:
        login_resp = httpx.post(f"{BASE_URL}/auth/login", json={
            "Email": "admin2@admin.com", 
            "Password": "admin123" 
        })
        
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.status_code} {login_resp.text}")
            return

        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get a plan to update
        plans_resp = httpx.get(f"{BASE_URL}/planos", headers=headers)
        if plans_resp.status_code != 200:
            print(f"List plans failed: {plans_resp.status_code}")
            return
        
        plans = plans_resp.json()
        if not plans:
            print("No plans found")
            return
        
        plan_id = plans[0]["id"]
        print(f"Testing update on plan: {plan_id}")

        # 3. Test Full Update
        print("Testing Full Update...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json=payload_full, headers=headers)
        print(f"Full Update Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")

        # 4. Test Partial Update
        print("Testing Partial Update...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json=payload_partial, headers=headers)
        print(f"Partial Update Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")

        # 5. Test Nulls
        print("Testing Nulls Update...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json=payload_with_nulls, headers=headers)
        print(f"Nulls Update Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")

        # 6. Test Null Valor Mensal
        print("Testing Null Valor Mensal...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json={"valorMensal": None}, headers=headers)
        print(f"Null Valor Mensal Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")

        # 7. Test Extra Fields
        print("Testing Extra Fields...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json={"extra_field": "should be ignored"}, headers=headers)
        print(f"Extra Fields Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")

        # 8. Test String Coercion
        print("Testing String Coercion...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json={
            "valorMensal": "99.99",
            "limiteClientes": "50"
        }, headers=headers)
        print(f"String Coercion Status: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Error: {resp.text}")

        # 9. Test Invalid Type (Recursos as string)
        print("Testing Invalid Type (Recursos as string)...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json={
            "recursos": "not a list"
        }, headers=headers)
        print(f"Invalid Type Status: {resp.status_code}")
        if resp.status_code != 422:
            print(f"Expected 422, got {resp.status_code}")
        else:
            print(f"Got expected 422: {resp.text}")

        # 10. Test Empty String for Int
        print("Testing Empty String for Int...")
        resp = httpx.put(f"{BASE_URL}/planos/{plan_id}", json={
            "limiteClientes": ""
        }, headers=headers)
        print(f"Empty String Status: {resp.status_code}")
        if resp.status_code != 422:
            print(f"Expected 422, got {resp.status_code}")
        else:
            print(f"Got expected 422: {resp.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_put_plan()

import requests
import json

BASE_URL = "http://localhost:8000/api"
EMAIL = "admin2@admin.com"
PASSWORD = "admin123"

def test_superadmin_completion():
    print("--- Testing SuperAdmin Backend Completion ---")
    
    # 1. Login
    print("\n1. Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"Email": EMAIL, "Password": PASSWORD})
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.text}")
        return
    
    token = login_res.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # 2. Test Rich Dashboard Metrics
    print("\n2. Testing Rich Dashboard Metrics...")
    dash_res = requests.get(f"{BASE_URL}/dashboard/super-admin", headers=headers)
    if dash_res.status_code == 200:
        data = dash_res.json()
        print("✅ Dashboard response received")
        print(f"   Overview: {json.dumps(data.get('overview'), indent=2)}")
        print(f"   Usuarios: {json.dumps(data.get('usuarios'), indent=2)}")
        print(f"   Assinaturas: {json.dumps(data.get('assinaturas'), indent=2)}")
        print(f"   Atividade: {len(data.get('atividade', {}).get('solicitacoesRecentes', []))} recent OS found")
        
        # Check for specific fields expected by frontend
        expected_fields = ["mrrFormatted", "empresasAtivas", "empresasPendentes", "empresasBloqueadas"]
        for field in expected_fields:
            if field in data.get("overview", {}):
                print(f"   ✅ Field '{field}' present")
            else:
                print(f"   ❌ Field '{field}' MISSING")
    else:
        print(f"❌ Dashboard failed: {dash_res.text}")
        
    # 3. Test Company Status
    print("\n3. Testing Company Status...")
    comp_res = requests.get(f"{BASE_URL}/empresas", headers=headers)
    if comp_res.status_code == 200:
        companies = comp_res.json()
        if companies:
            company = companies[0]
            print(f"   ✅ Companies listed. First company: {company.get('name')} (Status: {company.get('status')})")
            
            # Test updating status
            company_id = company.get("id")
            print(f"   Updating status for company {company_id} to 'bloqueada'...")
            update_res = requests.put(f"{BASE_URL}/empresas/{company_id}", headers=headers, json={"status": "bloqueada"})
            if update_res.status_code == 200:
                print("   ✅ Status update successful")
                # Verify update
                verify_res = requests.get(f"{BASE_URL}/empresas", headers=headers)
                updated_company = next((c for c in verify_res.json() if c["id"] == company_id), None)
                if updated_company and updated_company.get("status") == "bloqueada":
                    print("   ✅ Status change verified in listing")
                else:
                    print(f"   ❌ Status change NOT verified: {updated_company.get('status') if updated_company else 'Not found'}")
                
                # Revert status
                requests.put(f"{BASE_URL}/empresas/{company_id}", headers=headers, json={"status": "ativa"})
            else:
                print(f"   ❌ Status update failed: {update_res.text}")
        else:
            print("   ⚠️ No companies found to test status")
    else:
        print(f"❌ Companies listing failed: {comp_res.text}")
        
    # 4. Test Pending Providers Mapping
    print("\n4. Testing Pending Providers Mapping...")
    pend_res = requests.get(f"{BASE_URL}/assinaturas/prestadores-pendentes", headers=headers)
    if pend_res.status_code == 200:
        providers = pend_res.json()
        print(f"   ✅ Pending providers list received ({len(providers)} found)")
        if providers:
            provider = providers[0]
            expected_fields = ["nome_completo", "email", "telefone", "criado_em"]
            for field in expected_fields:
                if field in provider:
                    print(f"   ✅ Field '{field}' present")
                else:
                    print(f"   ❌ Field '{field}' MISSING")
    else:
        print(f"❌ Pending providers failed: {pend_res.text}")

if __name__ == "__main__":
    test_superadmin_completion()

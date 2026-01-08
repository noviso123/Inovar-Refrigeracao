import requests
import json
import sys

# Set encoding to utf-8 for windows terminal
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_client_flow():
    base_url = "http://localhost:8001/api"
    
    # 1. Test Create Client
    new_client = {
        "nome": "Cliente Teste Flow",
        "email": "teste_flow@exemplo.com",
        "telefone": "(11) 99999-9999",
        "cep": "01001-000",
        "logradouro": "Praça da Sé",
        "numero": "100",
        "complemento": "Apto 1",
        "bairro": "Sé",
        "cidade": "São Paulo",
        "estado": "SP",
        "periodo_manutencao": 3
    }
    
    print("--- Testing Client Creation ---")
    try:
        res = requests.post(f"{base_url}/clientes", json=new_client)
        if res.status_code == 200:
            created_client = res.json()
            print("✅ Client created successfully")
            print(json.dumps(created_client, indent=2))
            client_id = created_client["id"]
            
            # 2. Test Update Client
            update_data = {
                "nome": "Cliente Teste Flow Atualizado",
                "numero": "200",
                "complemento": "Apto 2"
            }
            print("\n--- Testing Client Update ---")
            res_up = requests.put(f"{base_url}/clientes/{client_id}", json=update_data)
            if res_up.status_code == 200:
                updated_client = res_up.json()
                print("✅ Client updated successfully")
                print(json.dumps(updated_client, indent=2))
                
                # Verify address fields in response
                if updated_client.get("numero") == "200" and updated_client.get("complemento") == "Apto 2":
                    print("✅ Address fields correctly updated and returned")
                else:
                    print("❌ Address fields NOT correctly updated or returned")
            else:
                print(f"❌ Failed to update client: {res_up.status_code}")
                print(res_up.text)
                
            # Cleanup
            requests.delete(f"{base_url}/clientes/{client_id}")
            print("\n✅ Test client deleted")
            
        else:
            print(f"❌ Failed to create client: {res.status_code}")
            print(res.text)
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_client_flow()

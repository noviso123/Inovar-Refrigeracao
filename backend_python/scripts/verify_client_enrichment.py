import requests
import json
import sys

# Set encoding to utf-8 for windows terminal
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_client_api():
    base_url = "http://localhost:8001/api"
    
    try:
        res = requests.get(f"{base_url}/clientes")
        if res.status_code == 200:
            clients = res.json()
            if clients:
                print("Successfully fetched clients")
                # Find a client that has locations if possible
                client_to_verify = None
                for c in clients:
                    if c.get("locations"):
                        client_to_verify = c
                        break
                
                if not client_to_verify:
                    client_to_verify = clients[0]
                
                print(json.dumps(client_to_verify, indent=2))
                
                # Check for new fields
                fields = ["periodo_manutencao", "cep", "logradouro", "numero", "bairro", "cidade", "estado"]
                for f in fields:
                    if f in client_to_verify:
                        print(f"Field '{f}' present: {client_to_verify[f]}")
                    else:
                        print(f"Field '{f}' MISSING")
            else:
                print("No clients found to verify")
        else:
            print(f"Failed to fetch clients: {res.status_code}")
            print(res.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_client_api()

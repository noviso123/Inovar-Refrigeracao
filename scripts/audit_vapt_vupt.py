import requests
import json

token = "sbp_b7babfcc5092c1cdbbb857b22daf2f510395ed8f"
project_ref = "ffkaiyyrxtpsxvtienec" # Venda Vapt Vupt
url = f"https://{project_ref}.supabase.co"

# We need the service key for THIS project.
# Since we don't have it explicitly, we can try to get it via API using the PAT.
def get_service_key():
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"https://api.supabase.com/v1/projects/{project_ref}/api-keys", headers=headers, verify=False)
    if resp.status_code == 200:
        keys = resp.json()
        for k in keys:
            if k['name'] == 'service_role':
                return k['api_key']
    return None

def list_storage(service_key):
    headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}
    resp = requests.get(f"{url}/storage/v1/bucket", headers=headers, verify=False)
    if resp.status_code == 200:
        buckets = resp.json()
        print(f"Buckets in Vapt Vupt: {[b['name'] for b in buckets]}")
        for b in buckets:
            b_name = b['name']
            obj_resp = requests.post(f"{url}/storage/v1/object/list/{b_name}", headers=headers, json={"prefix": "", "limit": 20}, verify=False)
            if obj_resp.status_code == 200:
                print(f"Files in {b_name}: {[f['name'] for f in obj_resp.json() if 'name' in f]}")

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    sk = get_service_key()
    if sk:
        list_storage(sk)
    else:
        print("Could not get service key for Vapt Vupt")

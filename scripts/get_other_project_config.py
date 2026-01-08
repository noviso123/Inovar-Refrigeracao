import requests
import json

token = "sbp_b7babfcc5092c1cdbbb857b22daf2f510395ed8f"
project_ref = "ffkaiyyrxtpsxvtienec"
headers = {"Authorization": f"Bearer {token}"}

def get_other_config():
    # 1. API Keys
    resp = requests.get(f"https://api.supabase.com/v1/projects/{project_ref}/api-keys", headers=headers, verify=False)
    if resp.status_code == 200:
        print("API Keys for Vapt Vupt:")
        print(json.dumps(resp.json(), indent=2))

    # 2. Database config
    # Note: password is NOT returned by this API
    resp = requests.get(f"https://api.supabase.com/v1/projects/{project_ref}/config/database", headers=headers, verify=False)
    if resp.status_code == 200:
        print("\nDatabase config for Vapt Vupt:")
        print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    get_other_config()

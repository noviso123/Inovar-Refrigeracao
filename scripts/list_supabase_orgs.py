import requests

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def list_orgs():
    response = requests.get("https://api.supabase.com/v1/organizations", headers=headers, verify=False)
    if response.status_code == 200:
        print(response.json())
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    list_orgs()

import requests
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
project_ref = "apntpretjodygczbeozk"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def test_sql_api():
    # Attempt to use a common but undocumented/internal endpoint if it exists
    url = f"https://api.supabase.com/v1/projects/{project_ref}/sql"
    payload = {
        "query": "SELECT 1"
    }

    print(f"Testing POST to {url}...")
    response = requests.post(url, headers=headers, json=payload, verify=False)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_sql_api()

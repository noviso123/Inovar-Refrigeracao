import requests
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
project_ref = "apntpretjodygczbeozk"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def get_db_info():
    # Attempt to get project details which should include DB host
    response = requests.get(
        f"https://api.supabase.com/v1/projects/{project_ref}",
        headers=headers,
        verify=False
    )

    if response.status_code == 200:
        details = response.json()
        print("Project Details:")
        print(json.dumps(details, indent=2))
    else:
        print(f"Error details: {response.status_code} - {response.text}")

if __name__ == "__main__":
    get_db_info()

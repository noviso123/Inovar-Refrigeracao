import requests
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
project_ref = "apntpretjodygczbeozk"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def get_project_config():
    # 1. Get API Keys
    response = requests.get(
        f"https://api.supabase.com/v1/projects/{project_ref}/api-keys",
        headers=headers,
        verify=False
    )

    if response.status_code == 200:
        keys = response.json()
        print("API Keys retrieved!")
        print(json.dumps(keys, indent=2))

        # 2. Project details for URL
        resp_details = requests.get(
            f"https://api.supabase.com/v1/projects/{project_ref}",
            headers=headers,
            verify=False
        )
        if resp_details.status_code == 200:
             details = resp_details.json()
             print("Project details retrieved!")
             print(json.dumps(details, indent=2))
        else:
            print(f"Error details: {resp_details.status_code} - {resp_details.text}")

    else:
        print(f"Error keys: {response.status_code} - {response.text}")

if __name__ == "__main__":
    get_project_config()

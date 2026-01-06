import requests
import time
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
org_id = "urdnxcungossickixabo"
db_pass = "InovarRefrig2024SecurePass!" # In a real scenario, this should be more dynamic
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def create_project():
    payload = {
        "name": "Inovar-Refrigeracao-Monolith",
        "organization_id": org_id,
        "db_pass": db_pass,
        "region": "sa-east-1",
        "plan": "free"
    }

    response = requests.post(
        "https://api.supabase.com/v1/projects",
        headers=headers,
        json=payload,
        verify=False
    )

    if response.status_code == 201:
        project = response.json()
        print(f"Project Created Successfully!")
        print(json.dumps(project, indent=2))
        return project
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

if __name__ == "__main__":
    create_project()

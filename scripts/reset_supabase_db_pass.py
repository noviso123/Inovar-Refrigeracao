import requests
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
project_ref = "apntpretjodygczbeozk"
new_password = "InovarRefrig2024SecurePass!" # Keeping it the same but forcing a reload
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def reset_password():
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/password"
    payload = {
        "database_password": new_password
    }

    print(f"Propagating new password for project {project_ref}...")
    response = requests.put(url, headers=headers, json=payload, verify=False)

    if response.status_code in [200, 201]:
        print("✅ Password reset/propagation initiated successfully!")
        return True
    else:
        print(f"❌ Error resetting password: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    reset_password()

import requests
import os
import json

API_KEY = "rnd_PT6v0w3w9h2R3OBgtVrcitCyEtEL"
REPO_URL = "https://github.com/noviso123/Inovar-Refrigeracao.git" # Added .git
SERVICE_NAME = "inovar-refrigeracao-monolith"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def get_owner_id():
    try:
        response = requests.get("https://api.render.com/v1/owners", headers=headers, verify=False)
        print(f"DEBUG Owners Response: {response.text}")
        if response.status_code == 200:
            owners_list = response.json()
            if owners_list and isinstance(owners_list, list) and len(owners_list) > 0:
                # Structure: [{'owner': {'id': ...}}, ...]
                return owners_list[0]['owner']['id']
    except Exception as e:
        print(f"Failed to fetch owners: {e}")
    return None

def create_service():
    owner_id = get_owner_id()
    if not owner_id:
        print("❌ Could not retrieve Owner ID. Cannot create service.")
        return

    print(f"👤 Using Owner ID: {owner_id}")

    url = "https://api.render.com/v1/services"

    # Corrected Payload Schema for Docker Service
    payload = {
        "ownerId": owner_id, # Root level
        "serviceDetails": {
            "type": "web_service",
            "name": SERVICE_NAME,
            "env": "docker", # Important: Docker Runtime
            "repo": REPO_URL,
            "branch": "main", # Assuming main branch
            "autoDeploy": "yes",
            # "plan": "free", # Rejected by API
            "region": "oregon",
            "envVars": [
                {"key": "PORT", "value": "8000"},
                {"key": "STRUCTURED_LOGS", "value": "true"},
                {"key": "STATIC_DIR", "value": "/app/static"},
                {"key": "PYTHON_ENV", "value": "production"}
            ]
        },
        "type": "web_service"
    }

    print(f"DEBUG Payload: {json.dumps(payload, indent=2)}")
    print(f"🚀 Creating Render Service: {SERVICE_NAME}...")

    try:
        # verify=False to bypass corporate proxy/SSL issues
        response = requests.post(url, json=payload, headers=headers, verify=False)

        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            service_url = data.get("service", {}).get("serviceDetails", {}).get("url")
            deploy_url = data.get("deployUrl")
            print("✅ Service Created Successfully!")
            print(f"🌐 App URL: {service_url}")
            print(f"🛠️  Dashboard: https://dashboard.render.com")
        else:
            print(f"❌ Failed to create service. Status: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    create_service()

import requests
import os

API_KEY = "rnd_PT6v0w3w9h2R3OBgtVrcitCyEtEL"
REPO_URL = "https://github.com/noviso123/Inovar-Refrigeracao" # Default, will be updated if git remote differs
SERVICE_NAME = "inovar-refrigeracao-monolith"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def create_service():
    url = "https://api.render.com/v1/services"

    payload = {
        "serviceDetails": {
            "type": "web_service",
            "name": SERVICE_NAME,
            "env": "docker", # Important: Docker Runtime
            "repo": REPO_URL,
            "branch": "main", # Assuming main branch
            "autoDeploy": "yes",
            "plan": "free", # Start with free
            "region": "oregon", # Standard region
            "envVars": [
                {"key": "PORT", "value": "8000"},
                {"key": "STRUCTURED_LOGS", "value": "true"},
                {"key": "STATIC_DIR", "value": "/app/static"},
                {"key": "PYTHON_ENV", "value": "production"}
            ]
        },
        "type": "web_service"
    }

    print(f"🚀 Creating Render Service: {SERVICE_NAME}...")
    print(f"🔗 Repo: {REPO_URL}")

    try:
        response = requests.post(url, json=payload, headers=headers)

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

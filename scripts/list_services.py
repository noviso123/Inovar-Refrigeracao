import requests
import os
import json

API_KEY = "rnd_PT6v0w3w9h2R3OBgtVrcitCyEtEL"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

def list_services():
    url = "https://api.render.com/v1/services" # Default query gives list
    try:
        response = requests.get(url, headers=headers, params={"limit": 20}, verify=False)
        if response.status_code == 200:
            services = response.json()
            print("🔍 Found Services:")
            for svc in services:
                # The response is a list of objects like {'service': {...}}
                s = svc.get('service', {})
                print(f"ID: {s.get('id')} | Name: {s.get('name')} | Updated: {s.get('updatedAt')}")
        else:
            print(f"❌ Failed to list services: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    list_services()

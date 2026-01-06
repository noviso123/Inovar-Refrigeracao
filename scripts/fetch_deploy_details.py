import requests
import json
import sys

API_KEY = "rnd_PT6v0w3w9h2R3OBgtVrcitCyEtEL"
SERVICE_ID = "srv-d5ehq3n5r7bs73f3q1bg"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

def get_events():
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/events?limit=20"
    try:
        response = requests.get(url, headers=headers, verify=False)
        if response.status_code == 200:
            events = response.json()
            print("📜 Service Events (RAW):")
            # Print first 2 events strictly to dump structure
            print(json.dumps(events[:2], indent=2))
        else:
            # ...
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    get_events()

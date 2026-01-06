import requests
import time

API_KEY = "rnd_PT6v0w3w9h2R3OBgtVrcitCyEtEL"
SERVICE_ID = "srv-d5ehq3n5r7bs73f3q1bg"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

print("Waiting 90s for build...")
time.sleep(90)

r = requests.get(
    f"https://api.render.com/v1/services/{SERVICE_ID}/deploys?limit=1",
    headers=headers,
    verify=False
)
d = r.json()[0]["deploy"]
print(f"Status: {d['status']} | Commit: {d['commit']['message'][:50]}")

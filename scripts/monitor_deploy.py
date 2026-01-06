import requests
import time
import os
import sys

# Configuration
API_KEY = "rnd_PT6v0w3w9h2R3OBgtVrcitCyEtEL"
SERVICE_ID = sys.argv[1] if len(sys.argv) > 1 else "srv-unknown"
POLL_INTERVAL = 15 # Seconds

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

def check_deploy_status():
    print(f"🕵️ Monitoring Service: {SERVICE_ID}")

    last_status = None

    while True:
        try:
            # Get latest deploy
            url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys?limit=1"
            response = requests.get(url, headers=headers, verify=False)

            if response.status_code == 200:
                data_list = response.json()
                if data_list and isinstance(data_list, list):
                    # Render API returns [{'deploy': {...}}] OR just [{...}] depending on endpoint
                    # Let's handle both or print debug
                    latest_obj = data_list[0]

                    # Try direct access or nested 'deploy'
                    deploy_data = latest_obj.get('deploy', latest_obj)

                    status = deploy_data.get('status', 'unknown')
                    commit = deploy_data.get('commit', {}).get('message', 'unknown')

                    if status != last_status:
                        print(f"🔄 Deploy Status: {status.upper()} | Commit: {commit}")
                        last_status = status

                    if status == "live":
                        print("✅ Deployment SUCCESSFUL!")
                        return True
                    elif status in ["build_failed", "pre_deploy_failed", "update_failed", "deactivated", "canceled"]:
                        print(f"❌ Deployment FAILED: {status}")
                        return False
                else:
                     print(f"⚠️ Unexpected response format: {data_list}")
            else:
                print(f"⚠️ API Error: {response.text}")

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("\n🛑 Stopped monitoring.")
            break
        except Exception as e:
            print(f"⚠️ Monitoring Error: {e}")
            time.sleep(POLL_INTERVAL)

def trigger_deploy():
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys"
    try:
        print(f"🚀 Triggering new deploy for {SERVICE_ID}...")
        response = requests.post(url, headers=headers, verify=False)
        if response.status_code == 201:
            print("✅ Deploy triggered successfully!")
        else:
            print(f"❌ Failed to trigger deploy: {response.text}")
    except Exception as e:
        print(f"❌ Error triggering deploy: {e}")

if __name__ == "__main__":
    trigger_deploy()
    check_deploy_status()

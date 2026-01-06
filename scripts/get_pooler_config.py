import requests
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
project_ref = "apntpretjodygczbeozk"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def get_pooler_config():
    # Attempt to get supavisor config
    url = f"https://api.supabase.com/v1/projects/{project_ref}/config/database/supavisor"
    response = requests.get(url, headers=headers, verify=False)

    if response.status_code == 200:
        print("Supavisor Config:")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error supavisor: {response.status_code} - {response.text}")

    # Also check pgbouncer just in case it's an older layout
    url_pg = f"https://api.supabase.com/v1/projects/{project_ref}/config/database/pgbouncer"
    response_pg = requests.get(url_pg, headers=headers, verify=False)
    if response_pg.status_code == 200:
        print("PgBouncer Config:")
        print(json.dumps(response_pg.json(), indent=2))

if __name__ == "__main__":
    get_pooler_config()

import requests
import json

token = "sbp_b7babfcc5092c1cdbbb857b22daf2f510395ed8f"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def list_projects():
    # List all projects
    resp = requests.get("https://api.supabase.com/v1/projects", headers=headers, verify=False)
    if resp.status_code == 200:
        projects = resp.json()
        print("Projects found in account:")
        print(json.dumps(projects, indent=2))

        # Also list organizations
        resp_orgs = requests.get("https://api.supabase.com/v1/organizations", headers=headers, verify=False)
        if resp_orgs.status_code == 200:
            print("\nOrganizations found:")
            print(json.dumps(resp_orgs.json(), indent=2))
    else:
        print(f"Error listing projects: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    list_projects()

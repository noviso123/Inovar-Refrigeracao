import requests
import json

token = "sbp_a0b148ad047f0f58f63b71e8aaa5083824ae0963"
project_ref = "apntpretjodygczbeozk"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def create_bucket():
    bucket_id = "arquivos-sistema"
    payload = {
        "id": bucket_id,
        "name": bucket_id,
        "public": True
    }

# Supabase Storage API direct endpoint
    url = f"https://{project_ref}.supabase.co/storage/v1/bucket"

    # Needs Service Role key for bucket management
    service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY5MjMwNCwiZXhwIjoyMDgzMjY4MzA0fQ.XpjvDK7-FUy4Rw5mmWs781vGvylKg83Nsj69v_KS4uw"

    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, headers=headers, json=payload, verify=False)

    if response.status_code in [200, 201]:
        print(f"✅ Bucket '{bucket_id}' created successfully!")
    elif response.status_code == 409:
        print(f"ℹ️ Bucket '{bucket_id}' already exists.")
    else:
        print(f"❌ Error creating bucket: {response.status_code} - {response.text}")

if __name__ == "__main__":
    create_bucket()

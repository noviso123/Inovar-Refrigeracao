import os
import asyncio
from dotenv import load_dotenv
import httpx

# SUPABASE_URL = "https://apntpretjodygczbeozk.supabase.co"
# SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY5MjMwNCwiZXhwIjoyMDgzMjY4MzA0fQ.XpjvDK7-FUy4Rw5mmWs781vGvylKg83Nsj69v_KS4uw"

async def list_all():
    url = "https://apntpretjodygczbeozk.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY5MjMwNCwiZXhwIjoyMDgzMjY4MzA0fQ.XpjvDK7-FUy4Rw5mmWs781vGvylKg83Nsj69v_KS4uw"
    headers = {"Authorization": f"Bearer {key}", "apikey": key}

    async with httpx.AsyncClient(verify=False) as client:
        # List buckets
        resp = await client.get(f"{url}/storage/v1/bucket", headers=headers)
        if resp.status_code == 200:
            buckets = resp.json()
            print(f"Buckets found: {[b['name'] for b in buckets]}")
            for b in buckets:
                b_name = b['name']
                obj_resp = await client.post(f"{url}/storage/v1/object/list/{b_name}", headers=headers, json={"prefix": "", "limit": 100})
                if obj_resp.status_code == 200:
                    files = obj_resp.json()
                    print(f"Files in bucket '{b_name}': {[f['name'] for f in files if 'name' in f]}")
        else:
            print(f"Failed to list buckets: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    asyncio.run(list_all())

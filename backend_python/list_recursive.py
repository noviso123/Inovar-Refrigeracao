import os
import asyncio
from dotenv import load_dotenv
import httpx

async def list_recursive(url, key, bucket, prefix=""):
    headers = {"Authorization": f"Bearer {key}", "apikey": key}
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.post(f"{url}/storage/v1/object/list/{bucket}", headers=headers, json={"prefix": prefix, "limit": 100})
        if resp.status_code == 200:
            items = resp.json()
            for item in items:
                if 'id' not in item: # It's a folder
                    print(f"Folder: {prefix}{item['name']}/")
                    await list_recursive(url, key, bucket, prefix + item['name'] + "/")
                else:
                    print(f"File: {prefix}{item['name']}")
        else:
            print(f"Error listing {bucket}/{prefix}: {resp.status_code}")

async def main():
    url = "https://apntpretjodygczbeozk.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnRwcmV0am9keWdjemJlb3prIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY5MjMwNCwiZXhwIjoyMDgzMjY4MzA0fQ.XpjvDK7-FUy4Rw5mmWs781vGvylKg83Nsj69v_KS4uw"
    buckets = ['arquivos-sistema', 'avatars', 'signatures', 'os-photos']
    for b in buckets:
        print(f"\n--- Bucket: {b} ---")
        await list_recursive(url, key, b)

if __name__ == "__main__":
    asyncio.run(main())

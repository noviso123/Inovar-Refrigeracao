import os
import asyncio
from dotenv import load_dotenv
import httpx

load_dotenv()

async def list_files():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    headers = {"Authorization": f"Bearer {key}", "apikey": key}

    buckets = ["avatars", "signatures", "os-photos", "assets", "public", "branding"]

    async with httpx.AsyncClient(verify=False) as client:
        for b in buckets:
            print(f"\nChecking bucket: {b}")
            # Try to list
            obj_resp = await client.post(f"{url}/storage/v1/object/list/{b}", headers=headers, json={"prefix": "", "limit": 20})
            if obj_resp.status_code == 200:
                files = obj_resp.json()
                print(f"Files: {[f['name'] for f in files if 'name' in f]}")
            else:
                print(f"Failed to list {b}: {obj_resp.status_code}")

if __name__ == "__main__":
    asyncio.run(list_files())

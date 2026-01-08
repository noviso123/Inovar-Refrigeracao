import os
import asyncio
import warnings
from dotenv import load_dotenv
from supabase import create_client
from sqlalchemy import create_engine, text
import httpx

# Disable SSL warnings
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

load_dotenv()

async def audit():
    print("--- SUPABASE STORAGE AUDIT ---")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

    if not url or not key:
        print("Missing Supabase credentials in .env")
        return

    # Custom httpx client without verify
    try:
        # Note: supabase-py doesn't easily expose the underlying httpx client for SSL bypass
        # We can try using httpx directly for the audit list
        headers = {"Authorization": f"Bearer {key}", "apikey": key}
        async with httpx.AsyncClient(verify=False) as client:
            # List buckets
            resp = await client.get(f"{url}/storage/v1/bucket", headers=headers)
            if resp.status_code == 200:
                buckets = resp.json()
                print(f"Buckets found: {[b['name'] for b in buckets]}")
                for b in buckets:
                    b_name = b['name']
                    # List objects (POST to list objects in v1)
                    obj_resp = await client.post(f"{url}/storage/v1/object/list/{b_name}", headers=headers, json={"prefix": "", "limit": 100})
                    if obj_resp.status_code == 200:
                        files = obj_resp.json()
                        print(f"Files in bucket '{b_name}': {[f['name'] for f in files if 'name' in f]}")
            else:
                print(f"Failed to list buckets: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Supabase Direct HTTP error: {e}")

    print("\n--- DATABASE SETTINGS AUDIT ---")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL missing")
        return

    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            # Check SystemSettings
            try:
                res = conn.execute(text("SELECT * FROM system_settings")).fetchall()
                print(f"System Settings in DB: {res}")
            except: print("system_settings table error")

            # Check Users
            try:
                users = conn.execute(text("SELECT email, full_name, role FROM users")).fetchall()
                print(f"Users in DB: {users}")
            except: print("users table error")

    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(audit())

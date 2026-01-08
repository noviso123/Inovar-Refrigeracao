import os
import sys
import asyncio
import httpx
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend directory to path to import modules if needed
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend_python'))

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'backend_python', '.env')
load_dotenv(dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

def print_status(step, success, message=""):
    icon = "✅" if success else "❌"
    print(f"{icon} {step}: {message}")

def check_env_vars():
    print("--- Checking Environment Variables ---")
    missing = []
    if not SUPABASE_URL: missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY: missing.append("SUPABASE_SERVICE_KEY")
    if not DATABASE_URL: missing.append("DATABASE_URL")
    
    if missing:
        print_status("Environment Variables", False, f"Missing: {', '.join(missing)}")
        return False
    
    print_status("Environment Variables", True, "All required variables present")
    return True

def check_database():
    print("\n--- Checking Database Connection ---")
    if not DATABASE_URL:
        print_status("Database Config", False, "DATABASE_URL not set")
        return False

    try:
        # Fix postgres:// if needed
        db_url = DATABASE_URL.replace("postgres://", "postgresql://") if DATABASE_URL.startswith("postgres://") else DATABASE_URL
        
        # Try default URL
        try:
            engine = create_engine(db_url, connect_args={"connect_timeout": 10})
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                if result.scalar() == 1:
                    print_status("Database Connection", True, "Successfully connected with configured URL")
                    return True
        except Exception:
            pass

        # Try with PAT as password
        print("   Retrying with PAT as password...")
        pat = "sbp_b7babfcc5092c1cdbbb857b22daf2f510395ed8f"
        # Construct URL with PAT: postgresql://postgres:[PAT]@db.apntpretjodygczbeozk.supabase.co:5432/postgres
        # Assuming standard Supabase host format
        if "@" in db_url:
            prefix = db_url.split("@")[0]
            suffix = db_url.split("@")[1]
            # Replace password in prefix
            if ":" in prefix:
                user = prefix.split(":")[1].split("//")[1]
                new_url = f"postgresql://{user}:{pat}@{suffix}"
                
                engine = create_engine(new_url, connect_args={"connect_timeout": 10})
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    if result.scalar() == 1:
                        print_status("Database Connection", True, "Successfully connected using PAT")
                        # Print the working URL (masked) for debugging
                        print(f"   Working URL: postgresql://{user}:***@{suffix}")
                        return True

        print_status("Database Connection", False, "Connection failed with both configured URL and PAT")
        return False
    except Exception as e:
        print_status("Database Connection", False, f"Connection failed: {str(e)}")
        return False

async def check_storage():
    print("\n--- Checking Storage Access ---")
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print_status("Storage Config", False, "Missing URL or Key")
        return False

    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY
    }
    
    async with httpx.AsyncClient() as client:
        # 1. List Buckets
        try:
            response = await client.get(f"{SUPABASE_URL}/storage/v1/bucket", headers=headers)
            if response.status_code == 200:
                buckets = response.json()
                bucket_names = [b['name'] for b in buckets]
                print_status("List Buckets", True, f"Found: {', '.join(bucket_names)}")
                
                # Check required buckets
                required = ["os-photos", "avatars", "signatures"]
                missing = [r for r in required if r not in bucket_names]
                if missing:
                    print_status("Required Buckets", False, f"Missing: {', '.join(missing)}")
                    # Try to create them?
                else:
                    print_status("Required Buckets", True, "All required buckets exist")
            else:
                print_status("List Buckets", False, f"Failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print_status("Storage API", False, f"Exception: {str(e)}")
            return False

        # 2. Test Upload
        test_bucket = "os-photos"
        test_filename = "test_verification.txt"
        test_content = b"Supabase verification test file"
        
        try:
            upload_url = f"{SUPABASE_URL}/storage/v1/object/{test_bucket}/{test_filename}"
            resp = await client.post(
                upload_url, 
                content=test_content, 
                headers={"Content-Type": "text/plain", **headers}
            )
            
            if resp.status_code in [200, 201]:
                print_status("File Upload", True, f"Uploaded {test_filename}")
                
                # 3. Test Delete
                delete_url = f"{SUPABASE_URL}/storage/v1/object/{test_bucket}/{test_filename}"
                del_resp = await client.delete(delete_url, headers=headers)
                if del_resp.status_code in [200, 204]:
                    print_status("File Delete", True, "Deleted test file")
                else:
                    print_status("File Delete", False, f"Failed to delete: {del_resp.status_code}")
            else:
                print_status("File Upload", False, f"Failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            print_status("Upload/Delete Test", False, f"Exception: {str(e)}")

async def main():
    print("=== Supabase Verification Script ===\n")
    env_ok = check_env_vars()
    if env_ok:
        db_ok = check_database()
        await check_storage()

if __name__ == "__main__":
    asyncio.run(main())

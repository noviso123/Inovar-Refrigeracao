"""
Setup Supabase Storage Buckets
Creates the required storage buckets in the Supabase project.
"""
import requests
import json

# Supabase Configuration
TOKEN = "sbp_b7babfcc5092c1cdbbb857b22daf2f510395ed8f"
PROJECT_REF = "apntpretjodygczbeozk"
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"

# Get service role key from supabase_config.json
with open("../backend_python/supabase_config.json", "r") as f:
    config = json.load(f)
    SERVICE_KEY = config.get("service_role_key")

HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "apikey": SERVICE_KEY,
    "Content-Type": "application/json"
}

# Buckets to create
BUCKETS = [
    {"id": "avatars", "name": "avatars", "public": True},
    {"id": "signatures", "name": "signatures", "public": True},
    {"id": "os-photos", "name": "os-photos", "public": True},
]


def list_buckets():
    """List all existing buckets."""
    response = requests.get(
        f"{SUPABASE_URL}/storage/v1/bucket",
        headers=HEADERS,
        verify=False
    )
    if response.status_code == 200:
        return response.json()
    print(f"Error listing buckets: {response.status_code} - {response.text}")
    return []


def create_bucket(bucket_config):
    """Create a storage bucket."""
    response = requests.post(
        f"{SUPABASE_URL}/storage/v1/bucket",
        headers=HEADERS,
        json=bucket_config,
        verify=False
    )
    if response.status_code in [200, 201]:
        print(f"✅ Created bucket: {bucket_config['id']}")
        return True
    elif response.status_code == 400 and "already exists" in response.text.lower():
        print(f"ℹ️ Bucket already exists: {bucket_config['id']}")
        return True
    else:
        print(f"❌ Failed to create bucket {bucket_config['id']}: {response.status_code} - {response.text}")
        return False


def update_bucket_public(bucket_id, public=True):
    """Update bucket to be public."""
    response = requests.put(
        f"{SUPABASE_URL}/storage/v1/bucket/{bucket_id}",
        headers=HEADERS,
        json={"public": public},
        verify=False
    )
    if response.status_code in [200, 201]:
        print(f"✅ Updated bucket {bucket_id} to public={public}")
        return True
    print(f"⚠️ Could not update bucket {bucket_id}: {response.status_code} - {response.text}")
    return False


def main():
    print("=" * 50)
    print("Supabase Storage Setup")
    print("=" * 50)
    print(f"Project: {PROJECT_REF}")
    print(f"URL: {SUPABASE_URL}")
    print()
    
    # List existing buckets
    print("📋 Checking existing buckets...")
    existing = list_buckets()
    existing_ids = [b["id"] for b in existing] if existing else []
    print(f"   Found: {existing_ids if existing_ids else 'none'}")
    print()
    
    # Create missing buckets
    print("📦 Creating required buckets...")
    for bucket in BUCKETS:
        if bucket["id"] in existing_ids:
            print(f"ℹ️ Bucket already exists: {bucket['id']}")
            # Ensure it's public
            update_bucket_public(bucket["id"], bucket["public"])
        else:
            create_bucket(bucket)
    
    print()
    print("=" * 50)
    print("✅ Storage setup complete!")
    print("=" * 50)
    print()
    print("Buckets available:")
    for bucket in BUCKETS:
        print(f"  - {SUPABASE_URL}/storage/v1/object/public/{bucket['id']}/")


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    main()

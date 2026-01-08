"""
Supabase Storage Module for Inovar Refrigeração
Handles file uploads to Supabase Storage buckets.
"""
import os
import httpx
from typing import Optional
import uuid
from datetime import datetime

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://apntpretjodygczbeozk.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Available buckets
BUCKETS = {
    "avatars": "avatars",
    "signatures": "signatures", 
    "os-photos": "os-photos"
}


def get_headers() -> dict:
    """Get headers for Supabase Storage API requests."""
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }


async def upload_file(
    file_content: bytes,
    filename: str,
    content_type: str,
    bucket: str = "os-photos"
) -> Optional[dict]:
    """
    Upload a file to Supabase Storage.
    
    Args:
        file_content: Binary content of the file
        filename: Original filename
        content_type: MIME type of the file
        bucket: Target bucket name
    
    Returns:
        dict with url and filename, or None if upload fails
    """
    if not SUPABASE_SERVICE_KEY:
        return None
    
    # Generate unique filename to avoid collisions
    ext = filename.split(".")[-1] if "." in filename else "jpg"
    unique_name = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Storage API URL
    storage_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{unique_name}"
    
    headers = get_headers()
    headers["Content-Type"] = content_type
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                storage_url,
                content=file_content,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                # Get public URL
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{unique_name}"
                return {
                    "url": public_url,
                    "filename": unique_name,
                    "bucket": bucket,
                    "provider": "supabase"
                }
            else:
                print(f"Supabase Storage upload failed: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print(f"Supabase Storage error: {e}")
        return None


async def delete_file(bucket: str, filename: str) -> bool:
    """
    Delete a file from Supabase Storage.
    
    Args:
        bucket: Bucket name
        filename: File path in the bucket
    
    Returns:
        True if deleted successfully, False otherwise
    """
    if not SUPABASE_SERVICE_KEY:
        return False
    
    storage_url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{filename}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.delete(storage_url, headers=get_headers())
            return response.status_code in [200, 204]
    except Exception as e:
        print(f"Supabase Storage delete error: {e}")
        return False


def get_public_url(bucket: str, filename: str) -> str:
    """Get the public URL for a file in Supabase Storage."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"


async def create_bucket_if_not_exists(bucket_name: str, public: bool = True) -> bool:
    """
    Create a storage bucket if it doesn't exist.
    
    Args:
        bucket_name: Name of the bucket to create
        public: Whether the bucket should be public
    
    Returns:
        True if bucket exists or was created, False otherwise
    """
    if not SUPABASE_SERVICE_KEY:
        return False
    
    bucket_url = f"{SUPABASE_URL}/storage/v1/bucket/{bucket_name}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check if bucket exists
            response = await client.get(bucket_url, headers=get_headers())
            
            if response.status_code == 200:
                return True  # Bucket exists
            
            # Create bucket
            create_url = f"{SUPABASE_URL}/storage/v1/bucket"
            response = await client.post(
                create_url,
                headers=get_headers(),
                json={
                    "id": bucket_name,
                    "name": bucket_name,
                    "public": public
                }
            )
            
            return response.status_code in [200, 201]
            
    except Exception as e:
        print(f"Bucket creation error: {e}")
        return False


async def init_storage_buckets():
    """Initialize all required storage buckets."""
    for bucket_name in BUCKETS.values():
        success = await create_bucket_if_not_exists(bucket_name, public=True)
        status = "OK" if success else "FAILED"
        print(f"[{status}] Bucket '{bucket_name}' initialization")

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional
import boto3
import os
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
import logging
from fastapi.responses import StreamingResponse
import io
import httpx
from PIL import Image

logger = logging.getLogger(__name__)

router = APIRouter()

# MinIO Configuration
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://minio:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin123")
S3_BUCKET = "inovar-refrigeracao"

# Remove.bg API Configuration
REMOVEBG_API_KEY = os.getenv("REMOVEBG_API_KEY")

# Initialize S3 Client
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name="us-east-1"
)

# Ensure bucket exists on startup
try:
    s3_client.head_bucket(Bucket=S3_BUCKET)
    logger.info(f"✅ MinIO bucket '{S3_BUCKET}' exists")
except ClientError as e:
    error_code = e.response.get('Error', {}).get('Code', '')
    if error_code in ['404', 'NoSuchBucket']:
        try:
            s3_client.create_bucket(Bucket=S3_BUCKET)
            logger.info(f"✅ Created MinIO bucket: {S3_BUCKET}")
        except Exception as create_err:
            logger.error(f"❌ Failed to create bucket {S3_BUCKET}: {create_err}")
    else:
        logger.warning(f"⚠️ Could not verify bucket {S3_BUCKET}: {e}")
except Exception as e:
    logger.warning(f"⚠️ MinIO connection error: {e}")


async def remove_background_api(image_bytes: bytes) -> bytes:
    """Remove background using Remove.bg API"""
    if not REMOVEBG_API_KEY:
        logger.warning("REMOVEBG_API_KEY not set - background removal unavailable")
        raise Exception("Background removal API not configured")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.remove.bg/v1.0/removebg",
            files={"image_file": ("image.png", image_bytes, "image/png")},
            data={"size": "auto"},
            headers={"X-Api-Key": REMOVEBG_API_KEY}
        )
        
        if response.status_code == 200:
            return response.content
        else:
            logger.error(f"Remove.bg API error: {response.status_code} - {response.text}")
            raise Exception(f"Remove.bg API error: {response.status_code}")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    bucket: Optional[str] = Form("uploads"),
    remove_bg: Optional[bool] = Form(False)
):
    try:
        # Read file content
        content = await file.read()
        content_type = file.content_type or "application/octet-stream"
        filename_base = file.filename or "file"
        
        # Automatic Background Removal ONLY for logos
        if remove_bg or bucket == "logos":
            try:
                # Check if image already has transparency to save credits
                input_image = Image.open(io.BytesIO(content))
                has_transparency = False
                
                if input_image.mode in ('RGBA', 'LA') or (input_image.mode == 'P' and 'transparency' in input_image.info):
                    extrema = input_image.getextrema()
                    # For RGBA, extrema is a list of tuples. Alpha is the 4th tuple (index 3).
                    # We check the minimum alpha value. If < 255, there is transparency.
                    if input_image.mode == 'RGBA':
                        if extrema[3][0] < 255:
                            has_transparency = True
                    elif input_image.mode == 'LA':
                        if extrema[1][0] < 255:
                            has_transparency = True
                    # For P mode it's more complex, but usually handled by convert('RGBA')
                
                if has_transparency:
                    logger.info(f"Image {filename_base} already has transparency. Skipping Remove.bg.")
                else:
                    logger.info(f"Processing background removal for {filename_base} using Remove.bg API")
                    # Reset pointer if needed, but we passed 'content' bytes which is fine
                    content = await remove_background_api(content)
                    
                    # Force PNG extension and content type for transparent images
                    filename_base = os.path.splitext(filename_base)[0] + ".png"
                    content_type = "image/png"
                    logger.info(f"Background removal successful for {filename_base}")
            except Exception as e:
                logger.error(f"Error removing background: {e}")
                # Fallback to original content if removal fails

        # Generate unique filename
        ext = filename_base.split(".")[-1] if "." in filename_base else "bin"
        filename = f"{bucket}/{uuid.uuid4()}.{ext}"
        
        # Upload to MinIO
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=filename,
            Body=content,
            ContentType=content_type,
            ACL='public-read'
        )
        
        # Return URL relative to API
        # public_url = f"https://inovar.share.zrok.io/api/files/{filename}"
        public_url = f"/files/{filename}"
        
        return {"url": public_url}
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/files/{path:path}")
async def get_file(path: str):
    try:
        # Get object from MinIO
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=path)
        
        return StreamingResponse(
            response['Body'].iter_chunks(),
            media_type=response.get('ContentType', 'application/octet-stream'),
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "skip_zrok_interstitial": "true",
                "Cache-Control": "public, max-age=31536000"
            }
        )
    except ClientError as e:
        if e.response['Error']['Code'] == "NoSuchKey":
            raise HTTPException(status_code=404, detail="File not found")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

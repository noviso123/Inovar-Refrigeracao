from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request, Response
from fastapi.exception_handlers import http_exception_handler
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os
import logging
import json
import httpx
import time
from datetime import datetime
import signal
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Signal Handler for Clean Shutdown Logging
def signal_handler(sig, frame):
    sig_name = signal.Signals(sig).name
    logger.info(f"Received signal {sig_name} ({sig}). Shutting down gracefully...")
    sys.exit(0)

# Register signals
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from auth import router as auth_router
from routers.whatsapp import router as whatsapp_router
from solicitacoes import router as solicitacoes_router
from usuarios import router as usuarios_router
from dashboard import router as dashboard_router
from clientes import router as clientes_router
from extra_routes import router as extra_router
from equipamentos import router as equipamentos_router
from whatsapp_engine import brain
from scheduler import start_scheduler
from notifications import router as notifications_router
from routers.manutencao import router as maintenance_router
from routers.qrcode import router as qrcode_router

# Redis Utilities
from redis_utils import (
    REDIS_AVAILABLE,
    check_rate_limit,
    get_redis_stats,
    get_cache,
    set_cache
)

app = FastAPI(
    title="Inovar Refrigeração API",
    description="API do Sistema de Gestão para Inovar Refrigeração",
    version="1.0.1",
    redirect_slashes=False
)

logger.info("Inovar Refrigeração API v1.0.1 starting up...")

# CORS
from fastapi.middleware.cors import CORSMiddleware
default_origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else default_origins
if os.getenv("CORS_ALLOW_ALL") == "true":
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        body_str = body.decode()
    except:
        body_str = "Could not read body"

    logger.error(f"Validation Error on {request.url}: {exc} - Body: {body_str}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body_str}
    )

# Configurações de Ambiente
WHATSAPP_URL = os.getenv("WHATSAPP_URL", "")

# Middleware Global para Corrigir Erros 405 (HEAD e Slashes)
@app.middleware("http")
async def fix_405_and_slashes(request: Request, call_next):
    if request.method == "HEAD":
        request.scope["method"] = "GET"

    path = request.url.path
    if path != "/" and path.endswith("/"):
        new_path = path.rstrip("/")
        request.scope["path"] = new_path
        if "raw_path" in request.scope:
            request.scope["raw_path"] = new_path.encode()

    return await call_next(request)

# Rate Limiter Middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"

    if request.url.path in ["/", "/health", "/api/health", "/favicon.ico"]:
        return await call_next(request)

    allowed, remaining = check_rate_limit(client_ip, max_requests=100, window_seconds=60)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Muitas requisições. Por favor, aguarde um momento."},
            headers={"X-RateLimit-Remaining": "0"}
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response

# Inicialização
@app.on_event("startup")
async def startup_event():
    try:
        print("Starting WhatsApp Brain...")
        await brain.start()
    except Exception as e:
        logger.warning(f"WhatsApp Brain failed to start: {e}")

    start_scheduler()

    try:
        from database import init_db
        init_db()
        logger.info("Tabelas do banco de dados verificadas/criadas.")
    except Exception as e:
        logger.error(f"Erro ao conectar/criar banco: {e}")

    # Initialize Supabase Storage buckets
    try:
        from supabase_storage import init_storage_buckets, SUPABASE_SERVICE_KEY
        if SUPABASE_SERVICE_KEY:
            await init_storage_buckets()
            logger.info("Supabase Storage buckets initialized.")
        else:
            logger.warning("Supabase Storage not configured (no service key).")
            if os.getenv("IMGBB_API_KEY"):
                logger.info("ImgBB configured as fallback storage.")
            else:
                logger.warning("No storage provider configured! Uploads will use Base64.")
    except Exception as e:
        logger.warning(f"Supabase Storage init failed: {e}")

    try:
        from websocket_manager import manager as ws_mgr
        from notification_service import set_ws_manager
        set_ws_manager(ws_mgr)
        logger.info("WebSocket notification broadcasting enabled")
    except Exception as e:
        logger.warning(f"WebSocket manager init failed: {e}")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

# Health Checks
def check_database_health() -> dict:
    start = time.time()
    try:
        from database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency = round((time.time() - start) * 1000, 2)
        return {"status": "healthy", "latency_ms": latency}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

def check_redis_health() -> dict:
    start = time.time()
    try:
        from redis_utils import redis_client, REDIS_AVAILABLE
        if not REDIS_AVAILABLE or redis_client is None:
            return {"status": "disabled", "message": "Redis not configured"}
        redis_client.ping()
        latency = round((time.time() - start) * 1000, 2)
        return {"status": "healthy", "latency_ms": latency}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

def check_storage_health() -> dict:
    start = time.time()
    try:
        import httpx
        from supabase_storage import SUPABASE_URL, SUPABASE_SERVICE_KEY

        # Check Supabase Storage first
        if SUPABASE_SERVICE_KEY:
            response = httpx.get(f"{SUPABASE_URL}/storage/v1/bucket", timeout=5.0, headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "apikey": SUPABASE_SERVICE_KEY
            })
            latency = round((time.time() - start) * 1000, 2)
            if response.status_code == 200:
                return {"status": "healthy", "provider": "Supabase Storage", "latency_ms": latency}

        # Fallback to ImgBB check
        response = httpx.get("https://api.imgbb.com/", timeout=5.0)
        latency = round((time.time() - start) * 1000, 2)
        if response.status_code == 200:
             return {"status": "healthy", "provider": "ImgBB", "latency_ms": latency}
        return {"status": "degraded", "code": response.status_code}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

def check_whatsapp_health() -> dict:
    start = time.time()
    try:
        import httpx
        response = httpx.get(f"{WHATSAPP_URL}/health", timeout=5.0)
        latency = round((time.time() - start) * 1000, 2)
        if response.status_code == 200:
            return {"status": "healthy", "latency_ms": latency}
        return {"status": "degraded", "status_code": response.status_code}
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}

@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check_detailed():
    services = {
        "database": check_database_health(),
        "redis": check_redis_health(),
        "storage": check_storage_health(),
        "whatsapp": check_whatsapp_health()
    }

    statuses = [s.get("status", "unknown") for s in services.values()]
    if all(s == "healthy" or s == "disabled" for s in statuses):
        overall = "healthy"
    elif any(s == "unhealthy" for s in statuses):
        if services["database"]["status"] == "unhealthy":
            overall = "unhealthy"
        else:
            overall = "degraded"
    else:
        overall = "degraded"

    return {
        "status": overall,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.1",
        "services": services,
        "rate_limiting": "enabled" if REDIS_AVAILABLE else "disabled"
    }

@app.get("/api")
async def api_root():
    return {"message": "Inovar Refrigeração API Root", "version": "1.0.1", "status": "running"}

# Upload Endpoint
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), bucket: str = "os-photos"):
    try:
        file_content = await file.read()
        content_type = file.content_type or "application/octet-stream"

        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only images are supported")

        # Try Supabase Storage first
        from supabase_storage import upload_file as supabase_upload, SUPABASE_SERVICE_KEY

        if SUPABASE_SERVICE_KEY:
            result = await supabase_upload(file_content, file.filename, content_type, bucket)
            if result:
                logger.info(f"Image uploaded to Supabase Storage: {result['url']}")
                return result

        # Fallback to ImgBB if configured
        api_key = os.getenv("IMGBB_API_KEY")

        if api_key:
            files = {"image": (file.filename, file_content, content_type)}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.imgbb.com/1/upload",
                    params={"key": api_key},
                    files=files
                )

            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return {
                        "url": data["data"]["url"],
                        "filename": data["data"]["image"]["filename"],
                        "provider": "imgbb"
                    }

            logger.warning(f"ImgBB upload failed, falling back to Base64: {response.text}")

        # Final fallback: Convert to Base64 data URL
        import base64
        base64_data = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{content_type};base64,{base64_data}"

        logger.info(f"Image uploaded as Base64 (size: {len(file_content)} bytes)")

        return {
            "url": data_url,
            "filename": file.filename,
            "provider": "base64"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Include Routers
app.include_router(auth_router, prefix="/api")
app.include_router(whatsapp_router, prefix="/api")
app.include_router(solicitacoes_router, prefix="/api")
app.include_router(usuarios_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(clientes_router, prefix="/api")
app.include_router(extra_router, prefix="/api")
app.include_router(equipamentos_router, prefix="/api")
app.include_router(notifications_router)
app.include_router(maintenance_router)
app.include_router(qrcode_router)

# WebSocket Notifications
from fastapi import WebSocket, WebSocketDisconnect
from websocket_manager import manager as ws_manager

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    try:
        from auth import decode_access_token
        from database import get_db
        from models import User
        from sqlalchemy.orm import Session

        # Note: decode_access_token needs to be handled carefully with Supabase
        # For now, we assume the token is valid if we get here (simplified)
        # In a real app, you'd verify the Supabase JWT.

        # Mock user lookup for now (should use real logic)
        db = next(get_db())
        # This is a placeholder, should use real token decoding
        user = db.query(User).first()

        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

        await ws_manager.connect(websocket, user.id)
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "user_id": user.id
        })

        try:
            while True:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket)

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=4000, reason=str(e))
        except:
            pass

@app.get("/")
async def root():
    return {"status": "ok", "service": "Inovar Refrigeração API", "version": "1.0.1"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host=host, port=port)

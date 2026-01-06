from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError
import os
import logging
import json
import httpx
import time
from datetime import datetime
import signal
import sys

# Signal Handler for Clean Shutdown Logging
def signal_handler(sig, frame):
    sig_name = signal.Signals(sig).name
    logger.info(f"🛑 Received signal {sig_name} ({sig}). Shutting down gracefully...")
    # Perform any cleanup here if needed
    sys.exit(0)

# Register signals
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Configure Structured JSON Logging
try:
    from pythonjsonlogger import jsonlogger

    class CustomJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)
            log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
            log_record['level'] = record.levelname
            log_record['service'] = 'inovar-refrigeracao-api'

    # Only apply JSON format in production (when STRUCTURED_LOGS=true)
    if os.getenv('STRUCTURED_LOGS', 'false').lower() == 'true':
        handler = logging.StreamHandler()
        handler.setFormatter(CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s'))
        logging.root.handlers = [handler]
        logging.root.setLevel(logging.INFO)
    else:
        logging.basicConfig(level=logging.INFO)
except ImportError:
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)
from auth import router as auth_router
from whatsapp import router as whatsapp_router
from solicitacoes import router as solicitacoes_router
from usuarios import router as usuarios_router
from dashboard import router as dashboard_router
from clientes import router as clientes_router
from extra_routes import router as extra_router
from equipamentos import router as equipamentos_router

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

logger.info("🚀 Inovar Refrigeração API v1.0.1 starting up...")

# Prometheus Metrics
try:
    from prometheus_fastapi_instrumentator import Instrumentator

    instrumentator = Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_round_latency_decimals=True,
        excluded_handlers=['/metrics', '/', '/favicon.ico'],
        inprogress_name='http_requests_inprogress',
        inprogress_labels=True,
    )
    instrumentator.instrument(app).expose(app, endpoint='/metrics', include_in_schema=False)
    logger.info("📊 Prometheus metrics enabled at /metrics")
except ImportError:
    logger.warning("⚠️ prometheus-fastapi-instrumentator not installed, metrics disabled")

# CORS
from fastapi.middleware.cors import CORSMiddleware
# Default origins for local development
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

# Rate Limiter Middleware
from fastapi import Request
from fastapi.responses import JSONResponse
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
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "admin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "password123")
BUCKET_NAME = "arquivos-sistema"

WHATSAPP_URL = os.getenv("WHATSAPP_URL", "")

# Cliente S3 (Supabase Storage)
try:
    s3_client = boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY
    )
    logger.info("✅ S3 Client (Supabase) initialized.")
except Exception as e:
    logger.error(f"❌ Failed to init S3 Client: {e}")
    s3_client = None

# Middleware Global para Corrigir Erros 405 (HEAD e Slashes)
@app.middleware("http")
async def fix_405_and_slashes(request: Request, call_next):
    # 1. Tratar requisições HEAD (converte para GET internamente)
    # Isso evita 405 em probes de monitoramento e proxies
    if request.method == "HEAD":
        request.scope["method"] = "GET"

    # 2. Tratar Barras no Final (Trailing Slashes)
    # FastAPI é rígido com /api/rota vs /api/rota/
    # Esta lógica normaliza removendo a barra final se não for a raiz
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
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"

    # Skip rate limit for health checks
    if request.url.path in ["/", "/health", "/api/health", "/favicon.ico"]:
        return await call_next(request)

    # Check rate limit (100 requests per minute per IP)
    allowed, remaining = check_rate_limit(client_ip, max_requests=100, window_seconds=60)

    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
            headers={"X-RateLimit-Remaining": "0"}
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response

# Inicialização: Criar Bucket e Tabelas DB
@app.on_event("startup")
async def startup_event():
    pass

    # Then init DB (creates any missing tables)
    try:
        from database import init_db
        init_db()
        logger.info("Tabelas do banco de dados verificadas/criadas.")
    except Exception as e:
        logger.error(f"Erro ao conectar/criar banco: {e}")

    # Init ImgBB (Nothing specific to init, just log)
    if os.getenv("IMGBB_API_KEY"):
        logger.info("📸 ImgBB configured for storage.")
    else:
        logger.warning("⚠️ ImgBB API Key missing! Uploads will fail.")

    # Initialize WebSocket manager for notifications
    try:
        from websocket_manager import manager as ws_mgr
        from notification_service import set_ws_manager
        set_ws_manager(ws_mgr)
        logger.info("🔌 WebSocket notification broadcasting enabled")
    except Exception as e:
        logger.warning(f"⚠️ WebSocket manager init failed: {e}")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)


# ============= HEALTH CHECK ROBUSTO =============
def check_database_health() -> dict:
    """Check PostgreSQL database connection"""
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

def check_storage_health() -> dict:
    """Check ImgBB and S3 storage connection"""
    start = time.time()
    health_status = {
        "status": "healthy",
        "imgbb": "unknown",
        "s3": "unknown",
        "latency_ms": 0
    }

    # Check ImgBB (via API Key presence basically, as we can't ping without upload)
    if os.getenv("IMGBB_API_KEY"):
        health_status["imgbb"] = "configured"
    else:
        health_status["imgbb"] = "missing_key"
        health_status["status"] = "degraded"

    # Check S3
    try:
        if s3_client:
            s3_client.head_bucket(Bucket=BUCKET_NAME)
            health_status["s3"] = "connected"
        else:
            health_status["s3"] = "client_init_failed"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["s3"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    health_status["latency_ms"] = round((time.time() - start) * 1000, 2)
    return health_status

def check_redis_health() -> dict:
    """Check Redis connection"""
    start = time.time()
    try:
        from redis_utils import redis_client, REDIS_AVAILABLE
        if not REDIS_AVAILABLE or redis_client is None:
            return {"status": "disabled", "message": "Redis not configured"}

        # Try to ping Redis
        redis_client.ping()
        latency = round((time.time() - start) * 1000, 2)
        return {"status": "healthy", "latency_ms": latency}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

def check_storage_health() -> dict:
    """Check ImgBB API connection"""
    start = time.time()
    try:
        # Simple HEAD request to ImgBB home to check connectivity
        import httpx
        # We can't easily check auth without uploading, so we just check reachability
        response = httpx.get("https://api.imgbb.com/", timeout=5.0)
        latency = round((time.time() - start) * 1000, 2)
        if response.status_code == 200:
             return {"status": "healthy", "provider": "ImgBB", "latency_ms": latency}
        return {"status": "degraded", "code": response.status_code}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

def check_whatsapp_health() -> dict:
    """Check WhatsApp engine connection"""
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


@app.api_route("/api", methods=["GET", "HEAD"])
def api_root_info():
    """Basic info for API root"""
    return {
        "status": "ok",
        "brain": "Python FastAPI 🚀",
        "version": "1.0.0"
    }

@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check_detailed():
    """
    Detailed health check endpoint with status of all services.
    Returns:
    - overall: "healthy" | "degraded" | "unhealthy"
    - services: individual service statuses
    - timestamp: current server time
    """
    services = {
        "database": check_database_health(),
        "redis": check_redis_health(),
        "storage": check_storage_health(),
        "whatsapp": check_whatsapp_health()
    }

    # Determine overall status
    statuses = [s.get("status", "unknown") for s in services.values()]

    if all(s == "healthy" or s == "disabled" for s in statuses):
        overall = "healthy"
    elif any(s == "unhealthy" for s in statuses):
        # Only unhealthy if critical services (database) are down
        if services["database"]["status"] == "unhealthy":
            overall = "unhealthy"
        else:
            overall = "degraded"
    else:
        overall = "degraded"

    return {
        "status": overall,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "services": services,
        "rate_limiting": "enabled" if REDIS_AVAILABLE else "disabled"
    }

@app.get("/api")
async def api_root():
    return {"message": "Inovar Refrigeração API Root", "version": "1.0.0", "status": "running"}

# Upload Endpoint
# Upload Endpoint (Hybrid: ImgBB for Images, S3 for others)
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Read content
        file_content = await file.read()
        content_type = file.content_type or "application/octet-stream"

        # 1. IMGBB STRATEGY (Images Only)
        if content_type.startswith("image/"):
            api_key = os.getenv("IMGBB_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="ImgBB API Key not configured")

            # Prepare multipart/form-data for ImgBB
            files = {
                "image": (file.filename, file_content, content_type)
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.imgbb.com/1/upload",
                    params={"key": api_key},
                    files=files
                )

            if response.status_code != 200:
                logger.error(f"ImgBB Error: {response.text}")
                raise HTTPException(status_code=502, detail="Failed to upload to ImgBB")

            data = response.json()
            if not data.get("success"):
                raise HTTPException(status_code=500, detail="ImgBB reported failure")

            # Return directly compatible with frontend
            return {
                "url": data["data"]["url"],
                "filename": data["data"]["image"]["filename"],
                "provider": "imgbb"
            }

        # 2. S3 STRATEGY (Non-Images: PDF, Docs, etc.)
        else:
            if not s3_client:
                raise HTTPException(status_code=500, detail="S3 Storage not available")

            # Generate unique filename
            file_ext = os.path.splitext(file.filename)[1]
            object_name = f"docs/{int(time.time())}_{file.filename}" # Organize in docs folder

            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=object_name,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read' # Ensure public access
            )

            # Construct Public URL
            base_url = S3_ENDPOINT.replace("/storage/v1/s3", "")
            file_url = f"{base_url}/storage/v1/object/public/{BUCKET_NAME}/{object_name}"

            logger.info(f"File uploaded to S3: {file_url}")
            return {
                "url": file_url,
                "filename": object_name,
                "provider": "supabase_s3"
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


# ============= WEBSOCKET NOTIFICATIONS =============
from fastapi import WebSocket, WebSocketDisconnect
from websocket_manager import manager as ws_manager

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for real-time notifications.
    Connect with: ws://host/ws/notifications?token=<jwt_token>
    """
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return

    try:
        # Validate JWT token
        from auth import decode_access_token
        from database import get_db
        from models import User
        from sqlalchemy.orm import Session

        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=4001, reason="Invalid token")
            return

        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token payload")
            return

        # Get user info
        db = next(get_db())
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

        # Connect (Simplified for single-tenant)
        await ws_manager.connect(websocket, user.id)

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "user_id": user.id
        })

        # Keep connection alive and listen for messages
        try:
            while True:
                # Wait for any client message (ping/pong or disconnect)
                data = await websocket.receive_text()

                # Handle ping
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


# ============= SERVING FRONTEND =============
# Mount frontend/dist to serve static files
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to work
        if full_path.startswith("api/") or full_path.startswith("ws/") or full_path == "api":
            raise HTTPException(status_code=404)

        # Check if file exists in frontend/dist
        file_path = os.path.join("frontend/dist", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Otherwise serve index.html (SPA support)
        return FileResponse("frontend/dist/index.html")
else:
    logger.warning("⚠️ frontend/dist directory not found. Frontend will not be served.")


# ============= SERVING FRONTEND =============
# Mount frontend/dist to serve static files
# In Docker, we copy dist to /app/static
STATIC_DIR = os.getenv("STATIC_DIR", "static")

if os.path.exists(STATIC_DIR):
    logger.info(f"📁 Serving static files from {STATIC_DIR}")

    # Serve assets folder
    if os.path.exists(os.path.join(STATIC_DIR, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    # Serve other static resources if needed
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    @app.exception_handler(404)
    async def custom_404_handler(request: Request, exc: HTTPException):
        # Allow API 404s to pass through
        if request.url.path.startswith("/api") or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi.json"):
             return await http_exception_handler(request, exc)

        # Fallback to index.html for frontend routes (SPA)
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.exists(index_path):
             return FileResponse(index_path)
        return await http_exception_handler(request, exc)

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)

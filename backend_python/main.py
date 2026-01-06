from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
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
from assinaturas import router as assinaturas_router
from nfse import router as nfse_router
from equipamentos import router as equipamentos_router
from routers.upload import router as upload_router
from invoices import router as invoices_router

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
origins = [
    os.getenv("FRONTEND_URL", "https://inovar-refrigeracao.vercel.app"),
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
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
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://storage:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "admin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "password123")
BUCKET_NAME = "arquivos-sistema"

WHATSAPP_URL = os.getenv("WHATSAPP_URL", "http://whatsapp_engine:8080")

# Cliente S3 (MinIO)
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY
)

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
    # Run migrations FIRST to ensure schema is up to date
    try:
        from migrate_db import migrate
        migrate()
    except Exception as e:
        logger.error(f"Migration error: {e}")
    
    # Then init DB (creates any missing tables)
    try:
        from database import init_db
        init_db()
        logger.info("Tabelas do banco de dados verificadas/criadas.")
    except Exception as e:
        logger.error(f"Erro ao conectar/criar banco: {e}")

    # Init S3
    try:
        try:
            s3_client.head_bucket(Bucket=BUCKET_NAME)
            logger.info(f"Bucket '{BUCKET_NAME}' já existe.")
        except ClientError:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
            logger.info(f"Bucket '{BUCKET_NAME}' criado com sucesso.")
    except Exception as e:
        logger.error(f"Erro S3: {e}")
    
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
    """Check MinIO/S3 storage connection"""
    start = time.time()
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        latency = round((time.time() - start) * 1000, 2)
        return {"status": "healthy", "latency_ms": latency, "bucket": BUCKET_NAME}
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


@app.api_route("/", methods=["GET", "HEAD"])
def health_check_root():
    """Basic health check for root endpoint"""
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

# Upload router included above
# @app.post("/upload") ... removed ...

# Include Routers
app.include_router(auth_router, prefix="/api")
app.include_router(whatsapp_router, prefix="/api")
app.include_router(solicitacoes_router, prefix="/api")
app.include_router(usuarios_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(clientes_router, prefix="/api")
app.include_router(extra_router, prefix="/api")
app.include_router(assinaturas_router, prefix="/api")
app.include_router(nfse_router, prefix="/api")
app.include_router(equipamentos_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(invoices_router, prefix="/api")


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
        
        company_id = user.company_id or 0
        
        # Connect
        await ws_manager.connect(websocket, user.id, company_id)
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected successfully",
            "user_id": user.id,
            "company_id": company_id
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


@app.get("/api/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics (for monitoring)"""
    return ws_manager.get_stats()


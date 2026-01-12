"""
Redis Utilities - Simplified for Single Tenant
"""
import redis
import json
import os
import hashlib
from functools import wraps
from typing import Any, Optional, Callable
import logging

logger = logging.getLogger(__name__)

# Redis Connection
# Priority: 1. REDIS_URL, 2. KV_URL (Vercel Upstash), 3. Individual parameters
REDIS_URL = os.getenv("REDIS_URL") or os.getenv("KV_URL", "")

redis_client = None
REDIS_AVAILABLE = False

if REDIS_URL:
    # Use REDIS_URL if provided (highest priority)
    try:
        redis_client = redis.from_url(
            REDIS_URL, 
            decode_responses=True, 
            socket_connect_timeout=2
        )
        redis_client.ping()
        REDIS_AVAILABLE = True
        logger.info("✅ Redis connected via REDIS_URL")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed (REDIS_URL): {e}")
        REDIS_AVAILABLE = False
        redis_client = None
else:
    # Fallback to individual parameters
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
    
    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD if REDIS_PASSWORD else None,
            decode_responses=True,
            socket_connect_timeout=2  # Short timeout for Vercel
        )
        redis_client.ping()
        REDIS_AVAILABLE = True
        logger.info(f"✅ Redis connected via parameters ({REDIS_HOST}:{REDIS_PORT})")
    except Exception as e:
        logger.warning(f"⚠️ Redis not available (no valid config): {e}")
        REDIS_AVAILABLE = False
        redis_client = None

if not REDIS_AVAILABLE:
    logger.info("ℹ️ Rate limiting and caching disabled (Redis not configured)")

# ==========================================
# CACHE UTILITIES
# ==========================================

def cache_key(prefix: str, *args, **kwargs) -> str:
    """Gera uma chave de cache única"""
    key_data = f"{args}:{sorted(kwargs.items())}"
    return f"cache:{prefix}:{hashlib.md5(key_data.encode()).hexdigest()}"

def get_cache(key: str) -> Optional[Any]:
    if not REDIS_AVAILABLE:
        return None
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception as e:
        logger.error(f"Erro ao ler cache: {e}")
    return None

def set_cache(key: str, value: Any, ttl_seconds: int = 300) -> bool:
    if not REDIS_AVAILABLE:
        return False
    try:
        redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.error(f"Erro ao salvar cache: {e}")
        return False

def delete_cache(pattern: str) -> int:
    """Remove chaves do cache que correspondem ao padrão"""
    if not REDIS_AVAILABLE:
        return 0
    try:
        count = 0
        for key in redis_client.scan_iter(match=f"cache:*{pattern}*"):
            redis_client.delete(key)
            count += 1
        return count
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
    return 0

# ==========================================
# STATS & MONITORING
# ==========================================

def get_redis_stats() -> dict:
    if not REDIS_AVAILABLE:
        return {"status": "offline"}
    try:
        info = redis_client.info()
        return {
            "status": "online",
            "connected_clients": info.get("connected_clients", 0),
            "used_memory_human": info.get("used_memory_human", "N/A"),
            "total_keys": redis_client.dbsize()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def check_rate_limit(identifier: str, max_requests: int = 100, window_seconds: int = 60) -> tuple[bool, int]:
    if not REDIS_AVAILABLE:
        return True, max_requests
    key = f"ratelimit:{identifier}"
    try:
        current = redis_client.get(key)
        if current is None:
            redis_client.setex(key, window_seconds, 1)
            return True, max_requests - 1
        current = int(current)
        if current >= max_requests:
            return False, 0
        redis_client.incr(key)
        return True, max_requests - current - 1
    except Exception as e:
        logger.error(f"Erro no rate limit: {e}")
        return True, max_requests

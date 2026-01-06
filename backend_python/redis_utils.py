"""
Redis Utilities - Cache, Rate Limiting, Sessions
Módulo para otimização de performance com Redis
"""
import redis
import json
import os
import hashlib
from functools import wraps
from typing import Any, Optional, Callable
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

# Conexão Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("✅ Redis conectado com sucesso")
except Exception as e:
    logger.warning(f"⚠️ Redis não disponível: {e}")
    redis_client = None
    REDIS_AVAILABLE = False


# ==========================================
# CACHE UTILITIES
# ==========================================

def cache_key(prefix: str, *args, **kwargs) -> str:
    """Gera uma chave de cache única baseada nos argumentos"""
    key_data = f"{args}:{sorted(kwargs.items())}"
    return f"cache:{prefix}:{hashlib.md5(key_data.encode()).hexdigest()}"


def get_cache(key: str) -> Optional[Any]:
    """Obtém valor do cache"""
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
    """Salva valor no cache com TTL (padrão 5 minutos)"""
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
        # Use scan_iter for non-blocking iteration
        # match argument in scan_iter handles the pattern matching on the server side
        for key in redis_client.scan_iter(match=f"cache:*{pattern}*"):
            redis_client.delete(key)
            count += 1
        return count
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
    return 0


def cached(ttl_seconds: int = 300, prefix: str = ""):
    """
    Decorator para cachear resultados de funções
    
    Uso:
        @cached(ttl_seconds=60, prefix="clientes")
        def listar_clientes(company_id: int):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            key = cache_key(prefix or func.__name__, *args, **kwargs)
            
            # Tenta obter do cache
            cached_value = get_cache(key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {key}")
                return cached_value
            
            # Executa função e cacheia resultado
            logger.debug(f"Cache MISS: {key}")
            result = await func(*args, **kwargs)
            set_cache(key, result, ttl_seconds)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            key = cache_key(prefix or func.__name__, *args, **kwargs)
            
            cached_value = get_cache(key)
            if cached_value is not None:
                return cached_value
            
            result = func(*args, **kwargs)
            set_cache(key, result, ttl_seconds)
            return result
        
        # Retorna wrapper apropriado
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# ==========================================
# RATE LIMITING
# ==========================================

def check_rate_limit(
    identifier: str, 
    max_requests: int = 100, 
    window_seconds: int = 60
) -> tuple[bool, int]:
    """
    Verifica rate limit para um identificador (IP, user_id, etc)
    
    Returns:
        (allowed: bool, remaining: int)
    """
    if not REDIS_AVAILABLE:
        return True, max_requests
    
    key = f"ratelimit:{identifier}"
    
    try:
        current = redis_client.get(key)
        
        if current is None:
            # Primeira requisição
            redis_client.setex(key, window_seconds, 1)
            return True, max_requests - 1
        
        current = int(current)
        
        if current >= max_requests:
            # Limite atingido
            ttl = redis_client.ttl(key)
            return False, 0
        
        # Incrementa contador
        redis_client.incr(key)
        return True, max_requests - current - 1
        
    except Exception as e:
        logger.error(f"Erro no rate limit: {e}")
        return True, max_requests


# ==========================================
# SESSION MANAGEMENT
# ==========================================

def store_session(user_id: int, session_data: dict, ttl_hours: int = 24) -> str:
    """
    Armazena dados de sessão do usuário
    
    Returns:
        session_id
    """
    if not REDIS_AVAILABLE:
        return ""
    
    import uuid
    session_id = str(uuid.uuid4())
    key = f"session:{user_id}:{session_id}"
    
    try:
        redis_client.setex(
            key, 
            ttl_hours * 3600, 
            json.dumps(session_data, default=str)
        )
        return session_id
    except Exception as e:
        logger.error(f"Erro ao criar sessão: {e}")
        return ""


def get_session(user_id: int, session_id: str) -> Optional[dict]:
    """Obtém dados da sessão"""
    if not REDIS_AVAILABLE:
        return None
    
    key = f"session:{user_id}:{session_id}"
    
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Erro ao ler sessão: {e}")
    return None


def invalidate_session(user_id: int, session_id: str = None) -> bool:
    """Invalida sessão(ões) do usuário"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        if session_id:
            # Invalida sessão específica
            key = f"session:{user_id}:{session_id}"
            redis_client.delete(key)
        else:
            # Invalida todas as sessões do usuário
            keys = redis_client.keys(f"session:{user_id}:*")
            if keys:
                redis_client.delete(*keys)
        return True
    except Exception as e:
        logger.error(f"Erro ao invalidar sessão: {e}")
        return False


# ==========================================
# TASK QUEUE (Simple)
# ==========================================

def enqueue_task(queue_name: str, task_data: dict) -> bool:
    """Adiciona tarefa à fila"""
    if not REDIS_AVAILABLE:
        return False
    
    try:
        redis_client.rpush(f"queue:{queue_name}", json.dumps(task_data, default=str))
        return True
    except Exception as e:
        logger.error(f"Erro ao enfileirar tarefa: {e}")
        return False


def dequeue_task(queue_name: str) -> Optional[dict]:
    """Remove e retorna próxima tarefa da fila"""
    if not REDIS_AVAILABLE:
        return None
    
    try:
        data = redis_client.lpop(f"queue:{queue_name}")
        if data:
            return json.loads(data)
    except Exception as e:
        logger.error(f"Erro ao desenfileirar tarefa: {e}")
    return None


def queue_length(queue_name: str) -> int:
    """Retorna tamanho da fila"""
    if not REDIS_AVAILABLE:
        return 0
    
    try:
        return redis_client.llen(f"queue:{queue_name}")
    except:
        return 0


# ==========================================
# STATS & MONITORING
# ==========================================

def get_redis_stats() -> dict:
    """Retorna estatísticas do Redis"""
    if not REDIS_AVAILABLE:
        return {"status": "offline"}
    
    try:
        info = redis_client.info()
        return {
            "status": "online",
            "connected_clients": info.get("connected_clients", 0),
            "used_memory_human": info.get("used_memory_human", "N/A"),
            "total_keys": redis_client.dbsize(),
            "uptime_days": info.get("uptime_in_days", 0)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

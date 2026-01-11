"""
Centralized Configuration for Inovar Refrigeração Backend
All configuration settings should be imported from this file
"""
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # Fix for SQLAlchemy compatibility
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# =============================================================================
# SUPABASE CONFIGURATION
# =============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# =============================================================================
# AUTHENTICATION & SECURITY
# =============================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Check if using default SECRET_KEY in production
if SECRET_KEY == "your-secret-key-change-in-production":
    ENV = os.getenv("ENV", "development").lower()
    if ENV == "production" or not DEBUG:
        import logging
        logging.critical("❌ CRITICAL SECURITY ERROR: Using default SECRET_KEY in production!")
        logging.critical("❌ Set SECRET_KEY environment variable immediately!")
        import sys
        sys.exit(1)
    else:
        import logging
        logging.warning("⚠️ Using default SECRET_KEY (OK for development only)")

# =============================================================================
# STORAGE CONFIGURATION
# =============================================================================

IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")

# Storage priority: 1. Supabase Storage, 2. ImgBB, 3. Base64
STORAGE_PROVIDER = "supabase" if SUPABASE_SERVICE_KEY else ("imgbb" if IMGBB_API_KEY else "base64")

# =============================================================================
# REDIS CONFIGURATION (Optional)
# =============================================================================


REDIS_URL = os.getenv("REDIS_URL", "")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================

APP_NAME = "Inovar Refrigeração API"
APP_VERSION = "1.0.1"
APP_DESCRIPTION = "API do Sistema de Gestão para Inovar Refrigeração"

# Server settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# CORS settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
CORS_ALLOW_ALL = os.getenv("CORS_ALLOW_ALL", "true").lower() == "true"

if CORS_ALLOW_ALL:
    CORS_ORIGINS = ["*"]

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# =============================================================================
# RATE LIMITING
# =============================================================================

RATE_LIMIT_ENABLED = bool(REDIS_URL)
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "100"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

# =============================================================================
# VALIDATION & HELPERS
# =============================================================================

def validate_config() -> bool:
    """Validate that all critical configuration is present"""
    import logging
    logger = logging.getLogger(__name__)
    
    critical_vars = {
        "DATABASE_URL": DATABASE_URL,
        "SECRET_KEY": SECRET_KEY,
    }
    
    missing = [key for key, value in critical_vars.items() if not value]
    
    if missing:
        logger.error(f"❌ Missing critical environment variables: {', '.join(missing)}")
        return False
    
    if SECRET_KEY == "your-secret-key-change-in-production":
        logger.warning("⚠️ WARNING: Using default SECRET_KEY. Change this in production!")
    
    logger.info("✅ Configuration validated successfully")
    return True

def get_storage_info() -> dict:
    """Get information about configured storage providers"""
    return {
        "primary": STORAGE_PROVIDER,
        "supabase": bool(SUPABASE_SERVICE_KEY),
        "imgbb": bool(IMGBB_API_KEY),
        "base64_fallback": True
    }

def get_db_info() -> dict:
    """Get database connection information (sanitized)"""
    if not DATABASE_URL:
        return {"configured": False}
    
    # Don't expose full connection string
    return {
        "configured": True,
        "type": "PostgreSQL (Supabase)",
        "ssl": "sslmode" in DATABASE_URL
    }

# =============================================================================
# EXPORT ALL CONFIGURATION
# =============================================================================

__all__ = [
    # Database
    "DATABASE_URL",
    
    # Supabase
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_ANON_KEY",
    
    # Auth
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    
    # Storage
    "IMGBB_API_KEY",
    "STORAGE_PROVIDER",
    
    # Redis
    "REDIS_URL",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
    
    # App
    "APP_NAME",
    "APP_VERSION",
    "APP_DESCRIPTION",
    "HOST",
    "PORT",
    "DEBUG",
    
    # CORS
    "CORS_ORIGINS",
    "CORS_ALLOW_ALL",
    
    # Logging
    "LOG_LEVEL",
    
    # Rate Limiting
    "RATE_LIMIT_ENABLED",
    "RATE_LIMIT_MAX_REQUESTS",
    "RATE_LIMIT_WINDOW_SECONDS",
    
    # Helpers
    "validate_config",
    "get_storage_info",
    "get_db_info",
]

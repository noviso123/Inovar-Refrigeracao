from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
import logging

logger = logging.getLogger(__name__)

# URL de conexão
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# Ajustar URL para PostgreSQL
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Force port 6543 for Supabase to use connection pooling (fixes OperationalError on Vercel)
if "supabase.co" in DATABASE_URL and ":5432" in DATABASE_URL:
    logger.info("🔧 Auto-correcting Supabase port from 5432 to 6543 for connection pooling")
    DATABASE_URL = DATABASE_URL.replace(":5432", ":6543")

# Remove unsupported parameters for psycopg2
if "?" in DATABASE_URL:
    base_url, params = DATABASE_URL.split("?", 1)
    valid_params = []
    for param in params.split("&"):
        if "pgbouncer" not in param and "sslmode" not in param:
            valid_params.append(param)
    
    if valid_params:
        DATABASE_URL = f"{base_url}?{'&'.join(valid_params)}"
    else:
        DATABASE_URL = base_url

logger.info(f"Database Config: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'sqlite'}")

# Configuração do Engine
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Standard PostgreSQL Configuration
    # Recommended for Direct Connection or compatible Poolers
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 15
        }
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from models import Base
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tables created/verified successfully")
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")

    # Inserir SystemSettings padrão se não existir
    db = next(get_db())
    try:
        from models import SystemSettings
        if not db.query(SystemSettings).filter(SystemSettings.id == 1).first():
            settings = SystemSettings(
                id=1,
                business_name="Inovar Refrigeração",
                logo_url="/logo.png"
            )
            db.add(settings)
            db.commit()
            logger.info("✅ Default SystemSettings created")
    except Exception as e:
        logger.error(f"❌ Error initializing settings: {e}")
        db.rollback()
    finally:
        db.close()

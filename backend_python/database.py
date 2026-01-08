from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# URL de conexão - OBRIGATÓRIO para Supabase PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "❌ DATABASE_URL não encontrada no ambiente!\n"
        "Configure a connection string do Supabase PostgreSQL:\n"
        "  DATABASE_URL=postgresql://postgres:SENHA@db.XXXX.supabase.co:5432/postgres\n"
        "No arquivo backend_python/.env ou como variável de ambiente."
    )

# Ajustar URL para PostgreSQL (Supabase usa postgres:// mas SQLAlchemy precisa postgresql://)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Conectando ao banco de dados Supabase...")

# Configurações do Engine para PostgreSQL
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from models import Base
    Base.metadata.create_all(bind=engine)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# URL de conexão (lê do ambiente ou usa padrão SQLite local para desenvolvimento offline)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# Configurações do Engine (SQLite precisa de check_same_thread=False)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
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

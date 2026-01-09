from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import logging
import traceback

from database import get_db
from models import User
from validators import validate_cpf, validate_cnpj

# Configure logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter()

# Configuração Supabase
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Fallback for build time or testing without envs
    print("⚠️ Supabase Credentials missing in backend!")

from supabase import create_client, Client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"⚠️ Error initializing Supabase client: {e}")
    supabase = None

# Local Auth Implementation
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-it")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# Pydantic Models
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str = ""
    full_name: str = ""
    role: str = "prestador"

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Define OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    email = None
    
    # Primeiro, tentar decodificar como JWT local
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email:
            logger.info(f"Token local validado para: {email}")
    except JWTError as e:
        logger.debug(f"Não é um token local, tentando Supabase: {e}")
    
    # Se não conseguiu via JWT local, tentar Supabase
    if not email and supabase:
        try:
            res = supabase.auth.get_user(token)
            if res and res.user:
                email = res.user.email
                logger.info(f"Token Supabase validado para: {email}")
        except Exception as e:
            logger.debug(f"Erro ao verificar token no Supabase: {e}")
    
    if not email:
        logger.warning("Nenhum método de autenticação conseguiu validar o token")
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"Usuário não encontrado no banco local: {email}")
        raise credentials_exception
    return user


# Rotas
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        logger.info(f"Login attempt for: {form_data.username}")
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            logger.warning(f"Login failed for: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role, "id": user.id},
            expires_delta=access_token_expires
        )
        logger.info(f"Login successful for: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Login error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nome_completo": current_user.full_name,
        "cargo": current_user.role,
        "telefone": current_user.phone,
        "cpf": current_user.cpf,
        "avatar_url": current_user.avatar_url,
        "signature_url": current_user.signature_url,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

# Aliases for frontend compatibility
@router.get("/auth/me")
async def auth_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nome_completo": current_user.full_name,
        "cargo": current_user.role,
        "telefone": current_user.phone,
        "cpf": current_user.cpf,
        "avatar_url": current_user.avatar_url,
        "signature_url": current_user.signature_url,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "endereco": {
            "cep": current_user.cep,
            "logradouro": current_user.logradouro,
            "numero": current_user.numero,
            "complemento": current_user.complemento,
            "bairro": current_user.bairro,
            "cidade": current_user.cidade,
            "estado": current_user.estado
        } if current_user.cep or current_user.logradouro else None
    }

@router.post("/auth/google")
async def google_login(token: dict):
    # Mock Google Login for now
    return {
        "token": "mock_google_token",
        "usuario": {
            "id": 1,
            "email": "google@test.com",
            "nome_completo": "Google User",
            "cargo": "prestador"
        }
    }

@router.post("/auth/google/link")
async def google_link(token: dict):
    """Link Google account to existing user"""
    return {"message": "Conta Google vinculada com sucesso"}

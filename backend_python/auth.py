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

# Note: Supabase is used for database and storage only
# Authentication is handled via local JWT tokens

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

def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token
    Returns the token payload if valid, raises JWTError if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.error(f"Token decode error: {e}")
        raise


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Validate JWT token and return the current authenticated user.
    Uses only local JWT authentication (no Supabase Auth).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            logger.warning("Token válido mas sem email (sub)")
            raise credentials_exception
            
        logger.debug(f"Token validado para: {email}")
        
    except JWTError as e:
        logger.warning(f"Falha na validação do token JWT: {e}")
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        logger.warning(f"Usuário não encontrado no banco: {email}")
        raise credentials_exception
        
    if not user.is_active:
        logger.warning(f"Usuário inativo tentou acessar: {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )
    
    return user


async def get_admin_user(current_user: User = Depends(get_current_user)):
    """
    Dependency to ensure the user has 'admin' role.
    """
    if current_user.role != "admin":
        logger.warning(f"Acesso negado para usuário não-admin: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )
    return current_user


async def get_operational_user(current_user: User = Depends(get_current_user)):
    """
    Dependency to ensure the user has 'prestador' role (Operational/Owner).
    Admins are blocked from operational data.
    """
    if current_user.role == "admin":
        logger.warning(f"Acesso negado para admin em rota operacional: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administradores não têm acesso a dados operacionais"
        )
    return current_user


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
    except HTTPException:
        raise
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

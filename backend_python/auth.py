from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

from database import get_db
from models import User
from validators import validate_cpf, validate_cnpj

# Configurações JWT
SECRET_KEY = os.getenv("SECRET_KEY", "sua_chave_secreta_super_segura")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

# Configuração de Hashing de Senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(tags=["Authentication"])

# Schemas Pydantic
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "prestador"

class LoginRequest(BaseModel):
    Email: str
    Password: str

# Funções Auxiliares
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    return user

# Rotas
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
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
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/login")
async def login_json(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.Email).first()
    if not user or not verify_password(login_data.Password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "id": user.id},
        expires_delta=access_token_expires
    )

    # Placeholder for empresa_data, assuming it would be fetched or defined elsewhere
    empresa_data = [] # Or fetch from user.empresas if it's a relationship

    return {
        "token": access_token,
        "usuario": {
            "id": user.id,
            "email": user.email,
            "nome_completo": user.full_name,
            "cargo": user.role,
            "role": user.role,
            "telefone": user.phone,
            "cpf": user.cpf,
            "is_active": user.is_active,
            "avatar_url": user.avatar_url,
            "signature_url": user.signature_url,
            "assinatura_url": user.signature_url, # Helper alias
            "empresas": empresa_data
        }
    }

@router.post("/register", response_model=Token)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "cpf": current_user.cpf,
        "avatar_url": current_user.avatar_url,
        "signature_url": current_user.signature_url,
        "address": current_user.address_json
    }

# Aliases for frontend compatibility
@router.get("/auth/me")
async def auth_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await read_users_me(current_user, db)

@router.post("/auth/google")
async def google_login(token: dict):
    # Mock Google Login for now - aligned with monolithic role structure
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

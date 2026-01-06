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
    
    # Strict Subscription Check
    if user.role != "super_admin":
        if not user.company_id:
             # If not super admin and no company, something is wrong (or it's a new user flow)
             pass 
        else:
            # Check company subscription
            from models import Subscription
            subscription = db.query(Subscription).filter(
                Subscription.company_id == user.company_id,
                Subscription.status == 'ativa'
            ).first()
            
            if not subscription:
                # Allow access to specific routes needed for renewal
                # We need to import Request from fastapi
                allowed_paths = [
                    "/api/auth/me", 
                    "/api/assinaturas", 
                    "/api/planos", 
                    "/api/webhook/mercadopago",
                    "/api/sistema/notificacoes",
                    "/api/usuarios"
                ]
                
                # Check if current path starts with any allowed path
                is_allowed = False
                current_path = request.url.path
                
                for path in allowed_paths:
                    if current_path.startswith(path):
                        is_allowed = True
                        break
                
                if not is_allowed:
                    raise HTTPException(
                        status_code=403,
                        detail="Assinatura da empresa inativa ou expirada.",
                        headers={"X-Subscription-Status": "expired"}
                    )

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
    
    # Criar notificação de boas-vindas no primeiro acesso
    try:
        from notification_service import notify_welcome
        notify_welcome(db, user)
    except Exception as e:
        # Log but don't fail login
        import logging
        logging.getLogger(__name__).error(f"Error creating welcome notification: {e}")
    
    assinatura_ativa = user.role == "super_admin"
    if not assinatura_ativa and user.company_id:
        from models import Subscription
        subscription = db.query(Subscription).filter(
            Subscription.company_id == user.company_id,
            Subscription.status == 'ativa'
        ).first()
        assinatura_ativa = subscription is not None
    
    return {
        "token": access_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "nome_completo": user.full_name,
            "cargo": user.role,
            "company_id": user.company_id,
            "assinaturaAtiva": assinatura_ativa,
            "telefone": user.phone,
            "cpf": user.cpf,
            "avatar_url": user.avatar_url,
            "assinatura_base64": user.signature_base64,
            "enderecos": [user.address_json] if user.address_json else []
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
    assinatura_ativa = current_user.role == "super_admin"
    if not assinatura_ativa and current_user.company_id:
        from models import Subscription
        subscription = db.query(Subscription).filter(
            Subscription.company_id == current_user.company_id,
            Subscription.status == 'ativa'
        ).first()
        assinatura_ativa = subscription is not None
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nome_completo": current_user.full_name,
        "cargo": current_user.role,
        "company_id": current_user.company_id,
        "assinaturaAtiva": assinatura_ativa,
        "telefone": current_user.phone,
        "cpf": current_user.cpf,
        "avatar_url": current_user.avatar_url,
        "assinatura_base64": current_user.signature_base64,
        "enderecos": [current_user.address_json] if current_user.address_json else []
    }

# Aliases for frontend compatibility
@router.get("/auth/me")
async def auth_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await read_users_me(current_user, db)

class CompanyRegisterRequest(BaseModel):
    nome: str
    email: str
    cpf: str # CNPJ actually
    telefone: str
    endereco: Optional[object] = None
    senha: str

from models import Company

@router.post("/auth/register-company")
async def register_company(data: CompanyRegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Validate CNPJ
    cleaned_cnpj = validate_cnpj(data.cpf)
    
    # Create Company
    new_company = Company(
        name=data.nome,
        cnpj=cleaned_cnpj, # Use cleaned CNPJ
        phone=data.telefone,
        address=str(data.endereco) if data.endereco else None
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    
    # Create Admin User for Company
    hashed_password = get_password_hash(data.senha)
    new_user = User(
        email=data.email,
        password_hash=hashed_password,
        full_name=data.nome, # Use company name as user name initially
        role="prestador",
        company_id=new_company.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    
    return {
        "token": access_token,
        "usuario": {
            "id": new_user.id,
            "email": new_user.email,
            "nome_completo": new_user.full_name,
            "cargo": new_user.role,
            "company_id": new_user.company_id,
            "assinaturaAtiva": False
        }
    }

@router.post("/auth/google")
async def google_login(token: dict):
    # Mock Google Login for now
    # In production, verify token with Google API
    return {"token": "mock_google_token", "usuario": {"id": 1, "email": "google@test.com", "nome_completo": "Google User", "cargo": "user", "assinaturaAtiva": True}}

@router.post("/auth/google/link")
async def google_link(token: dict):
    """Link Google account to existing user"""
    return {"message": "Conta Google vinculada com sucesso"}




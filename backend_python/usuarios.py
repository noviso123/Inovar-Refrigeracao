from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import User
from pydantic import BaseModel, Field
from datetime import datetime
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

from auth import get_current_user, get_password_hash

# Schemas
class UserResponse(BaseModel):
    id: int
    email: str
    nome_completo: Optional[str] = Field(None, alias="full_name")
    cargo: str = Field(..., alias="role")
    is_active: bool
    created_at: datetime
    # Profile Data
    telefone: Optional[str] = Field(None, alias="phone")
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None
    signature_base64: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class UserCreateRequest(BaseModel):
    email: str
    password: str
    nome_completo: str
    cargo: str = "prestador"

class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    nome_completo: Optional[str] = None
    cargo: Optional[str] = None
    is_active: Optional[bool] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None
    signature_url: Optional[str] = None

# Routes
@router.get("/usuarios", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/usuarios", response_model=UserResponse)
def create_user(user: UserCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    hashed = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed,
        full_name=user.nome_completo,
        role=user.cargo or "prestador"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/usuarios/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: UserUpdateRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user_data.email is not None: db_user.email = user_data.email
    if user_data.nome_completo is not None: db_user.full_name = user_data.nome_completo
    if user_data.cargo is not None: db_user.role = user_data.cargo
    if user_data.is_active is not None: db_user.is_active = user_data.is_active
    if user_data.telefone is not None: db_user.phone = user_data.telefone
    if user_data.cpf is not None: db_user.cpf = user_data.cpf
    if user_data.avatar_url is not None: db_user.avatar_url = user_data.avatar_url
    if user_data.signature_base64 is not None: db_user.signature_base64 = user_data.signature_base64

    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/usuarios/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    db.delete(user)
    db.commit()
    return {"message": "Usuário removido"}

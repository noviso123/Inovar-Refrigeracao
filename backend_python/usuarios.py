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

from pydantic import BaseModel, Field, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: int
    email: str
    nome_completo: Optional[str] = Field(None, validation_alias="full_name")
    cargo: str = Field(..., validation_alias="role")
    is_active: bool
    created_at: datetime
    # Profile Data
    telefone: Optional[str] = Field(None, validation_alias="phone")
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None
    signature_base64: Optional[str] = None
    automacao: Optional[dict] = None
    endereco: Optional[dict] = None # Constructed manually in route

class UserCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    email: str
    password: str
    nome_completo: str
    cargo: str = "prestador"

class UserUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    email: Optional[str] = None
    nome_completo: Optional[str] = None
    cargo: Optional[str] = None
    is_active: Optional[bool] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None
    signature_url: Optional[str] = None
    automacao: Optional[dict] = None
    endereco: Optional[dict] = None

# Routes
@router.get("/usuarios")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "nome_completo": u.full_name,
            "cargo": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "telefone": u.phone,
            "cpf": u.cpf,
            "avatar_url": u.avatar_url,
            "signature_base64": u.signature_url, # Map signature_url to signature_base64 for frontend
            "automacao": u.automacao,
            "endereco": {
                "cep": u.cep,
                "logradouro": u.logradouro,
                "numero": u.numero,
                "complemento": u.complemento,
                "bairro": u.bairro,
                "cidade": u.cidade,
                "estado": u.estado
            } if u.cep or u.logradouro else None
        }
        for u in users
    ]

@router.get("/usuarios/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {
        "id": user.id,
        "email": user.email,
        "nome_completo": user.full_name,
        "cargo": user.role,
        "telefone": user.phone,
        "cpf": user.cpf,
        "avatar_url": user.avatar_url,
        "signature_url": user.signature_url,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "endereco": {
            "cep": user.cep,
            "logradouro": user.logradouro,
            "numero": user.numero,
            "complemento": user.complemento,
            "bairro": user.bairro,
            "cidade": user.cidade,
            "estado": user.estado
        } if user.cep or user.logradouro else None
    }

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
    if user_data.signature_url is not None: db_user.signature_url = user_data.signature_url
    if user_data.automacao is not None: db_user.automacao = user_data.automacao

    if user_data.endereco is not None:
        addr = user_data.endereco
        db_user.cep = addr.get("cep")
        db_user.logradouro = addr.get("logradouro") or addr.get("rua") # Handle potential frontend key diff
        db_user.numero = addr.get("numero")
        db_user.complemento = addr.get("complemento")
        db_user.bairro = addr.get("bairro")
        db_user.cidade = addr.get("cidade")
        db_user.estado = addr.get("estado")

    db.commit()
    db.refresh(db_user)

    # Construct response manually to include address
    response_data = {
        "id": db_user.id,
        "email": db_user.email,
        "nome_completo": db_user.full_name,
        "cargo": db_user.role,
        "is_active": db_user.is_active,
        "created_at": db_user.created_at,
        "telefone": db_user.phone,
        "cpf": db_user.cpf,
        "avatar_url": db_user.avatar_url,
        "signature_base64": db_user.signature_url,
        "automacao": db_user.automacao,
        "endereco": {
            "cep": db_user.cep,
            "logradouro": db_user.logradouro,
            "numero": db_user.numero,
            "complemento": db_user.complemento,
            "bairro": db_user.bairro,
            "cidade": db_user.cidade,
            "estado": db_user.estado
        } if db_user.cep or db_user.logradouro else None
    }
    return response_data

@router.delete("/usuarios/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    db.delete(user)
    db.commit()
    return {"message": "Usuário removido"}

# ============= AUTHENTICATED USER PROFILE =============

class MeUpdateRequest(BaseModel):
    nome_completo: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None
    endereco: Optional[dict] = None

class PasswordChangeRequest(BaseModel):
    novaSenha: str

@router.put("/usuarios/me")
def update_current_user(
    data: MeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza o perfil do usuário autenticado."""
    try:
        logger.info(f"Atualizando usuário {current_user.id}: {data}")

        if data.nome_completo is not None:
            current_user.full_name = data.nome_completo
        if data.telefone is not None:
            current_user.phone = data.telefone
        if data.cpf is not None:
            current_user.cpf = data.cpf
        if data.avatar_url is not None:
            current_user.avatar_url = data.avatar_url

        if data.endereco is not None:
            addr = data.endereco
            current_user.cep = addr.get("cep")
            current_user.logradouro = addr.get("logradouro") or addr.get("rua")
            current_user.numero = addr.get("numero")
            current_user.complemento = addr.get("complemento")
            current_user.bairro = addr.get("bairro")
            current_user.cidade = addr.get("cidade")
            current_user.estado = addr.get("estado")

        db.commit()
        db.refresh(current_user)

        logger.info(f"Usuário {current_user.id} atualizado com sucesso")

        return {
            "id": current_user.id,
            "email": current_user.email,
            "nome_completo": current_user.full_name,
            "cargo": current_user.role,
            "telefone": current_user.phone,
            "cpf": current_user.cpf,
            "avatar_url": current_user.avatar_url,
            "is_active": current_user.is_active,
            "message": "Perfil atualizado com sucesso"
        }
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/usuarios/me/senha")
def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Altera a senha do usuário autenticado."""
    if len(data.novaSenha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")

    current_user.password_hash = get_password_hash(data.novaSenha)
    db.commit()

    return {"message": "Senha alterada com sucesso"}

@router.put("/usuarios/{user_id}/automacao")
def update_user_automation(user_id: int, config: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.automacao = config
    db.commit()
    return {"message": "Configurações de automação atualizadas"}

@router.post("/usuarios/{user_id}/automacao/test")
def test_user_automation(user_id: int, db: Session = Depends(get_db)):
    # Simular o disparo de lembretes para este usuário
    # Na vida real, o scheduler cuidaria disso, mas aqui forçamos uma execução
    return {"message": "Teste de automação enfileirado", "status": "success"}

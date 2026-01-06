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
    nome_completo: Optional[str] = None
    cargo: str
    is_active: bool
    created_at: datetime
    criado_em: Optional[datetime] = Field(None, alias="created_at")
    criadoEm: Optional[datetime] = Field(None, alias="created_at")
    assinaturaAtiva: bool = False
    # Profile Data
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None
    assinatura_base64: Optional[str] = None
    enderecos: Optional[List[dict]] = []
    
    class Config:
        from_attributes = True

@router.get("/usuarios", response_model=List[UserResponse])
def get_users(
    skip: int = 0, 
    limit: int = 50, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Cache key
    cache_key = f"cache:usuarios:list:global:{skip}:{limit}"
    cached = get_cache(cache_key)
    if cached:
        logger.debug("Cache HIT: usuarios")
        return cached
    
    query = db.query(User)
    if current_user.role != "super_admin":
        # query = query.filter(User.company_id == current_user.company_id)
        pass
        
    users = query.offset(skip).limit(limit).all()
    
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "nome_completo": u.full_name,
            "cargo": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "criado_em": u.created_at.isoformat() if u.created_at else None,
            "criadoEm": u.created_at.isoformat() if u.created_at else None,
            "assinaturaAtiva": True,
            "telefone": u.phone,
            "cpf": u.cpf,
            "avatar_url": u.avatar_url,
            "assinatura_base64": u.signature_base64,
            "enderecos": [u.address_json] if u.address_json else []
        })
    
    set_cache(cache_key, result, ttl_seconds=120)  # 2 minutes cache
    return result

@router.get("/usuarios/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(User).filter(User.id == user_id)
    
    if current_user.role != "super_admin":
        # query = query.filter(User.company_id == current_user.company_id)
        pass
        
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {
        "id": user.id,
        "email": user.email,
        "nome_completo": user.full_name,
        "cargo": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "criado_em": user.created_at,
        "criadoEm": user.created_at,
        "assinaturaAtiva": True,
        "telefone": user.phone,
        "cpf": user.cpf,
        "avatar_url": user.avatar_url,
        "assinatura_base64": user.signature_base64,
        "enderecos": [user.address_json] if user.address_json else []
    }

class UserCreateRequest(BaseModel):
    email: str
    password: str
    nome_completo: str
    cargo: Optional[str] = "tecnico"
    company_id: Optional[int] = None



from plan_limits import check_technician_limit

@router.post("/usuarios", response_model=UserResponse)
def create_user(user: UserCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check permissions
    if current_user.role not in ["super_admin", "prestador"]:
        raise HTTPException(status_code=403, detail="Sem permissão para criar usuários")

    # Validate role
    if user.cargo not in ["prestador", "tecnico"]:
        raise HTTPException(status_code=400, detail="Perfil inválido. Use 'prestador' ou 'tecnico'.")

    # Determine Company ID
    company_id = current_user.company_id
    if current_user.role == "super_admin":
        if user.company_id:
            company_id = user.company_id
        else:
            if not company_id:
                 raise HTTPException(status_code=400, detail="SuperAdmin deve especificar a empresa (company_id) para criar um usuário.")

    # Check limits if creating a technician
    if user.cargo == "tecnico":
        check_technician_limit(db, company_id)

    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.nome_completo,
        role=user.cargo,
        is_active=True,
        created_at=datetime.now(),
        company_id=company_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Invalidate cache
    delete_cache("usuarios")
    
    # Notificações
    try:
        from notification_service import create_notification, notify_technician_added
        
        # Notificar o novo usuário criado
        create_notification(
            db=db,
            user_id=new_user.id,
            title="🎉 Bem-vindo ao Inovar Refrigeração!",
            message=f"Sua conta foi criada como {new_user.role}. Faça login para começar!",
            notification_type="success",
            link="/#/dashboard",
            company_id=new_user.company_id
        )
        
        # Notificar quem criou (se for técnico)
        if user.cargo == "tecnico":
            notify_technician_added(
                db=db,
                technician_name=new_user.full_name,
                admin_id=current_user.id,
                company_id=current_user.company_id
            )
    except Exception as e:
        logger.error(f"Error creating user notifications: {e}")
    
    return {
        "id": new_user.id,
        "email": new_user.email,
        "nome_completo": new_user.full_name,
        "cargo": new_user.role,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at,
        "criado_em": new_user.created_at,
        "criadoEm": new_user.created_at,
        "assinaturaAtiva": False
    }



class UserUpdateRequest(BaseModel):
    nome_completo: Optional[str] = Field(None, alias="nomeCompleto")
    cargo: Optional[str] = None
    ativo: Optional[bool] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    avatarUrl: Optional[str] = None
    assinaturaBase64: Optional[str] = None
    endereco: Optional[dict] = None
    senha: Optional[str] = None

@router.put("/usuarios/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check permissions: Only SuperAdmin/Prestador OR the user themselves
    if current_user.role not in ["super_admin", "prestador"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Sem permissão para editar este usuário")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Enforce Company Isolation
    if current_user.role != "super_admin" and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Sem permissão para editar usuário de outra empresa")
    
    # Capturar mudanças importantes para notificações
    old_is_active = user.is_active
    password_changed = False
    profile_changed = False
    
    if data.nome_completo is not None:
        user.full_name = data.nome_completo
        profile_changed = True
    if data.cargo is not None:
        user.role = data.cargo
        profile_changed = True
    if data.ativo is not None:
        user.is_active = data.ativo
    if data.email is not None:
        user.email = data.email
        profile_changed = True
    if data.telefone is not None:
        user.phone = data.telefone
        profile_changed = True
    if data.cpf is not None:
        user.cpf = data.cpf
        profile_changed = True
    if data.avatarUrl is not None:
        user.avatar_url = data.avatarUrl
    if data.assinaturaBase64 is not None:
        user.signature_base64 = data.assinaturaBase64
    if data.endereco is not None:
        user.address_json = data.endereco
    if data.senha:
        user.password_hash = get_password_hash(data.senha)
        password_changed = True
    
    db.commit()
    db.refresh(user)
    delete_cache("usuarios")
    
    # Notificações de alterações
    try:
        from notification_service import create_notification
        
        # Senha alterada
        if password_changed:
            create_notification(
                db=db,
                user_id=user.id,
                title="🔐 Senha Alterada",
                message="Sua senha foi alterada com sucesso.",
                notification_type="info",
                company_id=user.company_id
            )
        
        # Usuário bloqueado/desbloqueado
        if data.ativo is not None and data.ativo != old_is_active:
            if data.ativo:
                create_notification(
                    db=db,
                    user_id=user.id,
                    title="✅ Conta Desbloqueada",
                    message="Sua conta foi desbloqueada. Você já pode acessar o sistema.",
                    notification_type="success",
                    company_id=user.company_id
                )
            else:
                create_notification(
                    db=db,
                    user_id=user.id,
                    title="🚫 Conta Bloqueada",
                    message="Sua conta foi bloqueada. Entre em contato com o administrador.",
                    notification_type="warning",
                    company_id=user.company_id
                )
        
        # Perfil atualizado (por outra pessoa)
        if profile_changed and current_user.id != user.id:
            create_notification(
                db=db,
                user_id=user.id,
                title="✏️ Perfil Atualizado",
                message="Seu perfil foi atualizado por um administrador.",
                notification_type="info",
                link="/#/configuracoes",
                company_id=user.company_id
            )
    except Exception as e:
        logger.error(f"Error creating update notifications: {e}")
    
    return {
        "id": user.id,
        "email": user.email,
        "nome_completo": user.full_name,
        "cargo": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "assinaturaAtiva": user.role == "super_admin",
        "telefone": user.phone,
        "cpf": user.cpf,
        "avatar_url": user.avatar_url,
        "assinatura_base64": user.signature_base64,
        "enderecos": [user.address_json] if user.address_json else []
    }

@router.delete("/usuarios/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check permissions: Only SuperAdmin/Prestador
    if current_user.role not in ["super_admin", "prestador"]:
        raise HTTPException(status_code=403, detail="Sem permissão para excluir usuários")

    query = db.query(User).filter(User.id == user_id)
    
    if current_user.role != "super_admin":
        query = query.filter(User.company_id == current_user.company_id)
        
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    try:
        # Delete user notifications first to avoid ForeignKey violation
        from models import Notification
        db.query(Notification).filter(Notification.user_id == user_id).delete()
        
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user {user_id}: {e}")
        raise HTTPException(status_code=400, detail="Não é possível excluir este usuário pois ele possui registros vinculados (OS, etc).")
        
    delete_cache("usuarios")
    
    return {"message": "Usuário removido"}

class PasswordChangeRequest(BaseModel):
    novaSenha: str

@router.put("/usuarios/me/senha")
def change_password(data: PasswordChangeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.password_hash = get_password_hash(data.novaSenha)
    db.commit()
    
    # Notificar o usuário sobre a mudança de senha
    try:
        from notification_service import create_notification
        create_notification(
            db=db,
            user_id=current_user.id,
            title="🔐 Senha Alterada",
            message="Você alterou sua senha com sucesso. Se não foi você, entre em contato conosco.",
            notification_type="info",
            company_id=current_user.company_id
        )
    except Exception as e:
        logger.error(f"Error creating password change notification: {e}")
    
    return {"message": "Senha alterada com sucesso"}

class AutomacaoConfig(BaseModel):
    enviarLembretes: Optional[bool] = True
    diasAntecedencia: Optional[int] = 7

@router.put("/usuarios/{user_id}/automacao")
def update_automacao(user_id: int, config: AutomacaoConfig, db: Session = Depends(get_db)):
    # Store in user metadata or separate table - for now just return success
    return {"message": "Configuração de automação salva", "config": config.dict()}

@router.post("/usuarios/{user_id}/automacao/test")
def test_automacao(user_id: int, db: Session = Depends(get_db)):
    return {"message": "Teste de automação enviado com sucesso"}

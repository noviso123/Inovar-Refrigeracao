from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Notification, User, SystemSettings
from auth import get_current_user
from redis_utils import get_cache, set_cache, delete_cache
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# ============= SYSTEM BRANDING (Unified Settings) =============

class BrandingUpdate(BaseModel):
    # Match frontend frontend keys (camelCase and snake_case)
    nomeFantasia: Optional[str] = None
    cnpj: Optional[str] = None
    emailContato: Optional[str] = None
    telefoneContato: Optional[str] = None
    pix_key: Optional[str] = None

    # Address
    endereco: Optional[dict] = None # { cep, logradouro, numero, ... }

    site: Optional[str] = None
    logoUrl: Optional[str] = None
    # Fiscal
    nfseAtivo: Optional[bool] = None
    inscricaoMunicipal: Optional[str] = None
    codigoServico: Optional[str] = None
    aliquotaISS: Optional[str] = None
    ambienteFiscal: Optional[str] = None

@router.get("/empresas/me")
async def get_system_settings(db: Session = Depends(get_db)):
    """Retorna as configurações do sistema (branding e fiscal)"""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        # Create default if not exists
        settings = SystemSettings(id=1, business_name="Inovar Refrigeração")
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "id": 1,
        "nomeFantasia": settings.business_name,
        "cnpj": settings.cnpj or "",
        "emailContato": settings.email_contact or "",
        "telefoneContato": settings.phone_contact or "",
        "endereco": {
            "cep": settings.cep,
            "logradouro": settings.logradouro,
            "numero": settings.numero,
            "complemento": settings.complemento,
            "bairro": settings.bairro,
            "cidade": settings.cidade,
            "estado": settings.estado
        } if settings.cep or settings.logradouro else None,
        "site": settings.website or "",
        "logoUrl": settings.logo_url or "",
        "pix_key": settings.pix_key or "",
        "nfseAtivo": settings.nfse_active,
        "inscricaoMunicipal": settings.municipal_registration or "",
        "codigoServico": "14.01", # Fallback default
        "aliquotaISS": "2.00",
        "ambienteFiscal": "homologacao"
    }

@router.put("/empresas/me")
async def update_system_settings(data: BrandingUpdate, db: Session = Depends(get_db)):
    """Atualiza as configurações do sistema"""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        settings = SystemSettings(id=1)
        db.add(settings)

    if data.nomeFantasia: settings.business_name = data.nomeFantasia
    if data.cnpj: settings.cnpj = data.cnpj
    if data.emailContato: settings.email_contact = data.emailContato
    if data.telefoneContato: settings.phone_contact = data.telefoneContato

    if data.endereco:
        addr = data.endereco
        settings.cep = addr.get("cep")
        settings.logradouro = addr.get("logradouro") or addr.get("rua")
        settings.numero = addr.get("numero")
        settings.complemento = addr.get("complemento")
        settings.bairro = addr.get("bairro")
        settings.cidade = addr.get("cidade")
        settings.estado = addr.get("estado")

    if data.site: settings.website = data.site
    if data.logoUrl: settings.logo_url = data.logoUrl
    if data.nfseAtivo is not None: settings.nfse_active = data.nfseAtivo
    if data.inscricaoMunicipal: settings.municipal_registration = data.inscricaoMunicipal
    if data.pix_key: settings.pix_key = data.pix_key

    db.commit()
    return {"message": "Configurações atualizadas", "success": True}

# ============= CATALOGS =============

@router.get("/catalogos/marcas")
async def get_marcas():
    return [
        {"id": 1, "nome": "Carrier"}, {"id": 2, "nome": "LG"},
        {"id": 3, "nome": "Samsung"}, {"id": 4, "nome": "Daikin"},
        {"id": 5, "nome": "Midea"}, {"id": 6, "nome": "Electrolux"},
        {"id": 7, "nome": "Consul"}, {"id": 8, "nome": "Springer"},
        {"id": 9, "nome": "Fujitsu"}, {"id": 10, "nome": "Hitachi"}
    ]

@router.get("/catalogos/tipos-equipamento")
async def get_tipos_equipamento():
    return [
        {"id": 1, "nome": "Split"}, {"id": 2, "nome": "Janela"},
        {"id": 3, "nome": "Cassete"}, {"id": 4, "nome": "Piso Teto"},
        {"id": 5, "nome": "Multi Split"}, {"id": 6, "nome": "VRF"},
        {"id": 7, "nome": "Chiller"}, {"id": 8, "nome": "Fan Coil"}
    ]

# ============= NOTIFICATIONS =============

@router.get("/sistema/notificacoes")
async def get_notificacoes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return notifs

@router.patch("/sistema/notificacoes/{notif_id}/read")
async def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from notification_service import mark_notification_as_read
    success = mark_notification_as_read(db, notif_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    return {"message": "Notificação lida"}

@router.patch("/sistema/notificacoes/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from notification_service import mark_all_notifications_as_read
    count = mark_all_notifications_as_read(db, current_user.id)
    return {"message": f"{count} notificações lidas"}

# ============= HEALTH =============

@router.get("/health/simple")
async def get_health_simple():
    return {"status": "ok"}

@router.get("/test-cpf")
def test_cpf():
    from validators import cpf_validator
    gen = cpf_validator.generate()
    val = cpf_validator.validate(gen)
    return {"generated": gen, "valid": val}

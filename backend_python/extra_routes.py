from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Notification, User
from auth import get_current_user
from redis_utils import get_cache, set_cache, delete_cache
import logging
import os
import json

logger = logging.getLogger(__name__)

router = APIRouter()

from models import Company
from pydantic import BaseModel

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None # ativa, pendente, bloqueada
    nfse_active: Optional[bool] = None

# ============= EMPRESA DATA FILE PERSISTENCE (for super_admin without company_id) =============
EMPRESA_ADMIN_FILE = "empresa_admin.json"

def load_empresa_admin():
    if not os.path.exists(EMPRESA_ADMIN_FILE):
        return None
    try:
        with open(EMPRESA_ADMIN_FILE, "r") as f:
            return json.load(f)
    except:
        return None

def save_empresa_admin(data: dict):
    with open(EMPRESA_ADMIN_FILE, "w") as f:
        json.dump(data, f, indent=2)

@router.get("/empresas/me")
async def get_empresa_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.company_id:
        from models import Company
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company:
            return {
                "id": company.id,
                # Both camelCase and snake_case for frontend compatibility
                "nomeFantasia": company.name,
                "nome_fantasia": company.name,
                "cnpj": company.cnpj or "",
                "email": getattr(company, 'email', '') or "",
                "emailContato": getattr(company, 'email', '') or "",
                "email_contato": getattr(company, 'email', '') or "",
                "telefone": getattr(company, 'phone', '') or "",
                "telefoneContato": getattr(company, 'phone', '') or "",
                "telefone_contato": getattr(company, 'phone', '') or "",
                "endereco": getattr(company, 'address', '') or "",
                "enderecoCompleto": getattr(company, 'address', '') or "",
                "endereco_completo": getattr(company, 'address', '') or "",
                "site": getattr(company, 'website', '') or "",
                "inscricaoEstadual": getattr(company, 'state_registration', '') or "",
                "inscricao_estadual": getattr(company, 'state_registration', '') or "",
                "logoUrl": getattr(company, 'logo_url', '') or "",
                "logo_url": getattr(company, 'logo_url', '') or "",
                # Fiscal
                "nfseAtivo": getattr(company, 'nfse_active', False),
                "certificadoNome": getattr(company, 'certificate_name', '') or "",
                "inscricaoMunicipal": getattr(company, 'municipal_registration', '') or "",
                "codigoServico": getattr(company, 'service_code', '14.01') or "14.01",
                "aliquotaISS": getattr(company, 'iss_rate', '2.00') or "2.00",
                "ambienteFiscal": getattr(company, 'fiscal_environment', 'homologacao') or "homologacao"
            }
    # For super_admin or when no company - use file-based storage
    file_data = load_empresa_admin()
    if file_data:
        return file_data
    
    # Default if no saved data
    return {
        "id": 1,
        "nomeFantasia": "Inovar Refrigeração",
        "nome_fantasia": "Inovar Refrigeração",
        "cnpj": "",
        "email": "",
        "emailContato": "",
        "email_contato": "",
        "telefone": "",
        "telefoneContato": "",
        "telefone_contato": "",
        "endereco": "",
        "enderecoCompleto": "",
        "endereco_completo": "",
        "site": "",
        "inscricaoEstadual": "",
        "inscricao_estadual": "",
        "logoUrl": "",
        "logo_url": "",
        "nfseAtivo": False,
        "certificadoNome": "",
        "inscricaoMunicipal": "",
        "codigoServico": "14.01",
        "aliquotaISS": "2.00",
        "ambienteFiscal": "homologacao"
    }

class EmpresaUpdate(BaseModel):
    # Accept both camelCase and snake_case from frontend
    nomeFantasia: Optional[str] = None
    nome_fantasia: Optional[str] = None
    name: Optional[str] = None
    cnpj: Optional[str] = None
    email: Optional[str] = None
    emailContato: Optional[str] = None
    telefone: Optional[str] = None
    telefoneContato: Optional[str] = None
    phone: Optional[str] = None
    endereco: Optional[str] = None
    enderecoCompleto: Optional[str] = None
    address: Optional[str] = None
    site: Optional[str] = None
    inscricaoEstadual: Optional[str] = None
    logoUrl: Optional[str] = None
    logo_url: Optional[str] = None
    # Fiscal fields
    nfseAtivo: Optional[bool] = None
    certificadoNome: Optional[str] = None
    inscricaoMunicipal: Optional[str] = None
    codigoServico: Optional[str] = None
    aliquotaISS: Optional[str] = None
    ambienteFiscal: Optional[str] = None

@router.put("/empresas/me")
async def update_empresa_me(data: EmpresaUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.company_id:
        from models import Company
        company = db.query(Company).filter(Company.id == current_user.company_id).first()
        if company:
            # Name
            name = data.nomeFantasia or data.nome_fantasia or data.name
            if name: company.name = name
            
            # Basic info
            if data.cnpj: company.cnpj = data.cnpj
            
            email = data.email or data.emailContato
            if email: company.email = email
            
            phone = data.telefone or data.telefoneContato or data.phone
            if phone: company.phone = phone
            
            address = data.endereco or data.enderecoCompleto or data.address
            if address: company.address = address
            
            if data.site: company.website = data.site
            if data.inscricaoEstadual: company.state_registration = data.inscricaoEstadual
            
            logo = data.logoUrl or data.logo_url
            if logo: company.logo_url = logo
            
            # Fiscal fields - Always update, columns exist in model
            if data.nfseAtivo is not None: company.nfse_active = data.nfseAtivo
            if data.certificadoNome: company.certificate_name = data.certificadoNome
            if data.inscricaoMunicipal: company.municipal_registration = data.inscricaoMunicipal
            if data.codigoServico: company.service_code = data.codigoServico
            if data.aliquotaISS: company.iss_rate = data.aliquotaISS
            if data.ambienteFiscal: company.fiscal_environment = data.ambienteFiscal
            
            db.commit()
            return {"message": "Empresa atualizada", "success": True}
    
    # For super_admin without company_id - save to file
    empresa_data = {
        "id": 1,
        "nomeFantasia": data.nomeFantasia or data.nome_fantasia or data.name or "",
        "nome_fantasia": data.nomeFantasia or data.nome_fantasia or data.name or "",
        "cnpj": data.cnpj or "",
        "email": data.email or data.emailContato or "",
        "emailContato": data.email or data.emailContato or "",
        "email_contato": data.email or data.emailContato or "",
        "telefone": data.telefone or data.telefoneContato or data.phone or "",
        "telefoneContato": data.telefone or data.telefoneContato or data.phone or "",
        "telefone_contato": data.telefone or data.telefoneContato or data.phone or "",
        "endereco": data.endereco or data.enderecoCompleto or data.address or "",
        "enderecoCompleto": data.endereco or data.enderecoCompleto or data.address or "",
        "endereco_completo": data.endereco or data.enderecoCompleto or data.address or "",
        "site": data.site or "",
        "inscricaoEstadual": data.inscricaoEstadual or "",
        "inscricao_estadual": data.inscricaoEstadual or "",
        "logoUrl": data.logoUrl or data.logo_url or "",
        "logo_url": data.logoUrl or data.logo_url or "",
        "nfseAtivo": data.nfseAtivo if data.nfseAtivo is not None else False,
        "certificadoNome": data.certificadoNome or "",
        "inscricaoMunicipal": data.inscricaoMunicipal or "",
        "codigoServico": data.codigoServico or "14.01",
        "aliquotaISS": data.aliquotaISS or "2.00",
        "ambienteFiscal": data.ambienteFiscal or "homologacao"
    }
    
    # Merge with existing data to preserve fields not sent
    existing = load_empresa_admin() or {}
    for key, value in empresa_data.items():
        if value:  # Only update if value is not empty
            existing[key] = value
    
    save_empresa_admin(existing)
    return {"message": "Empresa atualizada", "success": True}

@router.get("/empresas")
def get_companies(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    companies = db.query(Company).offset(skip).limit(limit).all()
    
    # Return list with status from model
    result = []
    for c in companies:
        result.append({
            "id": c.id,
            "name": c.name,
            "cnpj": c.cnpj,
            "email": c.email or c.email_contact,
            "phone": c.phone or c.phone_contact,
            "nfse_active": c.nfse_active,
            "status": c.status or "ativa"
        })
    return result
    
@router.post("/empresas")
def create_company_stub():
    """
    Stub to handle POST /empresas if frontend attempts it.
    Real company creation should go through /auth/register-company.
    """
    raise HTTPException(status_code=405, detail="Use /api/auth/register-company to create a new company.")

@router.put("/empresas/{company_id}")
def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if data.name: company.name = data.name
    if data.email: company.email = data.email
    if data.phone: company.phone = data.phone
    if data.nfse_active is not None: company.nfse_active = data.nfse_active
    if data.status: company.status = data.status
    
    db.commit()
    db.refresh(company)
    return company

# Stubs to stop 404 errors and allow frontend navigation

# QR Codes CRUD (In-memory for now, or simple file based)
QRCODES_FILE = "qrcodes.json"

class QRCodeData(BaseModel):
    id: Optional[str] = None
    empresaId: Optional[str] = None
    nome: str
    tipo: str
    destino: str
    cor: str
    corFundo: str
    logoBase64: Optional[str] = None
    tamanho: int
    mensagem: Optional[str] = None
    textoRodape: Optional[str] = None
    ssid: Optional[str] = None
    senha: Optional[str] = None
    chavePix: Optional[str] = None
    valorPix: Optional[float] = None
    criadoEm: Optional[str] = None

def load_qrcodes():
    if not os.path.exists(QRCODES_FILE):
        return []
    try:
        with open(QRCODES_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_qrcodes(data):
    with open(QRCODES_FILE, "w") as f:
        json.dump(data, f, indent=2)

@router.get("/qrcodes")
async def get_qrcodes():
    cache_key = "qrcodes:list"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    result = load_qrcodes()
    set_cache(cache_key, result, ttl_seconds=120)
    return result

@router.post("/qrcodes")
async def create_qrcode(data: QRCodeData):
    qrcodes = load_qrcodes()
    import uuid
    data.id = str(uuid.uuid4())
    data.criadoEm = datetime.now().isoformat()
    qrcodes.append(data.dict())
    save_qrcodes(qrcodes)
    delete_cache("qrcodes:list")
    return data

@router.get("/qrcodes/{id}")
async def get_qrcode(id: str):
    qrcodes = load_qrcodes()
    for qr in qrcodes:
        if qr["id"] == id:
            return qr
    raise HTTPException(status_code=404, detail="QR Code não encontrado")

@router.put("/qrcodes/{id}")
async def update_qrcode(id: str, data: QRCodeData):
    qrcodes = load_qrcodes()
    for i, qr in enumerate(qrcodes):
        if qr["id"] == id:
            data.id = id # Ensure ID matches
            data.criadoEm = qr.get("criadoEm") # Preserve creation date
            qrcodes[i] = data.dict()
            save_qrcodes(qrcodes)
            delete_cache("qrcodes:list")
            return data
    raise HTTPException(status_code=404, detail="QR Code não encontrado")

@router.delete("/qrcodes/{id}")
async def delete_qrcode(id: str):
    qrcodes = load_qrcodes()
    new_list = [qr for qr in qrcodes if qr["id"] != id]
    if len(new_list) == len(qrcodes):
        raise HTTPException(status_code=404, detail="QR Code não encontrado")
    save_qrcodes(new_list)
    delete_cache("qrcodes:list")
    return {"message": "QR Code removido"}


@router.post("/empresas/certificado")
async def upload_certificado():
    return {"message": "Certificado enviado com sucesso"}

# Catálogos
@router.get("/catalogos/marcas")
async def get_marcas():
    return [
        {"id": 1, "nome": "Carrier"},
        {"id": 2, "nome": "LG"},
        {"id": 3, "nome": "Samsung"},
        {"id": 4, "nome": "Daikin"},
        {"id": 5, "nome": "Midea"},
        {"id": 6, "nome": "Electrolux"},
        {"id": 7, "nome": "Consul"},
        {"id": 8, "nome": "Springer"},
        {"id": 9, "nome": "Fujitsu"},
        {"id": 10, "nome": "Hitachi"}
    ]

@router.get("/catalogos/tipos-equipamento")
async def get_tipos_equipamento():
    return [
        {"id": 1, "nome": "Split"},
        {"id": 2, "nome": "Janela"},
        {"id": 3, "nome": "Cassete"},
        {"id": 4, "nome": "Piso Teto"},
        {"id": 5, "nome": "Multi Split"},
        {"id": 6, "nome": "VRF"},
        {"id": 7, "nome": "Chiller"},
        {"id": 8, "nome": "Fan Coil"}
    ]

# Removed conflicting /whatsapp/instances stub


@router.api_route("/health/simple", methods=["GET", "HEAD"])
async def get_health_simple():
    """Simple health check - detailed checks at /api/health in main.py"""
    return {"status": "ok", "service": "extra_routes"}

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
    """Marca uma notificação como lida"""
    from notification_service import mark_notification_as_read
    
    success = mark_notification_as_read(db, notif_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    return {"message": "Notificação marcada como lida"}

@router.patch("/sistema/notificacoes/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Marca todas as notificações como lidas"""
    from notification_service import mark_all_notifications_as_read
    
    count = mark_all_notifications_as_read(db, current_user.id)
    return {"message": f"{count} notificações marcadas como lidas"}

@router.options("/{rest_of_path:path}")
async def preflight_handler():
    return {}

# Simple file-based persistence for payment config
import json
import os

PAYMENT_CONFIG_FILE = "payment_config.json"

class PaymentConfig(BaseModel):
    tipo_chave: str
    chave_pix: str
    nome_beneficiario: str

def load_payment_config(company_id: int):
    if not os.path.exists(PAYMENT_CONFIG_FILE):
        return {}
    try:
        with open(PAYMENT_CONFIG_FILE, "r") as f:
            data = json.load(f)
            return data.get(str(company_id), {})
    except:
        return {}

def save_payment_config(company_id: int, config: dict):
    data = {}
    if os.path.exists(PAYMENT_CONFIG_FILE):
        try:
            with open(PAYMENT_CONFIG_FILE, "r") as f:
                data = json.load(f)
        except:
            data = {}
    
    data[str(company_id)] = config
    
    with open(PAYMENT_CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)

@router.get("/pagamentos/config/{company_id}")
async def get_pagamentos_config(company_id: int):
    config = load_payment_config(company_id)
    if config:
        return config
    # Default/Fallback
    return {"status": "active", "provider": "stripe", "tipo_chave": "cpf", "chave_pix": "", "nome_beneficiario": ""}

@router.post("/pagamentos/config/{company_id}")
async def save_pagamentos_config(company_id: int, config: PaymentConfig):
    save_payment_config(company_id, config.dict())
    return {"status": "success", "message": "Configuração salva com sucesso"}



from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import ServiceOrder, ItemOS, User, Client, Location, Equipment

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

from auth import get_current_user, get_operational_user
from pix_utils import generate_pix_payload
from pdf_utils import generate_os_pdf
from fastapi.responses import Response

# Schemas

class ItemOSSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    descricao: str = Field(..., alias="descricao_tarefa")
    quantidade: float = 1.0
    valor_unitario: float = 0.0
    status: str = Field("pendente", alias="status_item")

class ServiceOrderBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    titulo: str = Field(..., validation_alias="title")
    status: str = "aberto"
    priority: str = "media"
    service_type: str = "corretiva"
    description: Optional[str] = None
    cliente_id: int = Field(..., validation_alias="client_id")
    local_id: Optional[int] = Field(None, validation_alias="location_id")
    equipment_id: Optional[int] = None
    agendado_para: Optional[str] = Field(None, validation_alias="scheduled_at")

class ServiceOrderCreate(ServiceOrderBase):
    itens: List[ItemOSSchema] = []

class ServiceOrderResponse(ServiceOrderBase):
    id: int
    sequential_id: int
    created_at: datetime
    valor_total: float
    client_name: Optional[str] = None
    location_name: Optional[str] = None
    technician_name: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

# Routes
@router.get("/solicitacoes", response_model=List[ServiceOrderResponse])
async def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    # Try cache first
    cache_key = "orders:list:all"
    cached_data = get_cache(cache_key)
    if cached_data:
        return cached_data

    orders = db.query(ServiceOrder).options(
        joinedload(ServiceOrder.client),
        joinedload(ServiceOrder.location),
        joinedload(ServiceOrder.user)
    ).order_by(ServiceOrder.created_at.desc()).all()
    
    # Manual mapping
    result = [
        {
            "id": o.id,
            "sequential_id": o.sequential_id,
            "titulo": o.title,
            "status": o.status,
            "priority": o.priority,
            "service_type": o.service_type,
            "description": o.description,
            "cliente_id": o.client_id,
            "local_id": o.location_id,
            "equipment_id": o.equipment_id,
            "scheduled_at": o.scheduled_at.isoformat() if o.scheduled_at else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "valor_total": o.valor_total,
            "client_name": o.client.name if o.client else None,
            "location_name": o.location.nickname if o.location else None,
            "technician_name": o.user.full_name if o.user else None
        }
        for o in orders
    ]
    
    # Cache for 60 seconds
    set_cache(cache_key, result, ttl_seconds=60)
    return result

@router.get("/meus-servicos", response_model=List[ServiceOrderResponse])
def list_my_orders(current_user: User = Depends(get_operational_user), db: Session = Depends(get_db)):
    orders = db.query(ServiceOrder).filter(ServiceOrder.user_id == current_user.id).options(
        joinedload(ServiceOrder.client),
        joinedload(ServiceOrder.location),
        joinedload(ServiceOrder.user)
    ).order_by(ServiceOrder.created_at.desc()).all()
    return [
        {
            "id": o.id,
            "sequential_id": o.sequential_id,
            "titulo": o.title,
            "status": o.status,
            "priority": o.priority,
            "service_type": o.service_type,
            "description": o.description,
            "cliente_id": o.client_id,
            "local_id": o.location_id,
            "equipment_id": o.equipment_id,
            "scheduled_at": o.scheduled_at.isoformat() if o.scheduled_at else None,
            "created_at": o.created_at,
            "valor_total": o.valor_total,
            "client_name": o.client.name if o.client else None,
            "location_name": o.location.nickname if o.location else None,
            "technician_name": o.user.full_name if o.user else None
        }
        for o in orders
    ]

@router.post("/solicitacoes", response_model=ServiceOrderResponse)
async def create_order(
    order: ServiceOrderCreate, 
    current_user: User = Depends(get_operational_user), 
    db: Session = Depends(get_db)
):
    # Sequential ID
    max_id = db.query(func.max(ServiceOrder.sequential_id)).scalar()
    sequential_id = (max_id or 100) + 1 # Start from 101 or similar

    db_order = ServiceOrder(
        title=order.titulo,
        status=order.status,
        priority=order.priority,
        service_type=order.service_type,
        description=order.description,
        client_id=order.cliente_id,
        location_id=order.local_id,
        equipment_id=order.equipment_id,
        user_id=current_user.id,
        sequential_id=sequential_id
    )

    if order.agendado_para:
        try:
            db_order.scheduled_at = datetime.fromisoformat(order.agendado_para.replace('Z', ''))
        except:
            pass

    db.add(db_order)
    db.flush()

    total_value = 0
    for item in order.itens:
        v_total = item.quantidade * item.valor_unitario
        db_item = ItemOS(
            solicitacao_id=db_order.id,
            descricao_tarefa=item.descricao,
            quantidade=item.quantidade,
            valor_unitario=item.valor_unitario,
            valor_total=v_total,
            status_item=item.status
        )
        db.add(db_item)
        total_value += v_total

    db_order.valor_total = total_value
    db.commit()
    db.refresh(db_order)
    
    # Invalidate Cache
    delete_cache("orders:list:all")
    delete_cache(f"dashboard:prestador:v5") # Invalidate dashboard cache too
    
    # Real-time Broadcast
    try:
        from websocket_manager import manager
        await manager.broadcast({
            "type": "new_order",
            "data": {
                "id": db_order.id,
                "sequential_id": db_order.sequential_id,
                "titulo": db_order.title,
                "status": db_order.status,
                "client_name": db_order.client.name if db_order.client else "Cliente"
            }
        })
    except Exception as e:
        logger.error(f"Failed to broadcast new order: {e}")

    return {
        "id": db_order.id,
        "sequential_id": db_order.sequential_id,
        "titulo": db_order.title,
        "status": db_order.status,
        "priority": db_order.priority,
        "service_type": db_order.service_type,
        "description": db_order.description,
        "cliente_id": db_order.client_id,
        "local_id": db_order.location_id,
        "equipment_id": db_order.equipment_id,
        "scheduled_at": db_order.scheduled_at.isoformat() if db_order.scheduled_at else None,
        "created_at": db_order.created_at,
        "valor_total": db_order.valor_total
    }

@router.get("/solicitacoes/{order_id}")
def get_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    from models import SystemSettings
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()

    # Rich response with all fields for DetalhesSolicitacao.tsx
    # Rich response with all fields for DetalhesSolicitacao.tsx and Documents
    return {
        "id": order.id,
        "sequential_id": order.sequential_id,
        "titulo": order.title,
        "status": order.status,
        "priority": order.priority,
        "service_type": order.service_type,
        "description": order.description,
        "descricao_detalhada": order.descricao_detalhada,
        "technical_report": order.relatorio_tecnico,
        "created_at": order.created_at,
        "scheduled_at": order.scheduled_at.isoformat() if order.scheduled_at else None,
        "valor_total": order.valor_total,
        "client_signature": order.assinatura_cliente,
        "tech_signature": order.assinatura_tecnico,
        "tecnico": {
            "id": order.user.id,
            "nome": order.user.full_name,
            "email": order.user.email,
            "telefone": order.user.phone,
            "cpf": order.user.cpf
        } if order.user else None,
        "cliente": {
            "id": order.client.id,
            "nome": order.client.name,
            "telefone": order.client.phone,
            "email": order.client.email,
            "documento": order.client.document # CPF or CNPJ
        },
        "local": {
            "id": order.location.id,
            "nickname": order.location.nickname,
            "address": order.location.address,
            "city": order.location.city,
            "state": order.location.state,
            "cep": order.location.zip_code,
            "logradouro": order.location.address, # Assuming address field holds logradouro
            "numero": order.location.street_number,
            "complemento": order.location.complement,
            "bairro": order.location.neighborhood
        } if order.location else None,
        "equipamento": {
            "id": order.equipment.id,
            "nome": order.equipment.name,
            "marca": order.equipment.brand,
            "modelo": order.equipment.model,
            "numero_serie": order.equipment.serial_number,
            "tipo": order.equipment.equipment_type,
            "data_instalacao": order.equipment.installation_date.isoformat() if order.equipment.installation_date else None
        } if order.equipment else None,
        "itens": [
            {
                "id": i.id,
                "descricao": i.descricao_tarefa,
                "quantidade": i.quantidade,
                "valor_unitario": i.valor_unitario,
                "valor_total": i.valor_total,
                "status": i.status_item
            }
            for i in order.itens_os
        ],
        "fotos": [
            {
                "id": f.get("id"),
                "url": f.get("url") or f.get("image_url"),
                "description": f.get("description")
            }
            for f in (order.fotos_os if order.fotos_os and isinstance(order.fotos_os, list) else [])
        ],
        "historico": order.historico_json if order.historico_json else [],
        "nfse": order.nfse_json,
        "empresa": {
            "nome_fantasia": settings.business_name if settings else "Inovar Refrigeração",
            "cnpj": settings.cnpj if settings else None,
            "email": settings.email_contact if settings else None,
            "telefone": settings.phone_contact if settings else None,
            "endereco": {
                "cep": settings.cep,
                "logradouro": settings.logradouro,
                "numero": settings.numero,
                "complemento": settings.complemento,
                "bairro": settings.bairro,
                "cidade": settings.cidade,
                "estado": settings.estado
            } if settings and (settings.cep or settings.logradouro) else None
        }
    }

@router.get("/solicitacoes/{order_id}/pdf")
def get_order_pdf(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    from models import SystemSettings
    order_data = get_order(order_id, db, current_user) # Pass current_user
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()

    settings_dict = {
        "business_name": settings.business_name if settings else "Inovar Refrigeração",
        "email_contact": settings.email_contact if settings else "",
        "phone_contact": settings.phone_contact if settings else "",
        "logradouro": settings.logradouro if settings else "",
        "numero": settings.numero if settings else "",
        "cidade": settings.cidade if settings else "",
        "estado": settings.estado if settings else ""
    }

    pdf_content = generate_os_pdf(order_data, settings_dict)
    if not pdf_content:
        raise HTTPException(status_code=500, detail="Erro ao gerar PDF")

    filename = f"OS_{order_data.get('sequential_id')}.pdf"
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/solicitacoes/{order_id}/pix")
def get_order_pix(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    from models import SystemSettings
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings or not settings.pix_key:
        raise HTTPException(status_code=400, detail="Chave PIX não configurada na empresa")

    pix_payload = generate_pix_payload(
        chave_pix=settings.pix_key,
        valor=order.valor_total,
        nome_recebedor=settings.business_name,
        cidade_recebedor=settings.cidade or "SAO PAULO",
        txt_id=f"OS{order.sequential_id}"
    )

    if not pix_payload:
        raise HTTPException(status_code=500, detail="Erro ao gerar payload PIX")

    return {"pix_payload": pix_payload}

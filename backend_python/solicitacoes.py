from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import ServiceOrder, ItemOS, User, Client, Location, Equipment
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

from auth import get_current_user

# Schemas
class ItemOSSchema(BaseModel):
    descricao: str = Field(..., alias="descricao_tarefa")
    quantidade: float = 1.0
    valor_unitario: float = 0.0
    status: str = Field("pendente", alias="status_item")

class ServiceOrderBase(BaseModel):
    titulo: str
    status: str = "aberto"
    priority: str = "media"
    service_type: str = "corretiva"
    description: Optional[str] = None
    cliente_id: int
    local_id: Optional[int] = None
    equipment_id: Optional[int] = None
    agendado_para: Optional[str] = Field(None, alias="scheduled_at")

class ServiceOrderCreate(ServiceOrderBase):
    itens: List[ItemOSSchema] = []

class ServiceOrderResponse(ServiceOrderBase):
    id: int
    sequential_id: int
    created_at: datetime
    valor_total: float

    class Config:
        from_attributes = True

# Routes
@router.get("/solicitacoes", response_model=List[ServiceOrderResponse])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(ServiceOrder).all()
    # Manual mapping for response to match keys in ServiceOrderResponse
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
            "valor_total": o.valor_total
        }
        for o in orders
    ]

@router.post("/solicitacoes", response_model=ServiceOrderResponse)
def create_order(order: ServiceOrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    # Rich response with all fields for DetalhesSolicitacao.tsx
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
        "cliente": {
            "id": order.client.id,
            "nome": order.client.name,
            "telefone": order.client.phone,
            "email": order.client.email
        },
        "local": {
            "id": order.location.id,
            "nickname": order.location.nickname,
            "address": order.location.address,
            "city": order.location.city,
            "state": order.location.state
        } if order.location else None,
        "equipamento": {
            "id": order.equipment.id,
            "nome": order.equipment.name,
            "marca": order.equipment.brand,
            "modelo": order.equipment.model
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
        "nfse": order.nfse_json
    }

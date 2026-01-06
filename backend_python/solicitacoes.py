from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import logging

from database import get_db
from models import ServiceOrder, User, Client, ItemOS, Equipment
from auth import get_current_user
from auth import get_current_user
from redis_utils import get_cache, set_cache, delete_cache

logger = logging.getLogger(__name__)

router = APIRouter()

# Schemas (Pydantic models for response)
class EquipmentSimpleResponse(BaseModel):
    id: int
    nome: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None

    class Config:
        from_attributes = True

class ItemOSResponse(BaseModel):
    id: int
    solicitacao_id: int
    equipamento_id: Optional[int] = None
    equipamentos: Optional[EquipmentSimpleResponse] = Field(None, alias="equipamentos")
    descricao_tarefa: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    status_item: str
    observacao_tecnica: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

class ClientSimpleResponse(BaseModel):
    id: int
    nome: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None

    class Config:
        from_attributes = True

class TechnicianSimpleResponse(BaseModel):
    id: int
    full_name: str = Field(..., alias="nome_completo")
    nome_completo: str = Field(..., alias="full_name")
    email: str
    cargo: str
    phone: Optional[str] = Field(None, alias="telefone")
    telefone: Optional[str] = Field(None, alias="phone")

    class Config:
        from_attributes = True
        populate_by_name = True

class ServiceOrderResponse(BaseModel):
    id: int
    sequential_id: Optional[int] = None
    numero: Optional[int] = Field(None, alias="sequential_id")
    status: str
    description: Optional[str] = None
    descricao_detalhada: Optional[str] = None
    descricao_orcamento: Optional[str] = None
    relatorio_tecnico: Optional[str] = None
    created_at: datetime
    criado_em: datetime = Field(..., alias="created_at")
    criadoEm: datetime = Field(..., alias="created_at")
    total_value: float
    valor_total: float = Field(0.0, alias="total_value")
    client_id: int
    technician_id: Optional[int] = None
    client_name: Optional[str] = None
    technician_name: Optional[str] = None
    title: Optional[str] = None
    titulo: Optional[str] = Field(None, alias="title")
    priority: Optional[str] = None
    prioridade: Optional[str] = Field(None, alias="priority")
    
    # Nested objects for frontend
    clientes: Optional[ClientSimpleResponse] = None
    tecnicos: Optional[TechnicianSimpleResponse] = None
    itens_os: List[ItemOSResponse] = []
    fotos_os: Optional[List[dict]] = []
    historico_json: Optional[List[dict]] = []
    
    # Flags
    orcamento_disponivel: bool = False
    relatorio_disponivel: bool = False
    
    # Dates
    data_agendamento_inicio: Optional[datetime] = None
    data_inicio_real: Optional[datetime] = None
    data_fim_real: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True

@router.get("/solicitacoes")
def get_solicitacoes(
    page: int = 1, 
    page_size: int = 20,
    status: Optional[str] = None,
    prioridade: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista solicitações com paginação e filtros.
    
    Params:
    - page: Página atual (default: 1)
    - page_size: Itens por página (default: 20, max: 100)
    - status: Filtrar por status (aberto, agendado, em_andamento, concluido)
    - prioridade: Filtrar por prioridade (baixa, media, alta, urgente)
    - data_inicio: Filtrar OS criadas após esta data (YYYY-MM-DD)
    - data_fim: Filtrar OS criadas até esta data (YYYY-MM-DD)
    """
    # Validação de page_size
    if page_size > 100:
        page_size = 100
    if page_size < 1:
        page_size = 20
    if page < 1:
        page = 1
    
    # Cache key based on all parameters
    cache_key = f"solicitacoes:list:{current_user.company_id}:{page}:{page_size}:{status}:{prioridade}:{data_inicio}:{data_fim}"
    cached = get_cache(cache_key)
    if cached:
        logger.debug("Cache HIT: solicitacoes")
        return cached
    
    query = db.query(ServiceOrder)
    
    # Filtro por empresa (REMOVIDO - Single Tenant)
    # if current_user.role != "super_admin":
    #    query = query.filter(ServiceOrder.company_id == current_user.company_id)
    
    # Filtro por status
    if status:
        query = query.filter(ServiceOrder.status == status)
    
    # Filtro por prioridade
    if prioridade:
        query = query.filter(ServiceOrder.priority == prioridade)
    
    # Filtro por data
    if data_inicio:
        try:
            dt_inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
            query = query.filter(ServiceOrder.created_at >= dt_inicio)
        except ValueError:
            pass
    
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d")
            # Incluir o dia inteiro
            dt_fim = dt_fim.replace(hour=23, minute=59, second=59)
            query = query.filter(ServiceOrder.created_at <= dt_fim)
        except ValueError:
            pass
    
    # Contagem total para paginação
    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    # Aplicar paginação (skip/limit)
    skip = (page - 1) * page_size
    orders = query.order_by(ServiceOrder.created_at.desc()).offset(skip).limit(page_size).all()
    
    # Convert to dict for caching
    items = []
    for o in orders:
        clientes = None
        if o.client:
            clientes = {
                "id": o.client.id,
                "nome": o.client.name,
                "email": o.client.email,
                "telefone": o.client.phone,
                "endereco": o.client.address,
                "cpf": o.client.document if len(o.client.document or "") <= 14 else None,
                "cnpj": o.client.document if len(o.client.document or "") > 14 else None
            }
        
        tecnicos = None
        if o.technician:
            tecnicos = {
                "id": o.technician.id,
                "full_name": o.technician.full_name,
                "nome_completo": o.technician.full_name,
                "email": o.technician.email,
                "cargo": o.technician.role,
                "phone": o.technician.phone,
                "telefone": o.technician.phone
            }
            
        items.append({
            "id": o.id,
            "sequential_id": o.sequential_id,
            "status": o.status,
            "description": o.description,
            "title": o.title,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "criado_em": o.created_at.isoformat() if o.created_at else None,
            "criadoEm": o.created_at.isoformat() if o.created_at else None,
            "total_value": float(o.total_value) if o.total_value else 0.0,
            "valor_total": float(o.valor_total) if o.valor_total else 0.0,
            "client_id": o.client_id,
            "technician_id": o.technician_id,
            "client_name": o.client.name if o.client else "Cliente Removido",
            "technician_name": o.technician.full_name if o.technician else None,
            "clientes": clientes,
            "tecnicos": tecnicos,
            "prioridade": o.priority,
            "priority": o.priority
        })
    
    result = {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }
    
    set_cache(cache_key, result, ttl_seconds=60)  # 1 minute cache
    return result


@router.get("/solicitacoes/{order_id}", response_model=ServiceOrderResponse)
def get_solicitacao(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ServiceOrder).filter(ServiceOrder.id == order_id)
    
    if current_user.role != "super_admin":
        # query = query.filter(ServiceOrder.company_id == current_user.company_id)
        pass
        
    order = query.first()
    if not order:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    # Prepare nested objects
    clientes = None
    if order.client:
        clientes = {
            "id": order.client.id,
            "nome": order.client.name,
            "email": order.client.email,
            "telefone": order.client.phone,
            "endereco": order.client.address,
            "cpf": order.client.document if len(order.client.document or "") <= 14 else None,
            "cnpj": order.client.document if len(order.client.document or "") > 14 else None
        }
    
    tecnicos = None
    if order.technician:
        tecnicos = {
            "id": order.technician.id,
            "full_name": order.technician.full_name,
            "nome_completo": order.technician.full_name,
            "email": order.technician.email,
            "cargo": order.technician.role,
            "phone": order.technician.phone,
            "telefone": order.technician.phone
        }
    
    itens_os = []
    for item in order.itens_os:
        equip = None
        if item.equipment:
            equip = {
                "id": item.equipment.id,
                "nome": item.equipment.name,
                "marca": item.equipment.brand,
                "modelo": item.equipment.model,
                "numero_serie": item.equipment.serial_number
            }
        
        itens_os.append({
            "id": item.id,
            "solicitacao_id": item.solicitacao_id,
            "equipamento_id": item.equipamento_id,
            "equipamentos": equip,
            "descricao_tarefa": item.descricao_tarefa,
            "quantidade": item.quantidade,
            "valor_unitario": item.valor_unitario,
            "valor_total": item.valor_total,
            "status_item": item.status_item,
            "observacao_tecnica": item.observacao_tecnica,
            "created_at": item.created_at
        })

    return {
        "id": order.id,
        "sequential_id": order.sequential_id,
        "status": order.status,
        "description": order.description,
        "descricao_detalhada": order.descricao_detalhada,
        "descricao_orcamento": order.descricao_orcamento,
        "relatorio_tecnico": order.relatorio_tecnico,
        "title": order.title,
        "created_at": order.created_at,
        "criado_em": order.created_at,
        "criadoEm": order.created_at,
        "total_value": order.total_value,
        "valor_total": order.valor_total,
        "client_id": order.client_id,
        "technician_id": order.technician_id,
        "client_name": order.client.name if order.client else None,
        "technician_name": order.technician.full_name if order.technician else None,
        "clientes": clientes,
        "tecnicos": tecnicos,
        "itens_os": itens_os,
        "fotos_os": order.fotos_os or [],
        "historico_json": order.historico_json or [],
        "orcamento_disponivel": order.orcamento_disponivel,
        "relatorio_disponivel": order.relatorio_disponivel,
        "data_agendamento_inicio": order.data_agendamento_inicio,
        "data_inicio_real": order.data_inicio_real,
        "data_fim_real": order.data_fim_real,
        "prioridade": order.priority,
        "priority": order.priority
    }

# CRUD Operations

class ItemOSCreate(BaseModel):
    equipamento_id: Optional[int] = Field(None, alias="equipamento_id")
    descricao_tarefa: str = Field(..., alias="descricao_tarefa")
    quantidade: Optional[float] = Field(1.0, alias="quantidade")
    valor_unitario: Optional[float] = Field(0.0, alias="valor_unitario")
    status_item: Optional[str] = Field("pendente", alias="status_item")

    class Config:
        populate_by_name = True

class ServiceOrderCreate(BaseModel):
    titulo: str = Field(..., alias="title")
    descricao: Optional[str] = Field(None, alias="description")
    descricao_detalhada: Optional[str] = Field(None, alias="descricao_detalhada")
    # empresaId: Optional[Union[int, str]] = Field(None, alias="company_id")
    clienteId: int = Field(..., alias="client_id")
    tecnicoId: Optional[int] = Field(None, alias="technician_id")
    equipamentoId: Optional[int] = Field(None, alias="equipment_id")
    tipo: Optional[str] = Field("corretiva", alias="type")
    status: Optional[str] = "aberto"
    prioridade: Optional[str] = Field("media", alias="priority")
    dataAgendada: Optional[str] = Field(None, alias="scheduled_at") # ISO format
    itens_os: Optional[List[ItemOSCreate]] = Field(None, alias="itens_os")

    @field_validator('empresaId', mode='before')
    @classmethod
    def validate_empresa_id(cls, v: Any) -> Optional[int]:
        if v == "super_default" or v == "" or v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    class Config:
        populate_by_name = True

class ServiceOrderUpdate(BaseModel):
    titulo: Optional[str] = Field(None, alias="title")
    descricao: Optional[str] = Field(None, alias="description")
    descricao_detalhada: Optional[str] = Field(None, alias="descricao_detalhada")
    descricao_orcamento: Optional[str] = Field(None, alias="descricao_orcamento")
    relatorio_tecnico: Optional[str] = Field(None, alias="relatorio_tecnico")
    tecnicoId: Optional[int] = Field(None, alias="technician_id")
    equipamentoId: Optional[int] = Field(None, alias="equipment_id")
    tipo: Optional[str] = Field(None, alias="type")
    status: Optional[str] = None
    prioridade: Optional[str] = Field(None, alias="priority")
    dataAgendada: Optional[str] = Field(None, alias="scheduled_at")
    data_agendamento_inicio: Optional[str] = None
    data_inicio_real: Optional[str] = None
    data_fim_real: Optional[str] = None
    valor_total: Optional[float] = None
    assinatura_cliente: Optional[str] = None
    assinatura_tecnico: Optional[str] = None
    orcamento_disponivel: Optional[bool] = None
    relatorio_disponivel: Optional[bool] = None
    fotos_os: Optional[List[dict]] = None
    historico_json: Optional[List[dict]] = None
    itens_os: Optional[List[ItemOSCreate]] = None

    class Config:
        populate_by_name = True

@router.post("/solicitacoes", response_model=ServiceOrderResponse)
def create_solicitacao(order: ServiceOrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Parse date
    scheduled_date = None
    if order.dataAgendada:
        try:
            scheduled_date = datetime.fromisoformat(order.dataAgendada.replace("Z", "+00:00"))
        except:
            pass

    # Determine Company ID (Single Tenant: Always 1 or user's company)
    # company_id = current_user.company_id or 1
    # NO COMPANY ID ANYMORE

    # Calculate sequential_id
    sequential_id = 1
    # if company_id:
    max_id = db.query(func.max(ServiceOrder.sequential_id)).scalar()
    if max_id:
        sequential_id = max_id + 1

    # Auto-assign if technician
    technician_id = order.tecnicoId
    if current_user.role == 'tecnico':
        technician_id = current_user.id

    db_order = ServiceOrder(
        title=order.titulo,
        description=order.descricao,
        descricao_detalhada=order.descricao_detalhada or order.descricao,
        client_id=order.clienteId,
        technician_id=technician_id,
        equipment_id=order.equipamentoId,
        status=order.status,
        priority=order.prioridade,
        scheduled_at=scheduled_date,
        data_agendamento_inicio=scheduled_date,
        created_at=datetime.now(),
        total_value=0.0,
        # company_id=company_id,
        sequential_id=sequential_id,
        historico_json=[{
            "data": datetime.now().isoformat(),
            "descricao": "Solicitação criada",
            "usuario": current_user.full_name
        }]
    )
    
    db.add(db_order)
    db.flush() # Get ID before adding items
    
    # Add items if provided
    if order.itens_os:
        for item in order.itens_os:
            db_item = ItemOS(
                solicitacao_id=db_order.id,
                equipamento_id=item.equipamento_id,
                descricao_tarefa=item.descricao_tarefa,
                quantidade=item.quantidade or 1.0,
                valor_unitario=item.valor_unitario or 0.0,
                valor_total=(item.quantidade or 1.0) * (item.valor_unitario or 0.0),
                status_item=item.status_item or "pendente"
            )
            db.add(db_item)
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Invalidate cache
    delete_cache("solicitacoes")
    
    # Notificar sobre nova OS
    try:
        from notification_service import notify_service_order_created, notify_service_order_assigned
        client = db.query(Client).filter(Client.id == order.clienteId).first()
        client_name = client.name if client else "Cliente"
        
        notify_service_order_created(
            db=db,
            order_id=db_order.sequential_id or db_order.id,
            order_title=order.titulo,
            client_name=client_name,
            company_id=1, # Default
            created_by_id=current_user.id
        )
        
        # Se foi atribuída a um técnico, notificá-lo
        if technician_id and technician_id != current_user.id:
            notify_service_order_assigned(
                db=db,
                order_id=db_order.sequential_id or db_order.id,
                order_title=order.titulo,
                technician_id=technician_id,
                company_id=1 # Default
            )
    except Exception as e:
        logger.error(f"Error creating notifications: {e}")
    
    return db_order

@router.put("/solicitacoes/{order_id}", response_model=ServiceOrderResponse)
def update_solicitacao(order_id: int, order: ServiceOrderUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ServiceOrder).filter(ServiceOrder.id == order_id)
    
    if current_user.role != "super_admin":
        query = query.filter(ServiceOrder.company_id == current_user.company_id)
        
    db_order = query.first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    old_status = db_order.status
    old_technician_id = db_order.technician_id
    
    if order.titulo is not None: db_order.title = order.titulo
    if order.descricao is not None: db_order.description = order.descricao
    if order.descricao_detalhada is not None: db_order.descricao_detalhada = order.descricao_detalhada
    if order.descricao_orcamento is not None: db_order.descricao_orcamento = order.descricao_orcamento
    if order.relatorio_tecnico is not None: db_order.relatorio_tecnico = order.relatorio_tecnico
    if order.tecnicoId is not None: db_order.technician_id = order.tecnicoId
    if order.equipamentoId is not None: db_order.equipment_id = order.equipamentoId
    if order.status is not None: db_order.status = order.status
    if order.prioridade is not None: db_order.priority = order.prioridade
    if order.valor_total is not None: 
        db_order.valor_total = order.valor_total
        db_order.total_value = order.valor_total
    if order.assinatura_cliente is not None: db_order.assinatura_cliente = order.assinatura_cliente
    if order.assinatura_tecnico is not None: db_order.assinatura_tecnico = order.assinatura_tecnico
    if order.orcamento_disponivel is not None: db_order.orcamento_disponivel = order.orcamento_disponivel
    if order.relatorio_disponivel is not None: db_order.relatorio_disponivel = order.relatorio_disponivel
    if order.fotos_os is not None: db_order.fotos_os = order.fotos_os
    if order.historico_json is not None: db_order.historico_json = order.historico_json
    
    if order.dataAgendada:
        try:
            dt = datetime.fromisoformat(order.dataAgendada.replace("Z", "+00:00"))
            db_order.scheduled_at = dt
            db_order.data_agendamento_inicio = dt
        except:
            pass
            
    if order.data_agendamento_inicio:
        try:
            db_order.data_agendamento_inicio = datetime.fromisoformat(order.data_agendamento_inicio.replace("Z", "+00:00"))
        except: pass
        
    if order.data_inicio_real:
        try:
            db_order.data_inicio_real = datetime.fromisoformat(order.data_inicio_real.replace("Z", "+00:00"))
        except: pass
        
    if order.data_fim_real:
        try:
            db_order.data_fim_real = datetime.fromisoformat(order.data_fim_real.replace("Z", "+00:00"))
        except: pass

    # Update items if provided
    if order.itens_os is not None:
        # Simple approach: delete existing and recreate
        db.query(ItemOS).filter(ItemOS.solicitacao_id == db_order.id).delete()
        for item in order.itens_os:
            db_item = ItemOS(
                solicitacao_id=db_order.id,
                equipamento_id=item.equipamento_id,
                descricao_tarefa=item.descricao_tarefa,
                quantidade=item.quantidade or 1.0,
                valor_unitario=item.valor_unitario or 0.0,
                valor_total=(item.quantidade or 1.0) * (item.valor_unitario or 0.0),
                status_item=item.status_item or "pendente"
            )
            db.add(db_item)
            
    db.commit()
    db.refresh(db_order)
    
    # Invalidate cache
    delete_cache("solicitacoes")
    
    # Notificações de alterações
    try:
        from notification_service import (
            notify_service_order_assigned, 
            notify_service_order_completed,
            notify_service_order_status_changed
        )
        
        # Técnico foi atribuído
        if order.tecnicoId and order.tecnicoId != old_technician_id:
            notify_service_order_assigned(
                db=db,
                order_id=db_order.sequential_id or db_order.id,
                order_title=db_order.title or "",
                technician_id=order.tecnicoId,
                company_id=1
            )
        
        # Status mudou para concluído
        if order.status == "concluido" and old_status != "concluido":
            technician = db.query(User).filter(User.id == db_order.technician_id).first()
            tech_name = technician.full_name if technician else "Técnico"
            notify_service_order_completed(
                db=db,
                order_id=db_order.sequential_id or db_order.id,
                order_title=db_order.title or "",
                technician_name=tech_name,
                company_id=1
            )
    except Exception as e:
        logger.error(f"Error creating update notifications: {e}")
    
    return db_order

@router.delete("/solicitacoes/{order_id}")
def delete_solicitacao(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ServiceOrder).filter(ServiceOrder.id == order_id)
    
    if current_user.role != "super_admin":
        query = query.filter(ServiceOrder.company_id == current_user.company_id)
        
    db_order = query.first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    db.delete(db_order)
    db.commit()
    
    # Invalidate cache
    delete_cache("solicitacoes")
    
    return {"message": "Solicitação removida"}

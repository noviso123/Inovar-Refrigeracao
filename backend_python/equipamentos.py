from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Equipment, User
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

from auth import get_current_user

from pydantic import BaseModel, Field

# Pydantic Models
class EquipmentBase(BaseModel):
    nome: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    tipo_equipamento: Optional[str] = "ar_condicionado"
    data_instalacao: Optional[str] = None
    clienteId: int = Field(..., alias="cliente_id")

    class Config:
        populate_by_name = True
        from_attributes = True

class EquipmentCreate(EquipmentBase):
    company_id: Optional[int] = None

class EquipmentUpdate(BaseModel):
    nome: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    tipo_equipamento: Optional[str] = None
    data_instalacao: Optional[str] = None

    class Config:
        populate_by_name = True

class EquipmentResponse(EquipmentBase):
    id: int

@router.get("/equipamentos", response_model=List[EquipmentResponse])
def listar_equipamentos(
    clienteId: Optional[int] = None, 
    usuario_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from models import User, Client
    
    # Cache key based on filter
    cache_key = f"cache:equipamentos:list:{clienteId or 'all'}:{usuario_id or 'all'}"
    cached = get_cache(cache_key)
    if cached:
        logger.debug("Cache HIT: equipamentos")
        return cached
    
    query = db.query(Equipment)
    
    # Se clienteId foi fornecido, filtra por cliente
    if clienteId:
        query = query.filter(Equipment.client_id == clienteId)
        # Enforce strict check for non-superadmin
        if current_user.role != "super_admin":
             client = db.query(Client).filter(Client.id == clienteId).first()
             if not client or client.company_id != current_user.company_id:
                 return []

    # Se usuario_id foi fornecido, busca equipamentos de clientes da mesma empresa
    elif usuario_id:
        user = db.query(User).filter(User.id == usuario_id).first()
        if user and user.company_id:
            # Busca IDs de todos os clientes da empresa
            client_ids = db.query(Client.id).filter(Client.company_id == user.company_id).all()
            client_ids = [c[0] for c in client_ids]
            if client_ids:
                query = query.filter(Equipment.client_id.in_(client_ids))
            else:
                return []
    
    # If no specific filter, enforce company isolation for non-superadmin
    elif current_user.role != "super_admin":
        client_ids = db.query(Client.id).filter(Client.company_id == current_user.company_id).all()
        client_ids = [c[0] for c in client_ids]
        if client_ids:
            query = query.filter(Equipment.client_id.in_(client_ids))
        else:
            return []
    
    equipments = query.all()
    
    result = [
        {
            "id": e.id,
            "nome": e.name,
            "marca": e.brand,
            "modelo": e.model,
            "numero_serie": e.serial_number,
            "tipo_equipamento": e.equipment_type,
            "data_instalacao": e.installation_date.isoformat() if e.installation_date else None,
            "clienteId": e.client_id
        }
        for e in equipments
    ]
    
    set_cache(cache_key, result, ttl_seconds=120)  # 2 minutes
    return result

@router.post("/equipamentos", response_model=EquipmentResponse)
def criar_equipamento(equip: EquipmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Determine Company ID
    company_id = current_user.company_id
    if current_user.role == "super_admin":
        if equip.company_id:
            company_id = equip.company_id
        # If not provided, we might infer from client if client_id is provided
    
    # Validate Client and Company
    client = db.query(Client).filter(Client.id == equip.clienteId).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # If SuperAdmin didn't specify company, use client's company
    if current_user.role == "super_admin" and not company_id:
        company_id = client.company_id
        
    # Check if client belongs to the company
    if client.company_id != company_id:
         raise HTTPException(status_code=400, detail="Cliente não pertence à empresa especificada.")
         
    # Check permissions for non-SuperAdmin
    if current_user.role != "super_admin":
        if client.company_id != current_user.company_id:
             raise HTTPException(status_code=403, detail="Sem permissão para adicionar equipamento a este cliente.")

    inst_date = None
    if equip.data_instalacao:
        try:
            inst_date = datetime.strptime(equip.data_instalacao, "%Y-%m-%d")
        except:
            pass

    db_equip = Equipment(
        name=equip.nome,
        brand=equip.marca,
        model=equip.modelo,
        serial_number=equip.numero_serie,
        equipment_type=equip.tipo_equipamento,
        installation_date=inst_date,
        client_id=equip.clienteId
    )
    db.add(db_equip)
    db.commit()
    db.refresh(db_equip)
    
    # Invalidate cache
    delete_cache("equipamentos")
    
    return {
        "id": db_equip.id,
        "nome": db_equip.name,
        "marca": db_equip.brand,
        "modelo": db_equip.model,
        "numero_serie": db_equip.serial_number,
        "tipo_equipamento": db_equip.equipment_type,
        "data_instalacao": db_equip.installation_date.isoformat() if db_equip.installation_date else None,
        "clienteId": db_equip.client_id
    }

@router.put("/equipamentos/{equip_id}")
def atualizar_equipamento(equip_id: int, equip: EquipmentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_equip = db.query(Equipment).filter(Equipment.id == equip_id).first()
    if not db_equip:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    # Check permissions
    if current_user.role != "super_admin":
         client = db.query(Client).filter(Client.id == db_equip.client_id).first()
         if not client or client.company_id != current_user.company_id:
             raise HTTPException(status_code=403, detail="Sem permissão para gerenciar este equipamento.")
    
    if equip.nome is not None: db_equip.name = equip.nome
    if equip.marca is not None: db_equip.brand = equip.marca
    if equip.modelo is not None: db_equip.model = equip.modelo
    if equip.numero_serie is not None: db_equip.serial_number = equip.numero_serie
    if equip.tipo_equipamento is not None: db_equip.equipment_type = equip.tipo_equipamento
    
    if equip.data_instalacao:
        try:
            db_equip.installation_date = datetime.strptime(equip.data_instalacao, "%Y-%m-%d")
        except:
            pass
            
    db.commit()
    
    # Invalidate cache
    delete_cache("equipamentos")
    
    return {"message": "Equipamento atualizado"}

@router.delete("/equipamentos/{equip_id}")
def deletar_equipamento(equip_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_equip = db.query(Equipment).filter(Equipment.id == equip_id).first()
    if not db_equip:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    
    # Check permissions
    if current_user.role != "super_admin":
         client = db.query(Client).filter(Client.id == db_equip.client_id).first()
         if not client or client.company_id != current_user.company_id:
             raise HTTPException(status_code=403, detail="Sem permissão para gerenciar este equipamento.")
    
    db.delete(db_equip)
    db.commit()
    
    # Invalidate cache
    delete_cache("equipamentos")
    
    return {"message": "Equipamento removido"}

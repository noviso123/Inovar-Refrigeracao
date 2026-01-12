from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Equipment, Location, User
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

from auth import get_current_user, get_operational_user

from pydantic import BaseModel, Field, ConfigDict

class EquipmentBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    nome: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    tipo_equipamento: Optional[str] = "ar_condicionado"
    data_instalacao: Optional[str] = None
    locationId: int = Field(..., alias="location_id")

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    nome: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    tipo_equipamento: Optional[str] = None
    data_instalacao: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: int
    client_name: Optional[str] = None
    location_name: Optional[str] = None

@router.get("/equipamentos", response_model=List[EquipmentResponse])
def listar_equipamentos(
    locationId: Optional[int] = None,
    clientId: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    cache_key = f"cache:equipamentos:list:{locationId or 'all'}:{clientId or 'all'}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    query = db.query(Equipment).options(joinedload(Equipment.location).joinedload(Location.client))
    if locationId:
        query = query.filter(Equipment.location_id == locationId)
    elif clientId:
        query = query.filter(Location.client_id == clientId)

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
            "locationId": e.location_id,
            "client_name": e.location.client.name if e.location and e.location.client else None,
            "location_name": e.location.nickname if e.location else None
        }
        for e in equipments
    ]

    set_cache(cache_key, result, ttl_seconds=120)
    return result

@router.post("/equipamentos", response_model=EquipmentResponse)
def criar_equipamento(
    equip: EquipmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    # Validate Location
    location = db.query(Location).filter(Location.id == equip.locationId).first()
    if not location:
        raise HTTPException(status_code=404, detail="Local não encontrado")

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
        location_id=equip.locationId
    )
    db.add(db_equip)
    db.commit()
    db.refresh(db_equip)

    delete_cache("equipamentos")
    return {
        "id": db_equip.id,
        "nome": db_equip.name,
        "marca": db_equip.brand,
        "modelo": db_equip.model,
        "numero_serie": db_equip.serial_number,
        "tipo_equipamento": db_equip.equipment_type,
        "data_instalacao": db_equip.installation_date.isoformat() if db_equip.installation_date else None,
        "locationId": db_equip.location_id,
        "client_name": db_equip.location.client.name if db_equip.location and db_equip.location.client else None,
        "location_name": db_equip.location.nickname if db_equip.location else None
    }

@router.put("/equipamentos/{equip_id}")
def atualizar_equipamento(
    equip_id: int, 
    equip: EquipmentUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    db_equip = db.query(Equipment).filter(Equipment.id == equip_id).first()
    if not db_equip:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")

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
    delete_cache("equipamentos")
    return {"message": "Equipamento atualizado"}

@router.delete("/equipamentos/{equip_id}")
def deletar_equipamento(
    equip_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    db_equip = db.query(Equipment).filter(Equipment.id == equip_id).first()
    if not db_equip:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")

    db.delete(db_equip)
    db.commit()
    delete_cache("equipamentos")
    return {"message": "Equipamento removido"}

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Client
from pydantic import BaseModel
from typing import List, Optional
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

from auth import get_current_user
from models import User
from plan_limits import check_client_limit
from validators import validate_cpf, validate_cnpj, format_cpf, format_cnpj

router = APIRouter()

class ClientBase(BaseModel):
    nome: str
    email: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    periodoManutencaoMeses: Optional[int] = None
    company_id: Optional[int] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    sequential_id: Optional[int] = None
    
    class Config:
        from_attributes = True

@router.get("/clientes", response_model=List[ClientResponse])
def list_clients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Try cache first (TTL: 2 minutes)
    # Cache key must include company_id for isolation!
    cache_key = f"cache:clientes:list:{current_user.company_id}"
    cached = get_cache(cache_key)
    if cached:
        logger.debug("Cache HIT: clientes list")
        return cached
    
    # Query database with isolation
    query = db.query(Client)
    if current_user.role != "super_admin":
        query = query.filter(Client.company_id == current_user.company_id)
        
    clients = query.all()
    
    result = [
        {
            "id": c.id,
            "sequential_id": c.sequential_id,
            "nome": c.name,
            "email": c.email,
            "cpf": c.document if len(c.document or "") <= 14 else None,
            "cnpj": c.document if len(c.document or "") > 14 else None,
            "telefone": c.phone,
            "endereco": c.address,
            "cidade": c.city,
            "estado": c.state,
            "cep": c.zip_code,
            "numero": c.street_number,
            "complemento": c.complement,
            "bairro": c.neighborhood,
            "periodoManutencaoMeses": c.maintenance_period
        }
        for c in clients
    ]
    
    # Cache result
    set_cache(cache_key, result, ttl_seconds=120)
    return result

@router.post("/clientes", response_model=ClientResponse)
def create_client(client: ClientCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Determine Company ID
    company_id = current_user.company_id
    if current_user.role == "super_admin" and client.company_id:
        company_id = client.company_id
    
    # Check plan limits (only for non-super_admin)
    if current_user.role != "super_admin" and company_id:
        check_client_limit(db, company_id)
        
    document = None
    if client.cpf:
        document = validate_cpf(client.cpf)
    elif client.cnpj:
        document = validate_cnpj(client.cnpj)
        
    # Check if document already exists for this company
    if document:
        existing = db.query(Client).filter(
            Client.company_id == company_id,
            Client.document == document
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cliente já cadastrado com este documento")

    # Calculate sequential_id
    sequential_id = 1
    if company_id:
        max_id = db.query(func.max(Client.sequential_id)).filter(Client.company_id == company_id).scalar()
        if max_id:
            sequential_id = max_id + 1

    # Map frontend fields to backend model
    db_client = Client(
        name=client.nome,
        email=client.email,
        document=document,
        phone=client.telefone,
        address=client.endereco,
        city=client.cidade,
        state=client.estado,
        zip_code=client.cep,
        street_number=client.numero,
        complement=client.complemento,
        neighborhood=client.bairro,
        maintenance_period=client.periodoManutencaoMeses,
        company_id=company_id,
        sequential_id=sequential_id
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    
    # Invalidate cache
    delete_cache("clientes")
    
    # Return with mapping back to frontend names
    return {
        "id": db_client.id,
        "sequential_id": db_client.sequential_id,
        "nome": db_client.name,
        "email": db_client.email,
        "cpf": db_client.document if len(db_client.document or "") <= 14 else None,
        "cnpj": db_client.document if len(db_client.document or "") > 14 else None,
        "telefone": db_client.phone,
        "endereco": db_client.address,
        "cidade": db_client.city,
        "estado": db_client.state,
        "cep": db_client.zip_code,
        "numero": db_client.street_number,
        "complemento": db_client.complement,
        "bairro": db_client.neighborhood,
        "periodoManutencaoMeses": db_client.maintenance_period
    }

@router.get("/clientes/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Client).filter(Client.id == client_id)
    
    if current_user.role != "super_admin":
        query = query.filter(Client.company_id == current_user.company_id)
        
    c = query.first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    return {
        "id": c.id,
        "sequential_id": c.sequential_id,
        "nome": c.name,
        "email": c.email,
        "cpf": c.document if len(c.document or "") <= 14 else None,
        "cnpj": c.document if len(c.document or "") > 14 else None,
        "telefone": c.phone,
        "endereco": c.address,
        "cidade": c.city,
        "estado": c.state,
        "cep": c.zip_code,
        "numero": c.street_number,
        "complemento": c.complement,
        "bairro": c.neighborhood,
        "periodoManutencaoMeses": c.maintenance_period
    }

class ClientUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    periodoManutencaoMeses: Optional[int] = None

@router.put("/clientes/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client: ClientUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Client).filter(Client.id == client_id)
    
    if current_user.role != "super_admin":
        query = query.filter(Client.company_id == current_user.company_id)
        
    db_client = query.first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if client.nome is not None: db_client.name = client.nome
    if client.email is not None: db_client.email = client.email
    
    # Validate Document
    if client.cpf:
        db_client.document = validate_cpf(client.cpf)
    elif client.cnpj:
        db_client.document = validate_cnpj(client.cnpj)
    if client.telefone is not None: db_client.phone = client.telefone
    if client.endereco is not None: db_client.address = client.endereco
    if client.cidade is not None: db_client.city = client.cidade
    if client.estado is not None: db_client.state = client.estado
    if client.cep is not None: db_client.zip_code = client.cep
    if client.numero is not None: db_client.street_number = client.numero
    if client.complemento is not None: db_client.complement = client.complemento
    if client.bairro is not None: db_client.neighborhood = client.bairro
    if client.periodoManutencaoMeses is not None: db_client.maintenance_period = client.periodoManutencaoMeses
    
    db.commit()
    db.refresh(db_client)
    
    # Invalidate cache
    delete_cache("clientes")
    
    return {
        "id": db_client.id,
        "sequential_id": db_client.sequential_id,
        "nome": db_client.name,
        "email": db_client.email,
        "cpf": db_client.document if len(db_client.document or "") <= 14 else None,
        "cnpj": db_client.document if len(db_client.document or "") > 14 else None,
        "telefone": db_client.phone,
        "endereco": db_client.address,
        "cidade": db_client.city,
        "estado": db_client.state,
        "cep": db_client.zip_code,
        "numero": db_client.street_number,
        "complemento": db_client.complement,
        "bairro": db_client.neighborhood,
        "periodoManutencaoMeses": db_client.maintenance_period
    }

@router.delete("/clientes/{client_id}")
def delete_client(client_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Client).filter(Client.id == client_id)
    
    if current_user.role != "super_admin":
        query = query.filter(Client.company_id == current_user.company_id)
        
    db_client = query.first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    db.delete(db_client)
    db.commit()
    
    # Invalidate cache
    delete_cache("clientes")
    
    return {"message": "Cliente removido"}

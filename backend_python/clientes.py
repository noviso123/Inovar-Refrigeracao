from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Client, Location, User
from pydantic import BaseModel
from typing import List, Optional
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

from auth import get_current_user
from validators import validate_cpf, validate_cnpj

router = APIRouter()

# Schemas
class LocationBase(BaseModel):
    nickname: str
    address: str
    city: str
    state: str
    zip_code: str
    street_number: str
    complement: Optional[str] = None
    neighborhood: str

class LocationResponse(LocationBase):
    id: int
    client_id: int

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    nome: str
    email: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None

class ClientCreate(ClientBase):
    # Initial location is optional but recommended
    primary_location: Optional[LocationBase] = None

class ClientUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    # Support updating the primary location via these fields
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    street_number: Optional[str] = None
    neighborhood: Optional[str] = None
    complement: Optional[str] = None

class ClientResponse(ClientBase):
    id: int
    sequential_id: Optional[int] = None
    locations: List[LocationResponse] = []

    class Config:
        from_attributes = True

# Routes - Clients
@router.get("/clientes", response_model=List[ClientResponse])
def list_clients(db: Session = Depends(get_db)):
    cache_key = "cache:clientes:list:global"
    cached = get_cache(cache_key)
    if cached:
        return cached

    clients = db.query(Client).all()

    # Mapping to response model
    result = []
    for c in clients:
        result.append({
            "id": c.id,
            "sequential_id": c.sequential_id,
            "nome": c.name,
            "email": c.email,
            "cpf": c.document if len(c.document or "") <= 14 else None,
            "cnpj": c.document if len(c.document or "") > 14 else None,
            "telefone": c.phone,
            "locations": [
                {
                    "id": loc.id,
                    "client_id": loc.client_id,
                    "nickname": loc.nickname,
                    "address": loc.address,
                    "city": loc.city,
                    "state": loc.state,
                    "zip_code": loc.zip_code,
                    "street_number": loc.street_number,
                    "complement": loc.complement,
                    "neighborhood": loc.neighborhood
                }
                for loc in c.locations
            ]
        })

    set_cache(cache_key, result, ttl_seconds=120)
    return result

@router.post("/clientes", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    document = None
    if client.cpf:
        document = validate_cpf(client.cpf)
    elif client.cnpj:
        document = validate_cnpj(client.cnpj)

    if document:
        existing = db.query(Client).filter(Client.document == document).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cliente já cadastrado com este documento")

    # Sequential ID
    max_id = db.query(func.max(Client.sequential_id)).scalar()
    sequential_id = (max_id or 0) + 1

    db_client = Client(
        name=client.nome,
        email=client.email,
        document=document,
        phone=client.telefone,
        sequential_id=sequential_id
    )
    db.add(db_client)
    db.flush() # Get ID for location

    if client.primary_location:
        db_location = Location(
            client_id=db_client.id,
            **client.primary_location.dict()
        )
        db.add(db_location)

    db.commit()
    db.refresh(db_client)

    delete_cache("clientes")
    return db_client

@router.get("/clientes/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return c

@router.put("/clientes/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client: ClientUpdate, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    if client.nome is not None: db_client.name = client.nome
    if client.email is not None: db_client.email = client.email
    if client.telefone is not None: db_client.phone = client.telefone

    if client.cpf:
        db_client.document = validate_cpf(client.cpf)
    elif client.cnpj:
        db_client.document = validate_cnpj(client.cnpj)

    # Update primary location if address fields are provided
    if any([client.address, client.city, client.state, client.zip_code, client.street_number, client.neighborhood]):
        primary_loc = db.query(Location).filter(Location.client_id == client_id).order_by(Location.id.asc()).first()
        if primary_loc:
            if client.address: primary_loc.address = client.address
            if client.city: primary_loc.city = client.city
            if client.state: primary_loc.state = client.state
            if client.zip_code: primary_loc.zip_code = client.zip_code
            if client.street_number: primary_loc.street_number = client.street_number
            if client.neighborhood: primary_loc.neighborhood = client.neighborhood
            if client.complement: primary_loc.complement = client.complement

    db.commit()
    db.refresh(db_client)
    delete_cache("clientes")
    return db_client

@router.delete("/clientes/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    db.delete(db_client)
    db.commit()
    delete_cache("clientes")
    return {"message": "Cliente removido"}

# Routes - Locations
@router.post("/clientes/{client_id}/locais", response_model=LocationResponse)
def add_location(client_id: int, location: LocationBase, db: Session = Depends(get_db)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    db_location = Location(
        client_id=client_id,
        **location.dict()
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    delete_cache("clientes")
    return db_location

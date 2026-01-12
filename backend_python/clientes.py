from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import Client, Location, User
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from redis_utils import get_cache, set_cache, delete_cache
import logging

logger = logging.getLogger(__name__)

from auth import get_current_user, get_operational_user
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
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: int
    client_id: int


class ClientBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    nome: str = Field(..., validation_alias="name")
    email: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = Field(None, validation_alias="phone")
    periodo_manutencao: Optional[int] = Field(6, validation_alias="maintenance_period")

class ClientCreate(ClientBase):
    # Flattened address fields from frontend
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    
    # Initial location is optional but recommended
    primary_location: Optional[LocationBase] = None

class ClientUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    cpf: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    periodo_manutencao: Optional[int] = None
    
    # Address fields
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    
    # Support legacy fields if any
    address: Optional[str] = None
    zip_code: Optional[str] = None
    street_number: Optional[str] = None
    neighborhood: Optional[str] = None

class ClientResponse(ClientBase):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: int
    sequential_id: Optional[int] = None
    periodo_manutencao: int = 6
    
    # Flattened primary location fields
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    
    locations: List[LocationResponse] = []

# Routes - Clients
@router.get("/clientes", response_model=List[ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    clients = db.query(Client).options(joinedload(Client.locations)).all()
    return clients

@router.post("/clientes", response_model=ClientResponse)
def create_client(
    client: ClientCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    logger.info(f"Creating client: {client.nome}")
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
        sequential_id=sequential_id,
        maintenance_period=client.periodo_manutencao or 6
    )
    db.add(db_client)
    db.flush() # Get ID for location

    if client.primary_location:
        db_location = Location(
            client_id=db_client.id,
            **client.primary_location.dict()
        )
        db.add(db_location)
    elif any([client.cep, client.logradouro, client.numero, client.cidade, client.estado]):
        db_location = Location(
            client_id=db_client.id,
            nickname="Sede",
            address=client.logradouro or "",
            city=client.cidade or "",
            state=client.estado or "",
            zip_code=client.cep or "",
            street_number=client.numero or "",
            complement=client.complemento,
            neighborhood=client.bairro or ""
        )
        db.add(db_location)

    db.commit()
    db.refresh(db_client)

    delete_cache("clientes")
    
    return db_client

@router.get("/clientes/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return c

@router.put("/clientes/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int, 
    client: ClientUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    if client.nome is not None: db_client.name = client.nome
    if client.email is not None: db_client.email = client.email
    if client.telefone is not None: db_client.phone = client.telefone
    if client.periodo_manutencao is not None: db_client.maintenance_period = client.periodo_manutencao

    if client.cpf:
        db_client.document = validate_cpf(client.cpf)
    elif client.cnpj:
        db_client.document = validate_cnpj(client.cnpj)

    # Update primary location if address fields are provided
    address_fields = {
        "address": client.logradouro or client.address,
        "city": client.cidade,
        "state": client.estado,
        "zip_code": client.cep or client.zip_code,
        "street_number": client.numero or client.street_number,
        "neighborhood": client.bairro or client.neighborhood,
        "complement": client.complemento
    }
    
    if any(address_fields.values()):
        primary_loc = db.query(Location).filter(Location.client_id == client_id).order_by(Location.id.asc()).first()
        if primary_loc:
            if address_fields["address"]: primary_loc.address = address_fields["address"]
            if address_fields["city"]: primary_loc.city = address_fields["city"]
            if address_fields["state"]: primary_loc.state = address_fields["state"]
            if address_fields["zip_code"]: primary_loc.zip_code = address_fields["zip_code"]
            if address_fields["street_number"]: primary_loc.street_number = address_fields["street_number"]
            if address_fields["neighborhood"]: primary_loc.neighborhood = address_fields["neighborhood"]
            if address_fields["complement"]: primary_loc.complement = address_fields["complement"]
        else:
            # Create primary location if it doesn't exist
            new_loc = Location(
                client_id=client_id,
                nickname="Sede",
                address=address_fields["address"] or "",
                city=address_fields["city"] or "",
                state=address_fields["state"] or "",
                zip_code=address_fields["zip_code"] or "",
                street_number=address_fields["street_number"] or "",
                neighborhood=address_fields["neighborhood"] or "",
                complement=address_fields["complement"]
            )
            db.add(new_loc)

    db.commit()
    db.refresh(db_client)
    delete_cache("clientes")
    return db_client

@router.delete("/clientes/{client_id}")
def delete_client(
    client_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    db.delete(db_client)
    db.commit()
    delete_cache("clientes")
    return {"message": "Cliente removido"}

# Routes - Locations
@router.post("/clientes/{client_id}/locais", response_model=LocationResponse)
def add_location(
    client_id: int, 
    location: LocationBase, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_operational_user)
):
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

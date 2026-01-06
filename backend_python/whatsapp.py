"""
WhatsApp Integration - Evolution API
Endpoints para conectar e enviar mensagens via Evolution API
Simplificado para arquitetura monolítica single-tenant.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import os
import logging
from sqlalchemy.orm import Session
from database import get_db
from models import WhatsAppInstance, Message, User, Notification
from auth import get_current_user
from redis_utils import get_cache, set_cache, delete_cache

router = APIRouter(tags=["WhatsApp"], prefix="/whatsapp")
logger = logging.getLogger("BrainAPI")

# Evolution API Configuration
EVOLUTION_URL = os.getenv("WHATSAPP_URL", "")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "EvolutionInovar2024SecretKey")

def get_headers():
    return {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
    }

# ========== Pydantic Models ==========

class InstanceRequest(BaseModel):
    instanceName: str

class ConnectRequest(BaseModel):
    instanceName: str

class SendTextRequest(BaseModel):
    instanceName: str
    number: str
    text: str

class SendMediaRequest(BaseModel):
    instanceName: str
    number: str
    media: str
    mediaType: str  # image, video, audio, document
    caption: Optional[str] = None
    fileName: Optional[str] = None

# ========== Instance Management ==========

@router.get("/instances")
async def get_instances(db: Session = Depends(get_db)):
    """Lista todas as instâncias do sistema"""
    cache_key = "whatsapp:instances:global"
    cached = get_cache(cache_key)
    if cached:
        return cached

    instances = db.query(WhatsAppInstance).all()

    result = []
    for inst in instances:
        status_data = await get_instance_status_from_api(inst.instance_name)
        result.append({
            "instance": {
                "instanceName": inst.instance_name,
                "status": status_data.get("state", "disconnected"),
                "state": status_data.get("state", "disconnected")
            }
        })

    set_cache(cache_key, result, ttl_seconds=30)
    return result

@router.post("/instances")
async def create_instance(data: InstanceRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cria uma nova instância WhatsApp"""
    existing = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == data.instanceName
    ).first()

    if not existing:
        new_inst = WhatsAppInstance(
            user_id=current_user.id,
            instance_name=data.instanceName,
            instance_key=data.instanceName,
            status="disconnected"
        )
        db.add(new_inst)
        db.commit()
        db.refresh(new_inst)

    # Create in Evolution API
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.post(
                f"{EVOLUTION_URL}/instance/create",
                headers=get_headers(),
                json={
                    "instanceName": data.instanceName,
                    "qrcode": False,
                    "integration": "WHATSAPP-BAILEYS"
                }
            )
            return {"status": "created", "instance": data.instanceName}
        except Exception as e:
            logger.error(f"Error creating instance: {e}")
            return {"status": "created_local", "instance": data.instanceName}

@router.delete("/instances/{instance_name}")
async def delete_instance(instance_name: str, db: Session = Depends(get_db)):
    """Deleta uma instância"""
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == instance_name
    ).first()

    if inst:
        async with httpx.AsyncClient() as client:
            try:
                await client.delete(f"{EVOLUTION_URL}/instance/delete/{instance_name}", headers=get_headers())
            except: pass

        db.delete(inst)
        db.commit()

    return {"status": "deleted"}

# ========== Connection ==========

@router.get("/status")
async def get_all_status(db: Session = Depends(get_db)):
    """Obtém status da primeira instância disponível"""
    instances = db.query(WhatsAppInstance).all()
    if not instances:
        return {"instance": None}

    inst = instances[0]
    status_data = await get_instance_status_from_api(inst.instance_name)
    return {"instance": {"instanceName": inst.instance_name, **status_data}}

@router.post("/connect")
async def connect_whatsapp(data: ConnectRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Conecta WhatsApp e retorna QR Code"""
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == data.instanceName
    ).first()

    if not inst:
        inst = WhatsAppInstance(
            user_id=current_user.id,
            instance_name=data.instanceName,
            instance_key=data.instanceName,
            status="disconnected"
        )
        db.add(inst)
        db.commit()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.post(
                f"{EVOLUTION_URL}/instance/create",
                headers=get_headers(),
                json={"instanceName": data.instanceName, "qrcode": False, "integration": "WHATSAPP-BAILEYS"}
            )
        except: pass

        try:
            response = await client.get(
                f"{EVOLUTION_URL}/instance/connect/{data.instanceName}",
                headers=get_headers()
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "qr_generated",
                    "base64": result.get("base64"),
                    "code": result.get("code"),
                    "pairingCode": result.get("pairingCode")
                }
            return {"status": "error", "message": "Could not get QR"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

@router.post("/logout")
async def logout_all(db: Session = Depends(get_db)):
    """Desconecta todas as instâncias"""
    instances = db.query(WhatsAppInstance).all()
    for inst in instances:
        async with httpx.AsyncClient() as client:
            try:
                await client.delete(f"{EVOLUTION_URL}/instance/logout/{inst.instance_name}", headers=get_headers())
            except: pass
    return {"status": "logged_out"}

@router.post("/connect-pairing")
async def connect_pairing(data: dict):
    """Conecta via código de pareamento"""
    instance_name = data.get("instanceName")
    phone_number = data.get("phoneNumber", "").replace("+", "").replace(" ", "")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{EVOLUTION_URL}/instance/connect/{instance_name}",
                headers=get_headers(),
                params={"number": phone_number}
            )
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "pairingCode": result.get("pairingCode"),
                    "code": result.get("code")
                }
            return {"success": False, "message": f"Error: {response.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

# ========== Messaging ==========

@router.post("/send")
async def send_text(data: SendTextRequest, db: Session = Depends(get_db)):
    """Envia mensagem de texto"""
    inst = db.query(WhatsAppInstance).filter(WhatsAppInstance.instance_name == data.instanceName).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instância não encontrada")

    number = data.number.replace("+", "").replace(" ", "").replace("-", "")
    if not number.endswith("@s.whatsapp.net"):
        number = f"{number}@s.whatsapp.net"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{EVOLUTION_URL}/message/sendText/{data.instanceName}",
                headers=get_headers(),
                json={"number": number, "text": data.text}
            )
            if response.status_code == 201:
                return {"status": "sent"}
            return {"status": "error", "message": response.text}
        except Exception as e:
            return {"status": "error", "message": str(e)}

# ========== Webhook ==========

@router.post("/webhook")
async def webhook_handler(payload: dict, db: Session = Depends(get_db)):
    """Recebe webhooks da Evolution API"""
    event = payload.get("event")
    instance = payload.get("instance")
    data = payload.get("data", {})

    inst = db.query(WhatsAppInstance).filter(WhatsAppInstance.instance_name == instance).first()
    if not inst:
        return {"status": "ignored"}

    if event == "connection.update":
        state = data.get("state")
        if state == "open":
            inst.status = "connected"
            db.commit()
        elif state == "close":
            inst.status = "disconnected"
            db.commit()

    return {"status": "ok"}

# ========== Helper Functions ==========

async def get_instance_status_from_api(instance_name: str) -> dict:
    """Get instance status from Evolution API"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{EVOLUTION_URL}/instance/connectionState/{instance_name}",
                headers=get_headers()
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "state": data.get("instance", {}).get("state", "disconnected"),
                    "status": data.get("instance", {}).get("state", "disconnected")
                }
        except: pass
    return {"state": "disconnected", "status": "disconnected"}

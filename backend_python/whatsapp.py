"""
WhatsApp Integration - Evolution API
Endpoints para conectar e enviar mensagens via Evolution API
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
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
EVOLUTION_URL = os.getenv("WHATSAPP_URL", "http://evolution:8080")
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
async def get_instances(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista instâncias do usuário com cache de 30s"""
    cache_key = f"whatsapp:instances:{current_user.company_id}"
    cached = get_cache(cache_key)
    if cached:
        logger.debug("Cache HIT: whatsapp instances")
        return cached
    
    instances = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.company_id == current_user.company_id
    ).all()
    
    result = []
    for inst in instances:
        # Get status from Evolution API
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
    # Check if already exists
    existing = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == data.instanceName,
        WhatsAppInstance.company_id == current_user.company_id
    ).first()
    
    if not existing:
        new_inst = WhatsAppInstance(
            user_id=current_user.id,
            company_id=current_user.company_id,
            instance_name=data.instanceName,
            instance_key=data.instanceName,
            status="disconnected"
        )
        db.add(new_inst)
        db.commit()
        db.refresh(new_inst)
        existing = new_inst

    # Create instance in Evolution API
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{EVOLUTION_URL}/instance/create",
                headers=get_headers(),
                json={
                    "instanceName": data.instanceName,
                    "qrcode": False, # Disable auto-QR to allow Pairing Code to work
                    "integration": "WHATSAPP-BAILEYS"
                }
            )
            if response.status_code == 201:
                return {"status": "created", "instance": data.instanceName}
            elif response.status_code == 403:
                # Instance already exists in Evolution
                return {"status": "exists", "instance": data.instanceName}
            else:
                logger.error(f"Evolution create error: {response.text}")
                return {"status": "created", "instance": data.instanceName}
        except Exception as e:
            logger.error(f"Error creating instance: {e}")
            return {"status": "created_local", "instance": data.instanceName}

@router.delete("/instances/{instance_name}")
async def delete_instance(instance_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Deleta uma instância"""
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == instance_name,
        WhatsAppInstance.company_id == current_user.company_id
    ).first()
    
    if inst:
        # Delete from Evolution API
        async with httpx.AsyncClient() as client:
            try:
                await client.delete(
                    f"{EVOLUTION_URL}/instance/delete/{instance_name}",
                    headers=get_headers()
                )
            except Exception as e:
                logger.error(f"Error deleting instance from Evolution: {e}")
        
        db.delete(inst)
        db.commit()
        
    return {"status": "deleted"}

# ========== Connection ==========

@router.get("/status/{instance_name}")
async def get_status(instance_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtém status da conexão"""
    status_data = await get_instance_status_from_api(instance_name)
    return {"instance": {"instanceName": instance_name, **status_data}}

@router.get("/status")
async def get_all_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtém status de todas as instâncias do usuário"""
    instances = db.query(WhatsAppInstance).filter(WhatsAppInstance.company_id == current_user.company_id).all()
    if not instances:
        return {"instance": None}
    
    # Return status of the first one for now (frontend expectation)
    inst = instances[0]
    status_data = await get_instance_status_from_api(inst.instance_name)
    return {"instance": {"instanceName": inst.instance_name, **status_data}}

@router.post("/connect")
async def connect_whatsapp(data: ConnectRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Conecta WhatsApp e retorna QR Code"""
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == data.instanceName,
        WhatsAppInstance.company_id == current_user.company_id
    ).first()
    
    if not inst:
        # Create instance if doesn't exist
        inst = WhatsAppInstance(
            user_id=current_user.id,
            company_id=current_user.company_id,
            instance_name=data.instanceName,
            instance_key=data.instanceName,
            status="disconnected"
        )
        db.add(inst)
        db.commit()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # First, try to create instance
            await client.post(
                f"{EVOLUTION_URL}/instance/create",
                headers=get_headers(),
                json={
                    "instanceName": data.instanceName,
                    "qrcode": False, # Disable auto-QR
                    "integration": "WHATSAPP-BAILEYS"
                }
            )
        except:
            pass  # Instance may already exist

        try:
            # Get QR Code
            response = await client.get(
                f"{EVOLUTION_URL}/instance/connect/{data.instanceName}",
                headers=get_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                # Evolution returns base64 QR code
                return {
                    "status": "qr_generated",
                    "base64": result.get("base64"),
                    "code": result.get("code"),
                    "pairingCode": result.get("pairingCode")
                }
            else:
                # Try fetching connection state
                status_resp = await client.get(
                    f"{EVOLUTION_URL}/instance/connectionState/{data.instanceName}",
                    headers=get_headers()
                )
                if status_resp.status_code == 200:
                    status_data = status_resp.json()
                    if status_data.get("instance", {}).get("state") == "open":
                        return {"status": "already_connected"}
                
                return {"status": "error", "message": "Could not get QR"}
        except Exception as e:
            logger.error(f"Connect error: {e}")
            return {"status": "error", "message": str(e)}

@router.post("/logout")
async def logout_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Desconecta todas as instâncias do usuário"""
    instances = db.query(WhatsAppInstance).filter(WhatsAppInstance.company_id == current_user.company_id).all()
    for inst in instances:
        async with httpx.AsyncClient() as client:
            try:
                await client.delete(f"{EVOLUTION_URL}/instance/logout/{inst.instance_name}", headers=get_headers())
            except:
                pass
    return {"status": "logged_out"}

@router.post("/connect-pairing")
async def connect_pairing(data: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Conecta via código de pareamento"""
    instance_name = data.get("instanceName")
    phone_number = data.get("phoneNumber", "").replace("+", "").replace(" ", "")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Use GET instead of POST for Pairing Code
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
            return {"success": False, "fallbackToQR": True, "message": f"Error: {response.status_code}"}
        except Exception as e:
            logger.error(f"Pairing error: {e}")
            return {"success": False, "fallbackToQR": True, "message": str(e)}

# ========== Messaging ==========

@router.post("/send")
async def send_text(data: SendTextRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Envia mensagem de texto"""
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == data.instanceName,
        WhatsAppInstance.company_id == current_user.company_id
    ).first()
    
    if not inst:
        raise HTTPException(status_code=404, detail="Instância não encontrada")

    # Format number
    number = data.number.replace("+", "").replace(" ", "").replace("-", "")
    if not number.endswith("@s.whatsapp.net"):
        number = f"{number}@s.whatsapp.net"

    # Log message
    new_msg = Message(
        instance_id=inst.id,
        receiver_number=data.number,
        content=data.text,
        direction="outbound",
        status="pending"
    )
    db.add(new_msg)
    db.commit()

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{EVOLUTION_URL}/message/sendText/{data.instanceName}",
                headers=get_headers(),
                json={
                    "number": number,
                    "text": data.text
                }
            )
            if response.status_code == 201:
                new_msg.status = "sent"
                db.commit()
                result = response.json()
                return {"status": "sent", "messageId": result.get("key", {}).get("id")}
            else:
                new_msg.status = "error"
                db.commit()
                logger.error(f"Send error: {response.text}")
                return {"status": "error", "message": response.text}
        except Exception as e:
            new_msg.status = "error"
            db.commit()
            logger.error(f"Send exception: {e}")
            return {"status": "error", "message": str(e)}

@router.post("/send-media")
async def send_media(data: SendMediaRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Envia mídia (imagem, vídeo, documento, áudio)"""
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == data.instanceName,
        WhatsAppInstance.company_id == current_user.company_id
    ).first()
    
    if not inst:
        raise HTTPException(status_code=404, detail="Instância não encontrada")

    number = data.number.replace("+", "").replace(" ", "").replace("-", "")
    if not number.endswith("@s.whatsapp.net"):
        number = f"{number}@s.whatsapp.net"

    # Log message
    new_msg = Message(
        instance_id=inst.id,
        receiver_number=data.number,
        content=f"[Media: {data.mediaType}] {data.caption or ''}",
        direction="outbound",
        status="pending"
    )
    db.add(new_msg)
    db.commit()

    # Map media type to Evolution endpoint
    endpoint_map = {
        "image": "sendMedia",
        "video": "sendMedia",
        "audio": "sendWhatsAppAudio",
        "document": "sendMedia"
    }
    
    media_type_map = {
        "image": "image",
        "video": "video",
        "audio": "audio",
        "document": "document"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            payload = {
                "number": number,
                "mediatype": media_type_map.get(data.mediaType, "document"),
                "media": data.media,
                "caption": data.caption or ""
            }
            
            if data.fileName:
                payload["fileName"] = data.fileName
            
            response = await client.post(
                f"{EVOLUTION_URL}/message/{endpoint_map.get(data.mediaType, 'sendMedia')}/{data.instanceName}",
                headers=get_headers(),
                json=payload
            )
            
            if response.status_code == 201:
                new_msg.status = "sent"
                db.commit()
                return {"status": "sent"}
            else:
                new_msg.status = "error"
                db.commit()
                return {"status": "error", "message": response.text}
        except Exception as e:
            new_msg.status = "error"
            db.commit()
            logger.error(f"Send media error: {e}")
            return {"status": "error", "message": str(e)}

# ========== Webhook ==========

@router.post("/webhook")
async def webhook_handler(payload: dict, db: Session = Depends(get_db)):
    """Recebe webhooks da Evolution API"""
    event = payload.get("event")
    instance = payload.get("instance")
    data = payload.get("data", {})
    
    # logger.info(f"Webhook: {event} for {instance}")
    
    # Find instance
    inst = db.query(WhatsAppInstance).filter(
        WhatsAppInstance.instance_name == instance
    ).first()
    
    if not inst:
        return {"status": "ignored", "reason": "instance_not_found"}
    
    if event == "connection.update":
        state = data.get("state")
        if state == "open":
            inst.status = "connected"
            db.commit()
        elif state == "close":
            # Auto-disconnect logic
            inst.status = "disconnected"
            
            # 1. Create Notification
            new_notif = Notification(
                user_id=inst.user_id,
                company_id=inst.company_id,
                title="WhatsApp Desconectado",
                message=f"A conexão com o WhatsApp '{inst.instance_name}' foi perdida. Por favor, reconecte novamente.",
                type="error",
                link="/configuracoes?section=whatsapp"
            )
            db.add(new_notif)
            
            # 2. Delete Instance from DB (as requested: "excluir a instancia automaticamente")
            # We also try to delete from Evolution to be clean
            instance_name = inst.instance_name
            db.delete(inst)
            db.commit()
            
            # 3. Background task to delete from Evolution (fire and forget)
            # We can't easily do background tasks here without importing BackgroundTasks from fastapi
            # So we'll just try to delete it here, but catch errors to not block
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                     await client.delete(
                        f"{EVOLUTION_URL}/instance/delete/{instance_name}",
                        headers=get_headers()
                    )
            except Exception as e:
                logger.error(f"Error auto-deleting instance from Evolution: {e}")
        else:
            db.commit()
        
    elif event == "qrcode.updated":
        # QR code updated - could notify frontend via websocket
        pass
    
    return {"status": "ok"}

# ========== Send Quote ==========

class SendQuoteRequest(BaseModel):
    instanceName: str
    number: str
    solicitacaoId: int
    valorTotal: float
    descricao: str

@router.post("/send-quote")
async def send_quote(data: SendQuoteRequest, db: Session = Depends(get_db)):
    """Envia orçamento via WhatsApp"""
    message = f"""*📋 ORÇAMENTO - Inovar Refrigeração*

📝 *{data.descricao}*

💰 *Valor Total:* R$ {data.valorTotal:.2f}

🔗 Para aprovar este orçamento, responda esta mensagem com *SIM*

_Válido por 7 dias_"""

    # Reuse send logic
    number = data.number
    if not number.endswith("@s.whatsapp.net"):
        number = f"{number}@s.whatsapp.net"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{EVOLUTION_URL}/message/sendText/{data.instanceName}",
                headers=get_headers(),
                json={"number": number, "text": message}
            )
            if response.status_code == 201:
                return {"status": "sent", "message": "Orçamento enviado"}
            return {"status": "error", "message": response.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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
        except:
            pass
    return {"state": "disconnected", "status": "disconnected"}

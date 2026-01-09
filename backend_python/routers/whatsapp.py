
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from sqlalchemy import text
import httpx
import os
import logging

logger = logging.getLogger(__name__)

from services.whatsapp_service import wpp_request, generate_token, WPPCONNECT_SESSION, WPPCONNECT_SECRET, WPPCONNECT_URL

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

class ConfigUpdate(BaseModel):
    min_delay: Optional[int] = None
    max_delay: Optional[int] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    ativo: Optional[bool] = None

class MessageSend(BaseModel):
    number: str
    message: str
    media_url: Optional[str] = None


@router.get("/status")
async def get_status(db: Session = Depends(get_db)):
    """Returns the current connection status."""
    try:
        # Try WPPConnect first
        try:
            response = await wpp_request("GET", "/check-connection-session")
            if response.status_code == 200:
                data = response.json()
                connected = data.get("status") == True or data.get("message") == "Connected"
                
                # Update local DB
                try:
                    status_text = "conectado" if connected else "desconectado"
                    sql = text("""
                        INSERT INTO bot_status (id, status_conexao, ultima_atualizacao)
                        VALUES (1, :status, CURRENT_TIMESTAMP)
                        ON CONFLICT (id) DO UPDATE SET status_conexao = :status, ultima_atualizacao = CURRENT_TIMESTAMP
                    """)
                    db.execute(sql, {"status": status_text})
                    db.commit()
                except Exception as e:
                    logger.warning(f"Could not update local status: {e}")
                
                return {
                    "connected": connected,
                    "status": "conectado" if connected else "desconectado",
                    "session": WPPCONNECT_SESSION,
                    "provider": "wppconnect"
                }
        except Exception as e:
            logger.debug(f"WPPConnect not available: {e}")
        
        # Fallback to local DB
        res = db.execute(text("SELECT status_conexao, qr_code_base64, pairing_code, ultima_atualizacao FROM bot_status WHERE id = 1")).fetchone()
        if res:
            return {
                "connected": res[0] == 'conectado',
                "status": res[0] or "desconectado",
                "qr_code": res[1],
                "pairing_code": res[2],
                "last_update": str(res[3]) if res[3] else None,
                "provider": "local"
            }
        return {"status": "desconectado", "connected": False, "provider": "none"}
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return {"status": "error", "detail": str(e), "connected": False}


@router.post("/start-session")
async def start_session(db: Session = Depends(get_db)):
    """Start a new WPPConnect session."""
    try:
        # First generate token
        url = f"{WPPCONNECT_URL}/{WPPCONNECT_SESSION}/{WPPCONNECT_SECRET}/generate-token"
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_response = await client.post(url)
            
            if token_response.status_code in [200, 201]:
                token_data = token_response.json()
                token = token_data.get("token")
                
                if token:
                    # Start session
                    start_url = f"{WPPCONNECT_URL}/api/{WPPCONNECT_SESSION}/start-session"
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    }
                    start_response = await client.post(start_url, headers=headers, json={
                        "webhook": None,
                        "waitQrCode": True
                    })
                    
                    if start_response.status_code in [200, 201]:
                        return {
                            "message": "Session started",
                            "session": WPPCONNECT_SESSION,
                            "status": "starting"
                        }
        
        return {"message": "Could not start session", "status": "error"}
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qrcode")
async def get_qrcode(db: Session = Depends(get_db)):
    """Get QR code for WhatsApp connection."""
    try:
        # Start session first if needed
        await start_session(db)
        
        # Get QR code
        response = await wpp_request("GET", "/qrcode-session")
        if response.status_code == 200:
            data = response.json()
            qr_base64 = data.get("qrcode", data.get("base64"))
            
            # Save to DB
            if qr_base64:
                try:
                    sql = text("""
                        INSERT INTO bot_status (id, status_conexao, qr_code_base64, ultima_atualizacao)
                        VALUES (1, 'aguardando_qr', :qr, CURRENT_TIMESTAMP)
                        ON CONFLICT (id) DO UPDATE SET 
                            status_conexao = 'aguardando_qr', 
                            qr_code_base64 = :qr, 
                            ultima_atualizacao = CURRENT_TIMESTAMP
                    """)
                    db.execute(sql, {"qr": qr_base64})
                    db.commit()
                except Exception as e:
                    logger.warning(f"Could not save QR to DB: {e}")
            
            return {
                "qr_code": qr_base64,
                "session": WPPCONNECT_SESSION,
                "provider": "wppconnect"
            }
        
        # Fallback - return from DB
        res = db.execute(text("SELECT qr_code_base64, pairing_code FROM bot_status WHERE id = 1")).fetchone()
        if res:
            return {
                "qr_code": res[0],
                "pairing_code": res[1],
                "provider": "local"
            }
        return {"qr_code": None, "message": "Start session first"}
    except Exception as e:
        logger.error(f"Error getting QR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
def get_config(db: Session = Depends(get_db)):
    """Returns current bot config."""
    try:
        res = db.execute(text("SELECT min_delay, max_delay, hora_inicio, hora_fim, ativo, bot_nome FROM bot_config LIMIT 1")).fetchone()
        if res:
            return {
                "min_delay": res[0] or 15,
                "max_delay": res[1] or 45,
                "hora_inicio": str(res[2]) if res[2] else "08:00",
                "hora_fim": str(res[3]) if res[3] else "21:00",
                "ativo": res[4] if res[4] is not None else True,
                "bot_nome": res[5] or "Inovar Bot"
            }
        return {
            "min_delay": 15,
            "max_delay": 45,
            "hora_inicio": "08:00",
            "hora_fim": "21:00",
            "ativo": True,
            "bot_nome": "Inovar Bot"
        }
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        return {"min_delay": 15, "max_delay": 45, "hora_inicio": "08:00", "hora_fim": "21:00", "ativo": True, "bot_nome": "Inovar Bot"}


@router.put("/config")
def update_config(config: ConfigUpdate, db: Session = Depends(get_db)):
    """Updates the bot configuration."""
    updates = []
    params = {}

    if config.min_delay is not None:
        updates.append("min_delay = :min_delay")
        params["min_delay"] = config.min_delay
    if config.max_delay is not None:
        updates.append("max_delay = :max_delay")
        params["max_delay"] = config.max_delay
    if config.hora_inicio is not None:
        updates.append("hora_inicio = :hora_inicio")
        params["hora_inicio"] = config.hora_inicio
    if config.hora_fim is not None:
        updates.append("hora_fim = :hora_fim")
        params["hora_fim"] = config.hora_fim
    if config.ativo is not None:
        updates.append("ativo = :ativo")
        params["ativo"] = config.ativo

    if not updates:
        return {"message": "No changes provided"}

    try:
        sql = text(f"UPDATE bot_config SET {', '.join(updates)}")
        db.execute(sql, params)
        db.commit()
        return {"message": "Config updated successfully"}
    except Exception as e:
        logger.error(f"Error updating config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect")
async def disconnect(db: Session = Depends(get_db)):
    """Disconnect/logout WhatsApp session."""
    try:
        response = await wpp_request("POST", "/logout-session")
        
        # Update local status
        sql = text("""
            UPDATE bot_status SET status_conexao = 'desconectado', qr_code_base64 = NULL, ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = 1
        """)
        db.execute(sql)
        db.commit()
        
        return {"message": "Disconnected successfully"}
    except Exception as e:
        logger.error(f"Error disconnecting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
async def send_message_api(msg: MessageSend, db: Session = Depends(get_db)):
    """Send a message via WhatsApp."""
    try:
        # Clean phone number
        clean_number = "".join(filter(str.isdigit, msg.number))
        if not clean_number.startswith("55"):
            clean_number = "55" + clean_number
        
        # Format for WPPConnect (needs @c.us suffix)
        wpp_number = f"{clean_number}@c.us"
        
        # Try WPPConnect
        try:
            if msg.media_url:
                # Send image
                data = {
                    "phone": wpp_number,
                    "path": msg.media_url,
                    "caption": msg.message
                }
                response = await wpp_request("POST", "/send-image", data)
            else:
                # Send text
                data = {
                    "phone": wpp_number,
                    "message": msg.message
                }
                response = await wpp_request("POST", "/send-message", data)
            
            if response.status_code in [200, 201]:
                logger.info(f"Message sent via WPPConnect to {clean_number}")
                return {"message": "Message sent successfully", "provider": "wppconnect"}
            else:
                logger.warning(f"WPPConnect error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.warning(f"WPPConnect not available, queuing message: {e}")
        
        # Fallback: Queue message
        sql = text("""
            INSERT INTO fila_envio (numero, mensagem, media_url, status, created_at)
            VALUES (:numero, :mensagem, :media_url, 'pendente', CURRENT_TIMESTAMP)
        """)
        db.execute(sql, {
            "numero": clean_number,
            "mensagem": msg.message,
            "media_url": msg.media_url
        })
        db.commit()
        
        return {"message": "Message queued successfully", "provider": "queue"}
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue")
def get_queue(db: Session = Depends(get_db)):
    """Get pending messages in queue."""
    try:
        res = db.execute(text("SELECT id, numero, mensagem, status, created_at FROM fila_envio ORDER BY created_at DESC LIMIT 50")).fetchall()
        return [
            {
                "id": r[0],
                "numero": r[1],
                "mensagem": r[2][:100] + "..." if len(r[2]) > 100 else r[2],
                "status": r[3],
                "created_at": str(r[4]) if r[4] else None
            }
            for r in res
        ]
    except Exception as e:
        logger.error(f"Error getting queue: {e}")
        return []


@router.get("/contacts")
async def get_contacts():
    """Get all WhatsApp contacts."""
    try:
        response = await wpp_request("GET", "/all-contacts")
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        logger.error(f"Error getting contacts: {e}")
        return []


@router.get("/chats")
async def get_chats():
    """Get all WhatsApp chats."""
    try:
        response = await wpp_request("GET", "/all-chats")
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        logger.error(f"Error getting chats: {e}")
        return []


from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from sqlalchemy import text
from whatsapp_engine import brain

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

class ConfigUpdate(BaseModel):
    min_delay: Optional[int] = None
    max_delay: Optional[int] = None
    hora_inicio: Optional[str] = None
    hora_fim: Optional[str] = None
    ativo: Optional[bool] = None

@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    """Returns the current connection status from DB (Source of Truth)."""
    try:
        res = db.execute(text("SELECT status_conexao, qr_code_base64, ultima_atualizacao FROM bot_status WHERE id = 1")).fetchone()
        if res:
            return {
                "connected": res[0] == 'conectado',
                "status": res[0],
                "qr_code": res[1],
                "last_update": res[2]
            }
        return {"status": "unknown", "connected": False}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("/config")
def get_config(db: Session = Depends(get_db)):
    """Returns current Anti-Ban config."""
    try:
        res = db.execute(text("SELECT min_delay, max_delay, hora_inicio, hora_fim, ativo, bot_nome FROM bot_config LIMIT 1")).fetchone()
        if res:
            return {
                "min_delay": res[0],
                "max_delay": res[1],
                "hora_inicio": str(res[2]),
                "hora_fim": str(res[3]),
                "ativo": res[4],
                "bot_nome": res[5]
            }
        return {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config")
def update_config(config: ConfigUpdate, db: Session = Depends(get_db)):
    """Updates the Anti-Ban configuration in DB."""
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

    sql = text(f"UPDATE bot_config SET {', '.join(updates)}")
    db.execute(sql, params)
    db.commit()

    # Force Brain to refresh stats immediately
    brain.refresh_config()

    return {"message": "Config updated successfully"}

@router.post("/reconnect")
def reconnect():
    """Forces a reconnection logic."""
    # Since Brain runs in a loop, we can perhaps toggle active state or restart client?

class MessageSend(BaseModel):
    number: str
    message: str
    media_url: Optional[str] = None

@router.post("/send")
def send_message_api(msg: MessageSend, db: Session = Depends(get_db)):
    """Enqueues a message to be sent by the Brain."""
    try:
        # Basic validation (remove non-digits)
        clean_number = "".join(filter(str.isdigit, msg.number))

        sql = text("""
            INSERT INTO fila_envio (numero, mensagem, media_url, status)
            VALUES (:numero, :mensagem, :media_url, 'pendente')
        """)
        db.execute(sql, {
            "numero": clean_number,
            "mensagem": msg.message,
            "media_url": msg.media_url
        })
        db.commit()
        return {"message": "Message enqueued successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

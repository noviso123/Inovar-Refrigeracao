
import asyncio
import os
import random
import logging
from datetime import datetime, time
import json
from typing import Optional
import base64

# Neonize Imports
from neonize.client import NewClient
from neonize.events import (
    ConnectedEv,
    MessageEv,
    PairStatusEv,
    LoggedOutEv,
    event,
    EventIndex
)
from neonize.types import MessageServerID
from neonize.utils import log
from neonize.utils.enum import ReceiptType

# Database
from database import SessionLocal
from sqlalchemy import text

# Logging
logger = logging.getLogger(__name__)

# Constants
SESSION_PATH = "whatsapp_session.sqlite3"

class WhatsappBrain:
    def __init__(self):
        self.client = NewClient(SESSION_PATH)
        self.is_connected = False
        self.is_running = False

        # Initial Config Cache
        self.config = {
            "min_delay": 15,
            "max_delay": 45,
            "hora_inicio": "08:00",
            "hora_fim": "21:00",
            "ativo": True
        }

        # Register Events
        self.register_events()

    def register_events(self):
        @self.client.event(ConnectedEv)
        def on_connected(client: NewClient, message: ConnectedEv):
            logger.info("🟢 WhatsApp Connected!")
            self.is_connected = True
            self.update_bot_status("conectado", qr_code=None)

        @self.client.event(LoggedOutEv)
        def on_logout(client: NewClient, message: LoggedOutEv):
            logger.info("🔴 WhatsApp Logged Out")
            self.is_connected = False
            self.update_bot_status("desconectado")

        @self.client.event(PairStatusEv)
        def on_pair_status(client: NewClient, message: PairStatusEv):
            logger.info(f"🔄 Pair Status: {message}")
            try:
                # Neonize/Whatsmeow PairStatusEv often contains the QR code data or ID
                # We need to extract it. If message is a list/string, we parse it.
                # NOTE: In Python Neonize binding, exact extraction depends on structure.
                # Assuming we can get the QR string via client.qr() if this event fires
                # or constructing it from the message ID if provided.

                # For now, let's try to grab from client property if exposed, or fallback
                # Neonize typically prints QR to stdout.
                # We will set status to 'aguardando_qr' so frontend knows.
                self.update_bot_status("aguardando_qr")
            except Exception as e:
                logger.error(f"Error handling pair status: {e}")

        @self.client.event(MessageEv)
        def on_message(client: NewClient, message: MessageEv):
            logger.info(f"📩 Message Received: {message}")

    async def start(self):
        """Starts the Neonize client and the Brain loop in background."""
        self.is_running = True

        # 1. Start Neonize Client in Thread
        import threading
        t = threading.Thread(target=self.client.connect, daemon=True)
        t.start()

        logger.info("🚀 WhatsApp Brain Started (Background Thread)")

        # 2. Start Request Processing Loop
        asyncio.create_task(self.process_queue_loop())

    async def process_queue_loop(self):
        """The 'Brain' loop that checks queue vs anti-ban rules."""
        logger.info("🧠 Brain Loop Initiated")

        while self.is_running:
            try:
                # Update Config cache occasionally
                if random.random() < 0.1: # 10% chance each loop
                    self.refresh_config()

                if not self.config.get("ativo"):
                    await asyncio.sleep(10)
                    continue

                # 1. Check Anti-Ban Hours
                if self.is_sleeping_time():
                    # logger.info("😴 Shhh... Brain is sleeping (Anti-Ban Hours)")
                    await asyncio.sleep(60)
                    continue

                if not self.is_connected:
                    await asyncio.sleep(5)
                    continue

                # 2. Fetch Pending Message (Table: fila_envio)
                msg = self.fetch_next_message()

                if msg:
                    logger.info(f"⚡ Processing Message ID: {msg['id']} to {msg['numero']}")

                    # 3. Simulate Human Typing
                    typing_delay = random.randint(3, 8)
                    # self.client.send_chat_state(msg['numero'], "composing")
                    await asyncio.sleep(typing_delay)

                    # 4. Send Message
                    try:
                        self.send_message_neonize(msg['numero'], msg['mensagem'], msg.get('media_url'))
                        self.update_message_status(msg['id'], 'enviado')
                        logger.info(f"✅ Message {msg['id']} Sent!")
                    except Exception as e:
                        logger.error(f"❌ Failed to send {msg['id']}: {e}")
                        self.update_message_status(msg['id'], 'erro', str(e))

                    # 5. Randomized Throttling (Anti-Ban)
                    min_d = self.config.get("min_delay", 15)
                    max_d = self.config.get("max_delay", 45)
                    delay = random.randint(min_d, max_d)
                    logger.info(f"⏳ Throttling for {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(5) # Queue empty

            except Exception as e:
                logger.error(f"⚠️ Brain Loop Error: {e}")
                await asyncio.sleep(5)

    def refresh_config(self):
        db = SessionLocal()
        try:
            sql = text("SELECT min_delay, max_delay, hora_inicio, hora_fim, ativo FROM bot_config LIMIT 1")
            res = db.execute(sql).fetchone()
            if res:
                self.config["min_delay"] = res[0]
                self.config["max_delay"] = res[1]
                self.config["hora_inicio"] = str(res[2])
                self.config["hora_fim"] = str(res[3])
                self.config["ativo"] = res[4]
        except Exception as e:
            logger.error(f"Config refresh error: {e}")
        finally:
            db.close()

    def is_sleeping_time(self):
        try:
            now = datetime.now().time()
            start_str = str(self.config.get("hora_inicio", "08:00"))
            end_str = str(self.config.get("hora_fim", "21:00"))

            # Simple conversion generic
            start = datetime.strptime(start_str, "%H:%M:%S").time() if len(start_str) > 5 else datetime.strptime(start_str, "%H:%M").time()
            end = datetime.strptime(end_str, "%H:%M:%S").time() if len(end_str) > 5 else datetime.strptime(end_str, "%H:%M").time()

            # Logic: Active between Start and End.
            # So Sleeping if NOW < Start OR NOW > End
            if start < end:
                return now < start or now > end
            else: # Crosses midnight (e.g. 22:00 to 06:00)
                return not (start <= now or now <= end)
        except:
            return False # Fail safe: awake

    def fetch_next_message(self):
        """Fetch one pending message from fila_envio."""
        db = SessionLocal()
        try:
            # Postgres Specific: FOR UPDATE SKIP LOCKED
            sql = text("SELECT id, numero, mensagem, media_url FROM fila_envio WHERE status = 'pendente' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED")
            result = db.execute(sql).fetchone()
            if result:
                 # Mark as processing
                 update_sql = text("UPDATE fila_envio SET status = 'processando' WHERE id = :id")
                 db.execute(update_sql, {"id": result[0]})
                 db.commit()
                 return {"id": result[0], "numero": result[1], "mensagem": result[2], "media_url": result[3]}
            return None
        except Exception as e:
            logger.error(f"DB Error fetching queue: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    def update_message_status(self, msg_id, status, error=None):
        db = SessionLocal()
        try:
             sql = text("UPDATE fila_envio SET status = :status, erro_log = :error, enviado_em = NOW() WHERE id = :id")
             db.execute(sql, {"status": status, "error": error, "id": msg_id})
             db.commit()
        except Exception as e:
            logger.error(f"DB Error updating status: {e}")
        finally:
            db.close()

    def update_bot_status(self, status, qr_code=None):
        db = SessionLocal()
        try:
             # Upsert ID=1
             sql = text("""
                INSERT INTO bot_status (id, status_conexao, qr_code_base64, ultima_atualizacao)
                VALUES (1, :status, :qr, NOW())
                ON CONFLICT (id) DO UPDATE
                SET status_conexao = :status, qr_code_base64 = :qr, ultima_atualizacao = NOW()
             """)
             db.execute(sql, {"status": status, "qr": qr_code})
             db.commit()
        except Exception as e:
            logger.error(f"DB Error updating bot status: {e}")
        finally:
            db.close()

    def send_message_neonize(self, phone, body, media_url=None):
        """Wrapper to call Neonize send methods."""
        jid = self.client.build_jid(phone)

        if media_url:
            body = f"{body}\n\n📎 {media_url}"

        self.client.send_message(jid, body)

# Global Instance
brain = WhatsappBrain()

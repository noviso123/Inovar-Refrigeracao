import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from database import get_db, engine
from models import User, ServiceOrder, Client

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_maintenance_reminders():
    """
    Checks all users' automation settings and enqueues reminders for eligible clients.
    """
    logger.info("Running Maintenance Reminder Check...")

    from datetime import timedelta

    # Create new session
    with Session(engine) as db:
        try:
            # 1. Get Users with Automation Enabled
            users = db.query(User).filter(User.automacao.isnot(None)).all()

            for user in users:
                config = user.automacao
                if not config or not config.get('lembreteManutencao'):
                    continue

                default_interval = int(config.get('intervaloMeses', 6))
                template_msg = config.get('templateMensagem', "Olá {cliente}, sua manutenção venceu em {data}.")
                
                # 2. Find all clients
                clients = db.query(Client).all()

                for client in clients:
                    if not client.phone:
                        continue

                    # Use client's specific period or user's default
                    interval = client.maintenance_period or default_interval
                    if not interval:
                        continue

                    # 3. Find last completed maintenance OS for this client
                    last_os = db.query(ServiceOrder).filter(
                        ServiceOrder.client_id == client.id,
                        ServiceOrder.service_type == "preventiva",
                        ServiceOrder.status.in_(["concluido", "finalizado", "Concluído", "Finalizado"])
                    ).order_by(ServiceOrder.completed_at.desc()).first()

                    if not last_os or not last_os.completed_at:
                        base_date = client.created_at or datetime.utcnow()
                    else:
                        base_date = last_os.completed_at

                    due_date = base_date + timedelta(days=interval * 30)
                    
                    if datetime.utcnow() > due_date:
                        # 5. Prevent duplicate reminders
                        clean_phone = "".join(filter(str.isdigit, client.phone))
                        
                        recent_reminder = db.execute(text(
                            "SELECT id FROM fila_envio WHERE numero = :num AND created_at > :limit"
                        ), {
                            "num": clean_phone,
                            "limit": datetime.utcnow() - timedelta(days=20)
                        }).fetchone()

                        if recent_reminder:
                            continue

                        # 6. Enqueue message
                        msg = template_msg.replace("{cliente}", client.name).replace("{data}", due_date.strftime("%d/%m/%Y"))
                        
                        db.execute(text(
                            "INSERT INTO fila_envio (numero, mensagem, status, created_at) VALUES (:num, :msg, 'pendente', :now)"
                        ), {
                            "num": clean_phone,
                            "msg": msg,
                            "now": datetime.utcnow()
                        })
                        db.commit()
                        logger.info(f"Maintenance reminder enqueued for {client.name} ({clean_phone})")

        except Exception as e:
            logger.error(f"Error in check_maintenance_reminders: {e}")
            db.rollback()

    logger.info("✅ Maintenance Check Complete.")

def start_scheduler():
    # Run daily at 09:00 AM
    scheduler.add_job(check_maintenance_reminders, CronTrigger(hour=9, minute=0))
    scheduler.start()
    logger.info("📅 Scheduler started (Daily at 09:00)")

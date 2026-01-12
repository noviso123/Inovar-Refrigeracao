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
            # Global default configuration (since user automation is removed)
            default_interval = 6
            template_msg = "Olá {cliente}, sua manutenção venceu em {data}."
            
            # Find all clients
            clients = db.query(Client).all()

            for client in clients:
                if not client.phone:
                    continue

                # Use client's specific period or default
                interval = client.maintenance_period or default_interval
                if not interval:
                    continue

                # Find last completed maintenance OS for this client
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
                    # Prevent duplicate notifications within 20 days
                    from models import Notification
                    
                    recent_notification = db.query(Notification).filter(
                        Notification.type == "maintenance_reminder",
                        Notification.message.contains(client.name),
                        Notification.created_at > (datetime.utcnow() - timedelta(days=20))
                    ).first()

                    if recent_notification:
                        continue

                    # Create notification for maintenance reminder
                    msg = template_msg.replace("{cliente}", client.name).replace("{data}", due_date.strftime("%d/%m/%Y"))
                    
                    notification = Notification(
                        user_id=None,  # System notification (visible to all admins)
                        title="Lembrete de Manutenção",
                        message=f"Cliente: {client.name} | {msg}",
                        type="maintenance_reminder",
                        link=f"/clientes/{client.id}"
                    )
                    db.add(notification)
                    db.commit()
                    
                    logger.info(f"✅ Maintenance reminder created for {client.name}")

        except Exception as e:
            logger.error(f"❌ Error in check_maintenance_reminders: {e}")
            db.rollback()

    logger.info("=" * 50)
    logger.info("=" * 50)
    logger.info("✅ Maintenance Check Complete.")

def start_scheduler():
    """
    Start the AsyncIOScheduler for background tasks.
    Runs maintenance reminder checks daily at 09:00 AM.
    """
    # Run daily at 09:00 AM
    scheduler.add_job(
        check_maintenance_reminders, 
        CronTrigger(hour=9, minute=0),
        id="maintenance_reminders",
        replace_existing=True,
        misfire_grace_time=3600  # Allow 1 hour grace period for missed jobs
    )
    
    scheduler.start()
    logger.info("📅 Scheduler started successfully")
    logger.info("📅 Maintenance check scheduled for daily at 09:00 AM")
    logger.info("=" * 50)

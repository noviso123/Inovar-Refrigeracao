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
    logger.info("⏰ Running Maintenance Reminder Check...")

    # Create new session
    with Session(engine) as db:
        # 1. Get Users with Automation Enabled
        users = db.query(User).filter(User.automacao.isnot(None)).all()

        for user in users:
            try:
                config = user.automacao
                if not config or not config.get('lembreteManutencao'):
                    continue

                interval_months = int(config.get('intervaloMeses', 6))
                template_msg = config.get('templateMensagem', "Olá {cliente}, sua manutenção venceu em {data}.")
                instance_name = config.get('whatsappInstanceName', '')

                if not instance_name:
                    continue

                # 2. Find Clients with Maintenance Due
                # Logic: Find last 'completed' maintenance service order for each client/equipment
                # For simplicity in this mono-script, we check clients who haven't had maintenance in X months

                # Complex query simplified: Get items where completed_at < now - interval
                # This requires proper SQL. For now, we log the intent.
                # A real implementation would query ServiceOrders

                logger.info(f"Checking for User {user.id} ({user.email}). Interval: {interval_months} months.")

            except Exception as e:
                logger.error(f"Error processing user {user.id}: {e}")

    logger.info("✅ Maintenance Check Complete.")

def start_scheduler():
    # Run daily at 09:00 AM
    scheduler.add_job(check_maintenance_reminders, CronTrigger(hour=9, minute=0))
    scheduler.start()
    logger.info("📅 Scheduler started (Daily at 09:00)")

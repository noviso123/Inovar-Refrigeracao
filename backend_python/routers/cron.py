import logging
from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db, engine
from models import User, ServiceOrder, Client, Notification

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/cron",
    tags=["Cron Jobs"]
)

@router.get("/maintenance-reminders")
async def trigger_maintenance_reminders(
    authorization: str = Header(None)
):
    """
    Cron job endpoint to check maintenance reminders.
    This should be called by Vercel Cron once a day.
    """
    # Basic security check: Vercel sends a specific header for cron jobs
    # For now, we'll just log the attempt. In production, you can verify the Authorization header
    # if you set up CRON_SECRET in Vercel.
    logger.info(f"⏳ Cron Job Triggered: Maintenance Reminders (Auth: {authorization})")

    try:
        # Create new session manually since this might be a long running task
        # and we want to ensure we have a fresh connection
        with Session(engine) as db:
            await process_maintenance_reminders(db)
            
        return {"status": "success", "message": "Maintenance check completed"}
    except Exception as e:
        logger.error(f"❌ Cron Job Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_maintenance_reminders(db: Session):
    """
    Core logic for checking maintenance reminders.
    """
    logger.info("Running Maintenance Reminder Check...")

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
                    # 5. Prevent duplicate notifications within 20 days
                    recent_notification = db.query(Notification).filter(
                        Notification.type == "maintenance_reminder",
                        Notification.message.contains(client.name),
                        Notification.created_at > (datetime.utcnow() - timedelta(days=20))
                    ).first()

                    if recent_notification:
                        continue

                    # 6. Create notification for maintenance reminder
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
                    
                    logger.info(f"✅ Maintenance reminder created for {client.name} (phone: {client.phone})")

    except Exception as e:
        logger.error(f"❌ Error in process_maintenance_reminders: {e}")
        db.rollback()
        raise e

    logger.info("✅ Maintenance Check Complete.")

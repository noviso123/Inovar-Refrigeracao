"""
Notification Service - Inovar Refrigeração
Centraliza a criação de notificações para eventos do sistema.
Simplificado para arquitetura monolítica single-tenant.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import logging
import asyncio

from models import Notification, User

logger = logging.getLogger(__name__)

# Global reference to WebSocket manager (set at runtime)
_ws_manager = None

def set_ws_manager(manager):
    """Set the WebSocket manager reference for broadcasting"""
    global _ws_manager
    _ws_manager = manager

def _broadcast_notification_sync(user_id: int, notification_data: dict):
    """
    Fire-and-forget WebSocket broadcast (runs in background).
    """
    global _ws_manager
    if _ws_manager is None:
        return

    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            asyncio.create_task(_ws_manager.send_to_user(user_id, notification_data))
        else:
            logger.debug(f"No event loop for WebSocket broadcast to user {user_id}")
    except Exception as e:
        logger.debug(f"WebSocket broadcast skipped: {e}")

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    link: Optional[str] = None
) -> Notification:
    """
    Cria uma nova notificação para um usuário.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        read=False,
        link=link,
        created_at=datetime.utcnow()
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info(f"📬 Notificação criada para usuário {user_id}: {title}")

    # Broadcast via WebSocket
    notification_data = {
        "type": "notification",
        "notification": {
            "id": notification.id,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "link": link,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
            "read": False
        }
    }
    _broadcast_notification_sync(user_id, notification_data)

    return notification

def notify_welcome(db: Session, user: User) -> Optional[Notification]:
    """Envia notificação de boas-vindas."""
    existing = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.title.like("%Bem-vindo%")
    ).first()

    if existing:
        return None

    return create_notification(
        db=db,
        user_id=user.id,
        title="🎉 Bem-vindo ao Inovar Refrigeração!",
        message=f"Olá {user.full_name}! Explore o sistema e comece a gerenciar seus serviços.",
        notification_type="success",
        link="/dashboard"
    )

def notify_service_order_created(
    db: Session,
    order_id: int,
    order_title: str,
    client_name: str,
    created_by_id: int
) -> List[Notification]:
    """Notifica admins sobre nova OS."""
    notifications = []

    # Todos os admins e prestadores (exceto quem criou)
    users = db.query(User).filter(
        User.role.in_(["prestador", "admin"]),
        User.id != created_by_id
    ).all()

    for user in users:
        notif = create_notification(
            db=db,
            user_id=user.id,
            title="📋 Nova Ordem de Serviço",
            message=f"OS #{order_id} para {client_name}: {order_title}",
            notification_type="info",
            link=f"/solicitacoes/{order_id}"
        )
        notifications.append(notif)

    return notifications

def notify_service_order_assigned(
    db: Session,
    order_id: int,
    order_title: str,
    technician_id: int
) -> Optional[Notification]:
    """Notifica o prestador/técnico atribuído."""
    return create_notification(
        db=db,
        user_id=technician_id,
        title="🔧 OS Atribuída a Você",
        message=f"A OS #{order_id} ({order_title}) foi atribuída a você.",
        notification_type="info",
        link=f"/solicitacoes/{order_id}"
    )

def notify_service_order_completed(
    db: Session,
    order_id: int,
    order_title: str,
    technician_name: str
) -> List[Notification]:
    """Notifica admins sobre OS concluída."""
    notifications = []
    admins = db.query(User).filter(User.role == "admin").all()

    for admin in admins:
        notif = create_notification(
            db=db,
            user_id=admin.id,
            title="✅ OS Concluída",
            message=f"A OS #{order_id} foi concluída por {technician_name}.",
            notification_type="success",
            link=f"/solicitacoes/{order_id}"
        )
        notifications.append(notif)

    return notifications

def notify_nfse_issued(
    db: Session,
    user_id: int,
    nfse_number: str,
    client_name: str,
    value: float
) -> Optional[Notification]:
    """Notifica sobre emissão de NF-e."""
    return create_notification(
        db=db,
        user_id=user_id,
        title="✅ NF-e Emitida",
        message=f"NF-e #{nfse_number} emitida para {client_name}: R$ {value:.2f}",
        notification_type="success",
        link="/financeiro"
    )

def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> bool:
    """Marca como lida."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()

    if not notification:
        return False

    notification.read = True
    db.commit()
    return True

def mark_all_notifications_as_read(db: Session, user_id: int) -> int:
    """Marca todas como lidas."""
    result = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read == False
    ).update({"read": True})

    db.commit()
    return result

"""
Notification Service - Inovar Refrigeração
Centraliza a criação de notificações para eventos do sistema.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
import logging
import asyncio

from models import Notification, User
from database import SessionLocal

logger = logging.getLogger(__name__)


# Global reference to WebSocket manager (set at runtime)
_ws_manager = None

def set_ws_manager(manager):
    """Set the WebSocket manager reference for broadcasting"""
    global _ws_manager
    _ws_manager = manager

def _broadcast_notification_sync(user_id: int, company_id: int, notification_data: dict):
    """
    Fire-and-forget WebSocket broadcast (runs in background).
    This is called synchronously but schedules the async broadcast.
    """
    global _ws_manager
    if _ws_manager is None:
        return
    
    try:
        # Get or create event loop
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        
        if loop and loop.is_running():
            # Schedule the coroutine in the existing loop
            asyncio.create_task(_ws_manager.send_to_user(user_id, notification_data))
        else:
            # No running loop, skip (WebSocket will catch up on next poll)
            logger.debug(f"No event loop for WebSocket broadcast to user {user_id}")
    except Exception as e:
        logger.debug(f"WebSocket broadcast skipped: {e}")


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    link: Optional[str] = None,
    company_id: Optional[int] = None
) -> Notification:
    """
    Cria uma nova notificação para um usuário.
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário destinatário
        title: Título da notificação
        message: Mensagem da notificação
        notification_type: Tipo (success, error, info, warning)
        link: Link opcional para redirecionamento
        company_id: ID da empresa (opcional)
    
    Returns:
        Notification: A notificação criada
    """
    notification = Notification(
        user_id=user_id,
        company_id=company_id,
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
    
    # Broadcast via WebSocket (fire-and-forget)
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
    _broadcast_notification_sync(user_id, company_id or 0, notification_data)
    
    return notification



def notify_welcome(db: Session, user: User) -> Optional[Notification]:
    """
    Envia notificação de boas-vindas para um novo usuário ou primeiro acesso.
    Verifica se já existe notificação de boas-vindas para evitar duplicatas.
    """
    # Verificar se já existe notificação de boas-vindas
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
        message=f"Olá {user.full_name}! É ótimo ter você aqui. Explore o sistema e comece a gerenciar seus serviços de refrigeração.",
        notification_type="success",
        link="/#/dashboard",
        company_id=user.company_id
    )


def notify_service_order_created(
    db: Session,
    order_id: int,
    order_title: str,
    client_name: str,
    company_id: int,
    created_by_id: int
) -> List[Notification]:
    """
    Notifica sobre nova ordem de serviço criada.
    Envia para todos os admins/prestadores da empresa.
    """
    notifications = []
    
    # Buscar admins e prestadores da empresa
    users = db.query(User).filter(
        User.company_id == company_id,
        User.role.in_(["prestador", "admin"]),
        User.id != created_by_id
    ).all()
    
    for user in users:
        notif = create_notification(
            db=db,
            user_id=user.id,
            title="📋 Nova Ordem de Serviço",
            message=f"OS #{order_id} criada para {client_name}: {order_title}",
            notification_type="info",
            link=f"/#/solicitacoes/{order_id}",
            company_id=company_id
        )
        notifications.append(notif)
    
    return notifications


def notify_service_order_assigned(
    db: Session,
    order_id: int,
    order_title: str,
    technician_id: int,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica o técnico quando uma OS é atribuída a ele.
    """
    technician = db.query(User).filter(User.id == technician_id).first()
    if not technician:
        return None
    
    return create_notification(
        db=db,
        user_id=technician_id,
        title="🔧 OS Atribuída a Você",
        message=f"A OS #{order_id} ({order_title}) foi atribuída a você.",
        notification_type="info",
        link=f"/#/solicitacoes/{order_id}",
        company_id=company_id
    )


def notify_service_order_completed(
    db: Session,
    order_id: int,
    order_title: str,
    technician_name: str,
    company_id: int
) -> List[Notification]:
    """
    Notifica admins quando uma OS é concluída.
    """
    notifications = []
    
    # Buscar admins da empresa
    admins = db.query(User).filter(
        User.company_id == company_id,
        User.role.in_(["prestador", "admin"])
    ).all()
    
    for admin in admins:
        notif = create_notification(
            db=db,
            user_id=admin.id,
            title="✅ OS Concluída",
            message=f"A OS #{order_id} ({order_title}) foi concluída por {technician_name}.",
            notification_type="success",
            link=f"/#/solicitacoes/{order_id}",
            company_id=company_id
        )
        notifications.append(notif)
    
    return notifications


def notify_service_order_status_changed(
    db: Session,
    order_id: int,
    order_title: str,
    old_status: str,
    new_status: str,
    user_id: int,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre mudança de status de OS.
    """
    status_map = {
        "aberto": "Aberta",
        "em_andamento": "Em Andamento",
        "concluido": "Concluída",
        "cancelado": "Cancelada"
    }
    
    old_label = status_map.get(old_status, old_status)
    new_label = status_map.get(new_status, new_status)
    
    return create_notification(
        db=db,
        user_id=user_id,
        title="🔄 Status Alterado",
        message=f"OS #{order_id}: {old_label} → {new_label}",
        notification_type="info",
        link=f"/#/solicitacoes/{order_id}",
        company_id=company_id
    )


def notify_subscription_expiring(
    db: Session,
    user_id: int,
    days_remaining: int,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre assinatura prestes a expirar.
    """
    if days_remaining <= 0:
        title = "⚠️ Assinatura Expirada"
        message = "Sua assinatura expirou. Renove agora para continuar usando o sistema."
        notification_type = "error"
    elif days_remaining <= 3:
        title = "⏰ Assinatura Expirando em Breve"
        message = f"Sua assinatura expira em {days_remaining} dia(s). Renove para não perder acesso."
        notification_type = "warning"
    else:
        title = "📅 Lembrete de Renovação"
        message = f"Sua assinatura expira em {days_remaining} dias."
        notification_type = "info"
    
    return create_notification(
        db=db,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_new_client_registered(
    db: Session,
    client_name: str,
    company_id: int
) -> List[Notification]:
    """
    Notifica sobre novo cliente cadastrado.
    """
    notifications = []
    
    admins = db.query(User).filter(
        User.company_id == company_id,
        User.role.in_(["prestador", "admin"])
    ).all()
    
    for admin in admins:
        notif = create_notification(
            db=db,
            user_id=admin.id,
            title="👤 Novo Cliente",
            message=f"O cliente '{client_name}' foi cadastrado no sistema.",
            notification_type="info",
            link="/#/clientes",
            company_id=company_id
        )
        notifications.append(notif)
    
    return notifications


def notify_technician_added(
    db: Session,
    technician_name: str,
    admin_id: int,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica admin sobre novo técnico adicionado.
    """
    return create_notification(
        db=db,
        user_id=admin_id,
        title="👷 Novo Técnico",
        message=f"O técnico '{technician_name}' foi adicionado à equipe.",
        notification_type="success",
        link="/#/tecnicos",
        company_id=company_id
    )


def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> bool:
    """
    Marca uma notificação como lida.
    
    Returns:
        bool: True se marcou com sucesso, False se não encontrou
    """
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
    """
    Marca todas as notificações do usuário como lidas.
    
    Returns:
        int: Número de notificações marcadas
    """
    result = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read == False
    ).update({"read": True})
    
    db.commit()
    return result


def delete_old_notifications(db: Session, days_old: int = 30) -> int:
    """
    Remove notificações antigas (lidas) com mais de X dias.
    
    Returns:
        int: Número de notificações removidas
    """
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    result = db.query(Notification).filter(
        Notification.read == True,
        Notification.created_at < cutoff_date
    ).delete()
    
    db.commit()
    logger.info(f"🗑️ Removidas {result} notificações antigas")
    return result


# ============= NOTIFICAÇÕES DE NFSe / CERTIFICADO DIGITAL =============

def notify_certificate_expiring(
    db: Session,
    user_id: int,
    days_remaining: int,
    company_id: int,
    company_name: str
) -> Optional[Notification]:
    """
    Notifica sobre certificado digital prestes a expirar.
    """
    if days_remaining <= 0:
        title = "🚨 Certificado Digital Expirado!"
        message = f"O certificado digital da empresa {company_name} expirou. A emissão de NF-e está bloqueada até a renovação."
        notification_type = "error"
    elif days_remaining <= 7:
        title = "⚠️ Certificado Expira em Breve!"
        message = f"O certificado digital expira em {days_remaining} dia(s). Renove para evitar interrupções na emissão de NF-e."
        notification_type = "warning"
    elif days_remaining <= 30:
        title = "📅 Lembrete: Certificado Digital"
        message = f"O certificado digital da empresa expira em {days_remaining} dias. Considere renovar."
        notification_type = "info"
    else:
        return None
    
    return create_notification(
        db=db,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link="/#/configuracoes",
        company_id=company_id
    )


def notify_nfse_activated(
    db: Session,
    user_id: int,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre ativação da emissão de NF-e.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="📄 Emissão de NF-e Ativada",
        message="A emissão de notas fiscais eletrônicas foi ativada para sua empresa. Configure o certificado digital para começar.",
        notification_type="success",
        link="/#/configuracoes",
        company_id=company_id
    )


def notify_nfse_issued(
    db: Session,
    user_id: int,
    nfse_number: str,
    client_name: str,
    value: float,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre emissão de NF-e com sucesso.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="✅ NF-e Emitida",
        message=f"NF-e #{nfse_number} emitida para {client_name} no valor de R$ {value:.2f}.",
        notification_type="success",
        link="/#/financeiro",
        company_id=company_id
    )


def notify_nfse_error(
    db: Session,
    user_id: int,
    error_message: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre erro na emissão de NF-e.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="❌ Erro na Emissão de NF-e",
        message=f"Houve um erro ao emitir a nota fiscal: {error_message[:100]}",
        notification_type="error",
        link="/#/financeiro",
        company_id=company_id
    )


# ============= NOTIFICAÇÕES DE ASSINATURA =============

def notify_subscription_created(
    db: Session,
    user_id: int,
    plan_name: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre nova assinatura criada com sucesso.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="🎉 Assinatura Ativada!",
        message=f"Parabéns! Sua assinatura do plano '{plan_name}' foi ativada com sucesso. Aproveite todos os recursos!",
        notification_type="success",
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_subscription_renewed(
    db: Session,
    user_id: int,
    plan_name: str,
    next_billing_date: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre renovação de assinatura com sucesso.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="🔄 Assinatura Renovada",
        message=f"Sua assinatura do plano '{plan_name}' foi renovada. Próximo vencimento: {next_billing_date}.",
        notification_type="success",
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_payment_failed(
    db: Session,
    user_id: int,
    reason: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre falha no pagamento da assinatura.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="⚠️ Problema no Pagamento",
        message=f"Houve um problema com seu pagamento: {reason}. Atualize seu método de pagamento para evitar interrupções.",
        notification_type="warning",
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_subscription_expired(
    db: Session,
    user_id: int,
    plan_name: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre assinatura expirada por falta de pagamento.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="🚫 Assinatura Expirada",
        message=f"Sua assinatura do plano '{plan_name}' expirou por falta de pagamento. Renove agora para restaurar o acesso.",
        notification_type="error",
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_subscription_cancelled(
    db: Session,
    user_id: int,
    plan_name: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre cancelamento de assinatura.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="❌ Assinatura Cancelada",
        message=f"Sua assinatura do plano '{plan_name}' foi cancelada. Você pode reativar a qualquer momento.",
        notification_type="info",
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_plan_upgrade(
    db: Session,
    user_id: int,
    old_plan: str,
    new_plan: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre upgrade de plano.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="⬆️ Plano Atualizado!",
        message=f"Seu plano foi atualizado de '{old_plan}' para '{new_plan}'. Novos recursos já estão disponíveis!",
        notification_type="success",
        link="/#/minha-assinatura",
        company_id=company_id
    )


# ============= NOTIFICAÇÕES PARA SUPERADMIN =============

def notify_superadmin_new_company(
    db: Session,
    company_name: str,
    admin_email: str
) -> List[Notification]:
    """
    Notifica SuperAdmins sobre nova empresa cadastrada.
    """
    notifications = []
    
    superadmins = db.query(User).filter(User.role == "super_admin").all()
    
    for admin in superadmins:
        notif = create_notification(
            db=db,
            user_id=admin.id,
            title="🏢 Nova Empresa Cadastrada",
            message=f"A empresa '{company_name}' foi cadastrada. Admin: {admin_email}",
            notification_type="info",
            link="/#/admin/assinaturas"
        )
        notifications.append(notif)
    
    return notifications


def notify_superadmin_payment_issue(
    db: Session,
    company_name: str,
    issue_type: str
) -> List[Notification]:
    """
    Notifica SuperAdmins sobre problemas de pagamento.
    """
    notifications = []
    
    superadmins = db.query(User).filter(User.role == "super_admin").all()
    
    for admin in superadmins:
        notif = create_notification(
            db=db,
            user_id=admin.id,
            title="💳 Problema de Pagamento",
            message=f"Empresa '{company_name}': {issue_type}",
            notification_type="warning",
            link="/#/admin/assinaturas"
        )
        notifications.append(notif)
    
    return notifications


def notify_payment_method_changed(
    db: Session,
    user_id: int,
    new_method: str,
    company_id: int
) -> Optional[Notification]:
    """
    Notifica sobre alteração no método de pagamento.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="💳 Método de Pagamento Atualizado",
        message=f"Seu método de pagamento foi alterado para: {new_method}. Se não foi você, entre em contato imediatamente.",
        notification_type="info",
        link="/#/minha-assinatura",
        company_id=company_id
    )


def notify_exclusive_plan_available(
    db: Session,
    user_id: int,
    plan_name: str,
    plan_value: float,
    company_id: Optional[int] = None
) -> Optional[Notification]:
    """
    Notifica usuário sobre plano exclusivo disponível para ele.
    """
    return create_notification(
        db=db,
        user_id=user_id,
        title="🌟 Plano Exclusivo Disponível!",
        message=f"Um plano exclusivo foi criado para você: '{plan_name}' por R$ {plan_value:.2f}/mês. Acesse para assinar!",
        notification_type="success",
        link="/#/minha-assinatura",
        company_id=company_id
    )




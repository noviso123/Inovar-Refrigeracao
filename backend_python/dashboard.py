import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Client, ServiceOrder, User, SystemSettings
from redis_utils import get_cache, set_cache

logger = logging.getLogger(__name__)

router = APIRouter()

class DashboardStats(BaseModel):
    total_users: int
    total_clients: int
    total_orders: int
    total_revenue: float = 0.0

@router.get("/dashboard/admin")
def get_admin_dashboard(db: Session = Depends(get_db)):
    """
    Retorna estatísticas simplificadas para o Admin.
    """
    cache_key = "dashboard:admin:v5"
    cached = get_cache(cache_key)
    if cached:
        return cached

    # 1. Overview
    total_usuarios = db.query(User).count()
    total_clientes = db.query(Client).count()
    total_os = db.query(ServiceOrder).count()
    completed_os = db.query(ServiceOrder).filter(ServiceOrder.status.in_(["concluido", "faturado"])).count()

    # Recent Service Orders
    recent_os = db.query(ServiceOrder).order_by(ServiceOrder.created_at.desc()).limit(5).all()
    recent_os_list = []
    for os in recent_os:
        recent_os_list.append({
            "id": os.id,
            "sequential_id": os.sequential_id,
            "titulo": os.title or f"OS #{os.sequential_id}",
            "status": os.status,
            "client_name": os.client.name if os.client else None
        })

    result = {
        "stats": {
            "total_users": total_usuarios,
            "total_clients": total_clientes,
            "total_orders": total_os,
            "completed_orders": completed_os
        },
        "recent_orders": recent_os_list
    }

    set_cache(cache_key, result, ttl_seconds=60)
    return result

@router.get("/dashboard/prestador")
def get_prestador_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dashboard para prestadores de serviço (Visão Geral)"""
    cache_key = f"dashboard:prestador:v5"
    cached = get_cache(cache_key)
    if cached:
        return cached

    # Contagens básicas
    total_clientes = db.query(Client).count()
    total_servicos = db.query(ServiceOrder).count()

    # Serviços por status
    servicos_aberto = db.query(ServiceOrder).filter(ServiceOrder.status == "pendente").count()
    servicos_agendado = db.query(ServiceOrder).filter(ServiceOrder.status == "agendado").count()
    servicos_em_andamento = db.query(ServiceOrder).filter(ServiceOrder.status == "em_andamento").count()
    servicos_concluido = db.query(ServiceOrder).filter(ServiceOrder.status.in_(["concluido", "faturado"])).count()

    # Serviços recentes
    recent_os = db.query(ServiceOrder).order_by(ServiceOrder.created_at.desc()).limit(5).all()

    recent_os_list = []
    for os in recent_os:
        recent_os_list.append({
            "id": os.id,
            "sequential_id": os.sequential_id,
            "titulo": os.title or f"OS #{os.sequential_id}",
            "status": os.status,
            "client_name": os.client.name if os.client else None
        })

    result = {
        "stats": {
            "total_clients": total_clientes,
            "total_orders": total_servicos,
            "open_orders": servicos_aberto + servicos_agendado + servicos_em_andamento,
            "completed_orders": servicos_concluido
        },
        "recent_orders": recent_os_list
    }

    set_cache(cache_key, result, ttl_seconds=60)
    return result

@router.get("/dashboard")
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Endpoint raiz do dashboard - redireciona baseado no cargo"""
    if current_user.role == "admin":
        return get_admin_dashboard(db)
    return get_prestador_dashboard(current_user, db)

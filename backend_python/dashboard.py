from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, ServiceOrder, Client, Company, Subscription, SubscriptionPlan
from pydantic import BaseModel
from redis_utils import get_cache, set_cache
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class DashboardStats(BaseModel):
    total_users: int
    total_clients: int
    total_orders: int
    total_companies: int
    total_revenue: float = 0.0

from sqlalchemy import func
from datetime import datetime

@router.get("/dashboard/super-admin")
def get_super_admin_dashboard(db: Session = Depends(get_db)):
    """
    Retorna estatísticas ricas para o Super Admin conforme esperado pelo frontend.
    """
    cache_key = "dashboard:super-admin:v2"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    # 1. Overview
    total_empresas = db.query(Company).count()
    empresas_ativas = db.query(Company).filter(Company.status == 'ativa').count()
    empresas_pendentes = db.query(Company).filter(Company.status == 'pendente').count()
    empresas_bloqueadas = db.query(Company).filter(Company.status == 'bloqueada').count()
    
    total_usuarios = db.query(User).count()
    assinaturas_ativas = db.query(Subscription).filter(Subscription.status == 'ativa').count()
    
    # MRR Calculation
    mrr = db.query(func.sum(SubscriptionPlan.price)).join(
        Subscription, Subscription.plan_id == SubscriptionPlan.id
    ).filter(Subscription.status == 'ativa').scalar() or 0.0
    
    # 2. Usuários por cargo
    usuarios_prestador = db.query(User).filter(User.role == 'prestador').count()
    
    # 3. Assinaturas por status
    assinaturas_status = {
        "ativa": assinaturas_ativas,
        "pendente": db.query(Subscription).filter(Subscription.status == 'pendente').count(),
        "cancelada": db.query(Subscription).filter(Subscription.status == 'cancelada').count(),
        "vencida": db.query(Subscription).filter(Subscription.status == 'vencida').count()
    }
    
    # 4. Atividade
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    solicitacoes_mes = db.query(ServiceOrder).filter(ServiceOrder.created_at >= start_of_month).count()
    empresas_novas_mes = db.query(Company).filter(Company.id > 0).count() # Placeholder logic for now
    
    # Recent Service Orders
    recent_os = db.query(ServiceOrder).order_by(ServiceOrder.created_at.desc()).limit(5).all()
    recent_os_list = []
    for os in recent_os:
        recent_os_list.append({
            "id": os.id,
            "numero": os.sequential_id,
            "titulo": os.title or f"OS #{os.sequential_id}",
            "empresaNome": os.company.name if os.company else "N/D",
            "status": os.status
        })
    
    result = {
        "overview": {
            "mrr": mrr,
            "mrrFormatted": f"R$ {mrr:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "totalEmpresas": total_empresas,
            "empresasAtivas": empresas_ativas,
            "empresasPendentes": empresas_pendentes,
            "empresasBloqueadas": empresas_bloqueadas,
            "totalUsuarios": total_usuarios,
            "assinaturasAtivas": assinaturas_ativas
        },
        "usuarios": {
            "porCargo": {
                "prestador": usuarios_prestador
            }
        },
        "assinaturas": {
            "porStatus": assinaturas_status
        },
        "atividade": {
            "solicitacoesEsteMes": solicitacoes_mes,
            "empresasNovasEsteMes": empresas_novas_mes,
            "solicitacoesRecentes": recent_os_list
        }
    }
    
    set_cache(cache_key, result, ttl_seconds=60)
    return result

class PrestadorStats(BaseModel):
    total_clientes: int
    total_servicos: int
    servicos_pendentes: int
    servicos_concluidos: int

@router.get("/dashboard/prestador")
def get_prestador_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dashboard para prestadores de serviço"""
    cache_key = f"dashboard:prestador:{current_user.company_id}:v2"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    company_id = current_user.company_id
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    # Contagens básicas
    total_clientes = db.query(Client).filter(Client.company_id == company_id).count()
    total_servicos = db.query(ServiceOrder).filter(ServiceOrder.company_id == company_id).count()
    
    # Serviços por status
    servicos_aberto = db.query(ServiceOrder).filter(ServiceOrder.company_id == company_id, ServiceOrder.status == "aberto").count()
    servicos_agendado = db.query(ServiceOrder).filter(ServiceOrder.company_id == company_id, ServiceOrder.status == "agendado").count()
    servicos_em_andamento = db.query(ServiceOrder).filter(ServiceOrder.company_id == company_id, ServiceOrder.status == "em_andamento").count()
    servicos_concluido = db.query(ServiceOrder).filter(ServiceOrder.company_id == company_id, ServiceOrder.status == "concluido").count()
    
    # Serviços do mês
    servicos_mes = db.query(ServiceOrder).filter(
        ServiceOrder.company_id == company_id,
        ServiceOrder.created_at >= start_of_month
    ).count()
    
    # Receita total e do mês
    receita_total = db.query(func.sum(ServiceOrder.valor_total)).filter(
        ServiceOrder.company_id == company_id,
        ServiceOrder.status.in_(["concluido", "faturado"])
    ).scalar() or 0.0
    
    receita_mes = db.query(func.sum(ServiceOrder.valor_total)).filter(
        ServiceOrder.company_id == company_id,
        ServiceOrder.status.in_(["concluido", "faturado"]),
        ServiceOrder.created_at >= start_of_month
    ).scalar() or 0.0
    
    # Serviços recentes
    recent_os = db.query(ServiceOrder).filter(
        ServiceOrder.company_id == company_id
    ).order_by(ServiceOrder.created_at.desc()).limit(5).all()
    
    recent_os_list = []
    for os in recent_os:
        recent_os_list.append({
            "id": os.id,
            "numero": os.sequential_id,
            "titulo": os.title or f"OS #{os.sequential_id}",
            "status": os.status
        })
    
    # Financeiro pendente
    valor_pendente = db.query(func.sum(ServiceOrder.valor_total)).filter(
        ServiceOrder.company_id == company_id,
        ServiceOrder.status.in_(["concluido"]),
        ServiceOrder.valor_total > 0
    ).scalar() or 0.0
    
    pagamentos_pendentes = db.query(ServiceOrder).filter(
        ServiceOrder.company_id == company_id,
        ServiceOrder.status == "concluido",
        ServiceOrder.valor_total > 0
    ).count()
    
    # Verificar assinatura
    assinatura = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status == 'ativa'
    ).first()
    
    result = {
        "overview": {
            "receitaTotal": receita_total,
            "receitaTotalFormatted": f"R$ {receita_total:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "receitaEsteMes": receita_mes,
            "receitaEsteMesFormatted": f"R$ {receita_mes:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "servicosEsteMes": servicos_mes,
            "servicosEmAberto": servicos_aberto + servicos_agendado + servicos_em_andamento
        },
        "servicos": {
            "total": total_servicos,
            "porStatus": {
                "pendente": servicos_aberto,
                "agendado": servicos_agendado,
                "em_andamento": servicos_em_andamento,
                "concluido": servicos_concluido
            },
            "recentes": recent_os_list
        },
        "financeiro": {
            "valorPendente": valor_pendente,
            "pagamentosPendentes": pagamentos_pendentes
        },
        "clientes": {
            "total": total_clientes,
            "ativos": total_clientes
        },
        "assinatura": {
            "id": assinatura.id if assinatura else None,
            "status": assinatura.status if assinatura else None,
            "planoId": assinatura.plan_id if assinatura else None
        } if assinatura else None
    }
    
    set_cache(cache_key, result, ttl_seconds=60)
    return result

@router.get("/dashboard/tecnico")
def get_tecnico_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dashboard específico para técnicos - mostra apenas suas próprias OS"""
    if current_user.role not in ["tecnico", "prestador", "super_admin"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    cache_key = f"dashboard:tecnico:{current_user.id}:v1"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    # Minhas OS - filtrado pelo technician_id
    minhas_os_total = db.query(ServiceOrder).filter(ServiceOrder.technician_id == current_user.id).count()
    
    # OS por status
    os_aberto = db.query(ServiceOrder).filter(
        ServiceOrder.technician_id == current_user.id, 
        ServiceOrder.status == "aberto"
    ).count()
    os_agendado = db.query(ServiceOrder).filter(
        ServiceOrder.technician_id == current_user.id, 
        ServiceOrder.status == "agendado"
    ).count()
    os_em_andamento = db.query(ServiceOrder).filter(
        ServiceOrder.technician_id == current_user.id, 
        ServiceOrder.status == "em_andamento"
    ).count()
    os_concluido = db.query(ServiceOrder).filter(
        ServiceOrder.technician_id == current_user.id, 
        ServiceOrder.status == "concluido"
    ).count()
    
    # OS deste mês
    os_mes = db.query(ServiceOrder).filter(
        ServiceOrder.technician_id == current_user.id,
        ServiceOrder.created_at >= start_of_month
    ).count()
    
    # OS recentes
    recent_os = db.query(ServiceOrder).filter(
        ServiceOrder.technician_id == current_user.id
    ).order_by(ServiceOrder.created_at.desc()).limit(5).all()
    
    recent_os_list = []
    for os in recent_os:
        recent_os_list.append({
            "id": os.id,
            "numero": os.sequential_id,
            "titulo": os.title or f"OS #{os.sequential_id}",
            "status": os.status,
            "clienteNome": os.client.name if os.client else "N/D",
            "prioridade": os.priority,
            "criadoEm": os.created_at.isoformat() if os.created_at else None
        })
    
    result = {
        "overview": {
            "minhasOS": minhas_os_total,
            "osEsteMes": os_mes,
            "osEmAberto": os_aberto + os_agendado + os_em_andamento,
            "osConcluidas": os_concluido
        },
        "osPorStatus": {
            "aberto": os_aberto,
            "agendado": os_agendado,
            "em_andamento": os_em_andamento,
            "concluido": os_concluido
        },
        "osRecentes": recent_os_list
    }
    
    set_cache(cache_key, result, ttl_seconds=60)
    return result

@router.get("/dashboard")
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Endpoint raiz do dashboard - redireciona baseado no cargo"""
    if current_user.role == "super_admin":
        return get_super_admin_dashboard(db)
    elif current_user.role == "tecnico":
        return get_tecnico_dashboard(current_user, db)
    return get_prestador_dashboard(current_user, db)


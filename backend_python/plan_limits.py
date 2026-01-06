from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import Company, Subscription, SubscriptionPlan, Client, ServiceOrder, User
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def check_client_limit(db: Session, company_id: int):
    """
    Verifica se a empresa atingiu o limite de clientes do plano.
    Levanta HTTPException(403) se o limite for excedido.
    """
    # 1. Obter assinatura ativa
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status == 'ativa'
    ).first()
    
    # Se não tiver assinatura ativa, bloqueia (ou permite se for super admin, mas aqui assumimos regra de negócio)
    # Vamos assumir que sem assinatura não pode criar nada, ou tem um plano free default.
    # Se não achar assinatura, vamos tentar buscar a empresa para ver se tem alguma flag, senão bloqueia.
    if not subscription:
        # Fallback: Verificar se é super admin ou plano gratuito implícito?
        # Por segurança, se não tem assinatura, bloqueia.
        # Mas cuidado com o bootstrap. Vamos assumir que o fluxo de criação de empresa já cria assinatura.
        # Se não tiver, vamos permitir apenas se for super admin (mas essa função recebe company_id).
        # Vamos logar e bloquear.
        logger.warning(f"Empresa {company_id} sem assinatura ativa tentando criar cliente.")
        # Opcional: Permitir se for teste? Não, vamos ser estritos.
        # Mas espere, o super admin tem company_id? Sim.
        # Se a assinatura não existe, talvez seja melhor lançar erro genérico ou 403.
        raise HTTPException(status_code=403, detail="Assinatura inativa ou não encontrada. Por favor, ative um plano.")

    # 2. Obter plano
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano da assinatura não encontrado.")

    # 3. Verificar limite (None = Ilimitado)
    if plan.limit_clients is None:
        return

    # 4. Contar clientes atuais
    current_count = db.query(Client).filter(Client.company_id == company_id).count()

    if current_count >= plan.limit_clients:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de clientes atingido ({plan.limit_clients}). Faça upgrade do seu plano para continuar cadastrando."
        )

def check_service_limit(db: Session, company_id: int):
    """
    Verifica se a empresa atingiu o limite de ordens de serviço MENSAL do plano.
    Levanta HTTPException(403) se o limite for excedido.
    """
    # 1. Obter assinatura ativa
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status == 'ativa'
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=403, detail="Assinatura inativa ou não encontrada. Por favor, ative um plano.")

    # 2. Obter plano
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano da assinatura não encontrado.")

    # 3. Verificar limite (None = Ilimitado)
    if plan.limit_services is None:
        return

    # 4. Contar serviços do MÊS ATUAL
    now = datetime.now()
    start_date = datetime(now.year, now.month, 1)
    
    # Próximo mês para fechar o range
    if now.month == 12:
        end_date = datetime(now.year + 1, 1, 1)
    else:
        end_date = datetime(now.year, now.month + 1, 1)

    current_count = db.query(ServiceOrder).filter(
        ServiceOrder.company_id == company_id,
        ServiceOrder.created_at >= start_date,
        ServiceOrder.created_at < end_date
    ).count()

    if current_count >= plan.limit_services:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite mensal de serviços atingido ({plan.limit_services}). Faça upgrade do seu plano para continuar."
        )

def check_technician_limit(db: Session, company_id: int):
    """
    Verifica se a empresa atingiu o limite de técnicos do plano.
    Levanta HTTPException(403) se o limite for excedido.
    """
    # 1. Obter assinatura ativa
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status == 'ativa'
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=403, detail="Assinatura inativa ou não encontrada. Por favor, ative um plano.")

    # 2. Obter plano
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano da assinatura não encontrado.")

    # 3. Verificar limite (None = Ilimitado)
    if plan.limit_technicians is None:
        return

    # 4. Contar técnicos atuais
    # Assumindo que 'tecnico' é o role para técnicos
    current_count = db.query(User).filter(
        User.company_id == company_id,
        User.role == 'tecnico',
        User.is_active == True
    ).count()

    if current_count >= plan.limit_technicians:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de técnicos atingido ({plan.limit_technicians}). Faça upgrade do seu plano para continuar cadastrando."
        )

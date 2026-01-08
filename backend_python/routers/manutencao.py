from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Client, Equipment, ManutencaoAgendada, ServiceOrder
from auth import get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/api/manutencao", tags=["Manutenção"])

class MaintenanceStats(BaseModel):
    vencendo_30_dias: int
    vencidas: int
    total_equipamentos: int

@router.get("/dashboard", response_model=MaintenanceStats)
def get_maintenance_dashboard(db: Session = Depends(get_db)):
    today = datetime.utcnow()
    next_30 = today + timedelta(days=30)

    # Simulação de lógica: considerar equipamentos com última OS conclusiva há mais de X meses
    # Para simplificar, usamos a data_prevista na tabela ManutencaoAgendada
    vencendo = db.query(ManutencaoAgendada).filter(
        ManutencaoAgendada.data_prevista <= next_30,
        ManutencaoAgendada.data_prevista >= today,
        ManutencaoAgendada.status == "pendente"
    ).count()

    vencidas = db.query(ManutencaoAgendada).filter(
        ManutencaoAgendada.data_prevista < today,
        ManutencaoAgendada.status == "pendente"
    ).count()

    total = db.query(Equipment).count()

    return {
        "vencendo_30_dias": vencendo,
        "vencidas": vencidas,
        "total_equipamentos": total
    }

@router.get("/vencendo")
def get_upcoming_maintenance(db: Session = Depends(get_db)):
    today = datetime.utcnow()
    next_30 = today + timedelta(days=30)

    items = db.query(ManutencaoAgendada).filter(
        ManutencaoAgendada.data_prevista <= next_30,
        ManutencaoAgendada.status == "pendente"
    ).all()

    result = []
    for item in items:
        result.append({
            "id": item.id,
            "cliente": item.client.name,
            "equipamento": item.equipment.name,
            "data_prevista": item.data_prevista,
            "dias_restantes": (item.data_prevista - today).days
        })

    return result

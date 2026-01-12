from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Client, Equipment, ServiceOrder
from auth import get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel
from sqlalchemy import func

router = APIRouter(prefix="/api/manutencao", tags=["Manutenção"])

class MaintenanceStats(BaseModel):
    vencendo_30_dias: int
    vencidas: int
    total_equipamentos: int

@router.get("/dashboard", response_model=MaintenanceStats)
def get_maintenance_dashboard(db: Session = Depends(get_db)):
    today = datetime.utcnow()
    next_30 = today + timedelta(days=30)
    
    # Default interval: 6 months (approx 180 days)
    interval_days = 180
    
    # Get all equipments
    equipments = db.query(Equipment).all()
    
    vencendo = 0
    vencidas = 0
    
    for eq in equipments:
        # Find last completed service order
        last_so = db.query(ServiceOrder).filter(
            ServiceOrder.equipment_id == eq.id,
            ServiceOrder.status == "concluido"
        ).order_by(ServiceOrder.created_at.desc()).first()
        
        if last_so:
            last_date = last_so.created_at
            next_date = last_date + timedelta(days=interval_days)
            
            if next_date < today:
                vencidas += 1
            elif today <= next_date <= next_30:
                vencendo += 1
        else:
            # If never maintained, assume it's overdue if created > 6 months ago
            # or just count as overdue? Let's treat as overdue if created > 6 months ago
            if eq.created_at and (today - eq.created_at).days > interval_days:
                vencidas += 1

    total = len(equipments)

    return {
        "vencendo_30_dias": vencendo,
        "vencidas": vencidas,
        "total_equipamentos": total
    }

@router.get("/vencendo")
def get_upcoming_maintenance(db: Session = Depends(get_db)):
    today = datetime.utcnow()
    next_30 = today + timedelta(days=30)
    interval_days = 180
    
    equipments = db.query(Equipment).all()
    result = []
    
    for eq in equipments:
        last_so = db.query(ServiceOrder).filter(
            ServiceOrder.equipment_id == eq.id,
            ServiceOrder.status == "concluido"
        ).order_by(ServiceOrder.created_at.desc()).first()
        
        next_date = None
        if last_so:
            next_date = last_so.created_at + timedelta(days=interval_days)
        elif eq.created_at:
             next_date = eq.created_at + timedelta(days=interval_days)
             
        if next_date and next_date <= next_30:
            # Only include if it's pending (not really pending status, but upcoming)
            # Logic here is simplified.
            result.append({
                "id": eq.id,
                "cliente": eq.client.name if eq.client else "N/A",
                "equipamento": eq.name,
                "data_prevista": next_date,
                "dias_restantes": (next_date - today).days
            })

    return result

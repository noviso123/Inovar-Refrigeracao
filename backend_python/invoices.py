from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import uuid

from database import get_db
from auth import get_current_user
from models import User, Subscription, NFSe, Company, SubscriptionPlan
from pydantic import BaseModel

router = APIRouter(prefix="/admin/invoices", tags=["Invoices"])

# --- Schemas ---
class InvoicePending(BaseModel):
    subscription_id: str
    company_name: str
    company_cnpj: str
    plan_name: str
    amount: float
    month_ref: str
    status: str

class InvoiceEmitRequest(BaseModel):
    subscription_id: str
    month_ref: str
    amount: float
    description: str
    service_code: str = "1.07" # Default: Suporte Técnico / Software

class InvoiceResponse(BaseModel):
    id: int
    numero: str
    status: str
    pdf_url: Optional[str]
    created_at: datetime
    company_name: str
    amount: float
    month_ref: Optional[str]

# --- Endpoints ---

@router.get("/pending", response_model=List[InvoicePending])
def list_pending_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List active subscriptions that haven't been invoiced for the current month.
    """
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a SuperAdmin")

    current_month_ref = datetime.now().strftime("%m/%Y")
    
    # Get all active subscriptions
    active_subs = db.query(Subscription).filter(Subscription.status == 'ativa').all()
    
    pending = []
    for sub in active_subs:
        # Check if invoice already exists for this month
        existing_nf = db.query(NFSe).filter(
            NFSe.subscription_id == sub.id,
            NFSe.month_ref == current_month_ref,
            NFSe.status != 'cancelada'
        ).first()
        
        if not existing_nf:
            # Get plan details
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
            company = db.query(Company).filter(Company.id == sub.company_id).first()
            
            if plan and company:
                pending.append({
                    "subscription_id": sub.id,
                    "company_name": company.name,
                    "company_cnpj": company.cnpj,
                    "plan_name": plan.name,
                    "amount": plan.price,
                    "month_ref": current_month_ref,
                    "status": "pendente"
                })
                
    return pending

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List history of issued invoices.
    """
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a SuperAdmin")
        
    invoices = db.query(NFSe).order_by(NFSe.created_at.desc()).all()
    
    result = []
    for inv in invoices:
        company_name = "Empresa Removida"
        if inv.company:
            company_name = inv.company.name
            
        result.append({
            "id": inv.id,
            "numero": inv.numero,
            "status": inv.status,
            "pdf_url": inv.pdf_url,
            "created_at": inv.created_at,
            "company_name": company_name,
            "amount": inv.valor_servico,
            "month_ref": inv.month_ref
        })
        
    return result

@router.post("", response_model=InvoiceResponse)
def emit_invoice(
    data: InvoiceEmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Emit an invoice (Mock implementation).
    """
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a SuperAdmin")
        
    sub = db.query(Subscription).filter(Subscription.id == data.subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
        
    # Check duplicate
    existing = db.query(NFSe).filter(
        NFSe.subscription_id == sub.id,
        NFSe.month_ref == data.month_ref,
        NFSe.status != 'cancelada'
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Nota já emitida para este mês")
        
    # Generate Mock Data
    nf_number = datetime.now().strftime("%Y%m%d%H%M")
    mock_pdf_url = f"https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?nfe={nf_number}" # Fake URL
    
    new_nf = NFSe(
        subscription_id=sub.id,
        company_id=sub.company_id,
        numero=nf_number,
        codigo_verificacao=str(uuid.uuid4())[:8].upper(),
        status="autorizada",
        valor_servico=data.amount,
        description=data.description,
        month_ref=data.month_ref,
        pdf_url=mock_pdf_url,
        xml_url=f"https://api.focusnfe.com.br/xml/{nf_number}",
        protocolo=str(uuid.uuid4())
    )
    
    db.add(new_nf)
    db.commit()
    db.refresh(new_nf)
    
    return {
        "id": new_nf.id,
        "numero": new_nf.numero,
        "status": new_nf.status,
        "pdf_url": new_nf.pdf_url,
        "created_at": new_nf.created_at,
        "company_name": sub.company.name,
        "amount": new_nf.valor_servico,
        "month_ref": new_nf.month_ref
    }

@router.post("/{id}/cancel")
def cancel_invoice(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an invoice.
    """
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a SuperAdmin")
        
    nf = db.query(NFSe).filter(NFSe.id == id).first()
    if not nf:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
        
    nf.status = "cancelada"
    db.commit()
    
    return {"message": "Nota cancelada com sucesso"}

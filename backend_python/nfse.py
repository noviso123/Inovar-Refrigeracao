"""
Módulo de Integração NFS-e Nacional (Padrão Gov.br)
"""
import os
import logging
import base64
import json
import requests
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from OpenSSL import crypto

from database import get_db
from models import User, Company, ServiceOrder, NFSe
from auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nfse", tags=["nfse"])

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================
# URL da API Nacional (Ambiente de Produção/Homologação)
# Documentação: https://www.gov.br/nfse/pt-br
NFSE_API_URL = os.getenv("NFSE_API_URL", "https://api.nfse.gov.br/v1") 
NFSE_ENV = os.getenv("NFSE_ENV", "homologacao") # homologacao ou producao

# =============================================================================
# SCHEMAS
# =============================================================================
class NFSeEmitRequest(BaseModel):
    solicitacaoId: int
    descricao: str
    valor: float
    codigoServico: str # Código da lista de serviços (LC 116)

class NFSeCancelRequest(BaseModel):
    nfseId: int
    motivo: str

# =============================================================================
# FUNÇÕES AUXILIARES (Real Production)
# =============================================================================
def get_cert_context(company_id: int, password: str):
    """Prepara o contexto SSL com o certificado da empresa"""
    cert_path = f"certificates/company_{company_id}.pfx"
    if not os.path.exists(cert_path):
        raise HTTPException(status_code=400, detail="Certificado não encontrado")
    
    try:
        # Converter PFX para PEM (Certificado + Chave) temporariamente para uso no requests
        with open(cert_path, "rb") as f:
            pfx_data = f.read()
        
        p12 = crypto.load_pkcs12(pfx_data, password.encode())
        
        # Criar arquivos temporários para o requests usar (cert e key separados)
        pem_cert = crypto.dump_certificate(crypto.FILETYPE_PEM, p12.get_certificate())
        pem_key = crypto.dump_privatekey(crypto.FILETYPE_PEM, p12.get_privatekey())
        
        cert_file = f"certificates/temp_{company_id}.crt"
        key_file = f"certificates/temp_{company_id}.key"
        
        with open(cert_file, "wb") as f:
            f.write(pem_cert)
        with open(key_file, "wb") as f:
            f.write(pem_key)
            
        return cert_file, key_file
    except Exception as e:
        logger.error(f"Erro ao processar certificado: {e}")
        raise HTTPException(status_code=400, detail="Erro no certificado digital")

def cleanup_temp_files(cert_file, key_file):
    """Remove arquivos temporários de certificado"""
    try:
        if os.path.exists(cert_file): os.remove(cert_file)
        if os.path.exists(key_file): os.remove(key_file)
    except:
        pass

# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/has-certificate")
async def has_certificate(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        return {"hasCertificate": False}
    return {"hasCertificate": bool(company.certificate_path and os.path.exists(company.certificate_path))}

@router.post("/upload-certificate")
async def upload_certificate(
    certificate: UploadFile = File(...),
    password: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Empresa não encontrada")
    
    # Save certificate
    cert_dir = "certificates"
    os.makedirs(cert_dir, exist_ok=True)
    cert_path = f"{cert_dir}/company_{company.id}.pfx"
    
    with open(cert_path, "wb") as f:
        f.write(await certificate.read())
        
    company.certificate_path = cert_path
    if password:
        company.certificate_password = password
    
    db.commit()
    return {"success": True}

@router.get("/{nfse_id}")
async def get_nfse_by_id(nfse_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    nfse = db.query(NFSe).filter(NFSe.id == nfse_id).first()
    if not nfse:
        raise HTTPException(status_code=404, detail="NFS-e não encontrada")
    
    return {
        "id": nfse.id,
        "numero": nfse.numero,
        "codigo_verificacao": nfse.codigo_verificacao,
        "data_emissao": nfse.data_emissao,
        "status": nfse.status,
        "url_pdf": nfse.pdf_url,
        "url_xml": nfse.xml_url
    }

@router.post("/emit")
async def emit_nfse(
    data: NFSeEmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Emite NFS-e Nacional (Ambiente Real/Homologação)
    """
    # 1. Validar Empresa e Certificado
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.certificate_path:
        raise HTTPException(status_code=400, detail="Certificado digital não configurado")
    
    # 2. Buscar OS e Cliente
    os_obj = db.query(ServiceOrder).filter(ServiceOrder.id == data.solicitacaoId).first()
    if not os_obj:
        raise HTTPException(status_code=404, detail="OS não encontrada")
        
    client = os_obj.client
    if not client:
        raise HTTPException(status_code=400, detail="OS sem cliente vinculado")

    # 3. Preparar Certificado para Autenticação Mútua (MTLS)
    cert_file, key_file = get_cert_context(company.id, company.certificate_password)
    
    try:
        # 4. Montar Payload Oficial (Padrão Nacional)
        # Referência: API NFS-e Nacional v1.0
        payload = {
            "infDPS": {
                "dhEmi": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                "dCompet": datetime.now().strftime("%Y-%m-%d"),
                "prest": {
                    "CNPJ": company.cnpj.replace(".", "").replace("/", "").replace("-", "")
                },
                "toma": {
                    "CNPJ": client.document.replace(".", "").replace("/", "").replace("-", "") if len(client.document) > 11 else None,
                    "CPF": client.document.replace(".", "").replace("-", "") if len(client.document) <= 11 else None,
                    "xNome": client.name,
                    "end": {
                        "xLgr": client.address or "Não informado",
                        "nro": "S/N",
                        "xBairro": "Centro",
                        "cMun": "3550308", # Exemplo: São Paulo (deve vir do cadastro)
                        "UF": "SP",
                        "CEP": "01001000"
                    }
                },
                "serv": {
                    "cServ": {
                        "cTribNac": data.codigoServico, # Código Tributação Nacional
                        "xDescServ": data.descricao
                    },
                    "vServ": {
                        "vServ": data.valor
                    }
                }
            }
        }

        # 5. Enviar para API Nacional (POST Real)
        logger.info(f"Enviando NFS-e para API Nacional: {NFSE_API_URL}/dps")
        
        response = requests.post(
            f"{NFSE_API_URL}/dps", # Endpoint de Declaração de Prestação de Serviço
            json=payload,
            cert=(cert_file, key_file), # Autenticação via Certificado
            timeout=30
        )
        
        # 6. Processar Retorno
        if response.status_code in [200, 201]:
            resp_data = response.json()
            
            # Extrair dados da nota gerada
            numero_nota = resp_data.get("infNFSe", {}).get("nNFSe")
            codigo_verificacao = resp_data.get("infNFSe", {}).get("cVerif")
            link_xml = resp_data.get("linkXml")
            link_pdf = resp_data.get("linkPdf")
            
            # Salvar no Banco
            nova_nfse = NFSe(
                solicitacao_id=data.solicitacaoId,
                company_id=company.id,
                numero=str(numero_nota),
                codigo_verificacao=codigo_verificacao,
                status="autorizada",
                valor_servico=data.valor,
                xml_url=link_xml,
                pdf_url=link_pdf,
                protocolo=resp_data.get("nProt")
            )
            
            db.add(nova_nfse)
            db.commit()
            db.refresh(nova_nfse)
            
            return {
                "success": True,
                "nfse": {
                    "id": nova_nfse.id,
                    "numero": nova_nfse.numero,
                    "codigo_verificacao": nova_nfse.codigo_verificacao,
                    "status": nova_nfse.status,
                    "url_pdf": nova_nfse.pdf_url,
                    "url_xml": nova_nfse.xml_url
                }
            }
        else:
            # Erro na API
            error_msg = response.text
            logger.error(f"Erro API NFS-e: {response.status_code} - {error_msg}")
            raise HTTPException(status_code=400, detail=f"Erro na emissão: {error_msg}")
            
    except requests.exceptions.SSLError:
        raise HTTPException(status_code=400, detail="Erro de Certificado Digital (SSL). Verifique a validade e senha.")
    except Exception as e:
        logger.error(f"Erro interno emissão: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Limpar arquivos temporários de certificado
        cleanup_temp_files(cert_file, key_file)

@router.get("/by-solicitacao/{solicitacao_id}")
async def get_nfse_by_os(
    solicitacao_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca NFS-e por ID da Solicitação"""
    nfse = db.query(NFSe).filter(NFSe.solicitacao_id == solicitacao_id).first()
    if not nfse:
        raise HTTPException(status_code=404, detail="NFS-e não encontrada")
        
    return {
        "id": nfse.id,
        "numero": nfse.numero,
        "codigo_verificacao": nfse.codigo_verificacao,
        "data_emissao": nfse.data_emissao,
        "status": nfse.status,
        "url_pdf": nfse.pdf_url,
        "url_xml": nfse.xml_url
    }

@router.post("/cancel")
async def cancel_nfse(
    data: NFSeCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancela NFS-e"""
    nfse = db.query(NFSe).filter(NFSe.id == data.nfseId).first()
    if not nfse:
        raise HTTPException(status_code=404, detail="NFS-e não encontrada")
        
    # Simular cancelamento na API Nacional
    nfse.status = "cancelada"
    db.commit()
    
    return {"success": True, "message": "NFS-e cancelada com sucesso"}

@router.post("/suggest-code")
async def suggest_code(data: dict):
    """Sugere código de serviço via IA (Mock)"""
    # Aqui poderia integrar com OpenAI para sugerir código LC116 baseado na descrição
    return {
        "codigoServico": "14.01",
        "descricao": "Lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos, motores, elevadores ou de qualquer objeto"
    }

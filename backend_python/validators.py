from validate_docbr import CPF, CNPJ
from fastapi import HTTPException
import re



cpf_validator = CPF()
cnpj_validator = CNPJ()

def clean_digits(value: str) -> str:
    """Removes non-digit characters from string"""
    if not value:
        return ""
    return re.sub(r'\D', '', str(value))

def validate_cpf(cpf: str) -> str:
    """
    Validates CPF. Raises HTTPException if invalid.
    Returns cleaned CPF (digits only).
    """
    cleaned = clean_digits(cpf)

    if not cleaned:
        return None

    if not cpf_validator.validate(cleaned):
        raise HTTPException(status_code=400, detail=f"CPF inválido: {cpf}")

    return cleaned

def validate_cnpj(cnpj: str) -> str:
    """
    Validates CNPJ. Raises HTTPException if invalid.
    Returns cleaned CNPJ (digits only).
    """
    cleaned = clean_digits(cnpj)

    if not cleaned:
        return None

    if not cnpj_validator.validate(cleaned):
        raise HTTPException(status_code=400, detail=f"CNPJ inválido: {cnpj}")

    return cleaned

def format_cpf(cpf: str) -> str:
    """Formats CPF as 000.000.000-00"""
    cleaned = clean_digits(cpf)
    if not cleaned: return ""
    return cpf_validator.mask(cleaned)

def format_cnpj(cnpj: str) -> str:
    """Formats CNPJ as 00.000.000/0000-00"""
    cleaned = clean_digits(cnpj)
    if not cleaned: return ""
    return cnpj_validator.mask(cleaned)

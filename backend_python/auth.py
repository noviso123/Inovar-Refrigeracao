from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

from database import get_db
from models import User
from validators import validate_cpf, validate_cnpj

# Configuração Supabase
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "CIfxVzZteqyj/JG//wd0J/GjnwG3CXZbcZo3uY5NSY+Q/pf8uQawdGPwSKWYNTskULe6jO0TU+zvPXWxzP5yQA==")
ALGORITHM = "HS256"

# Define OAuth2 scheme for Swagger UI and dependency injection
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Verify Supabase JWT
        # Supabase uses HS256 and the project secret
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[ALGORITHM], options={"verify_act": False})
        email: str = payload.get("email")
        if email is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Verification Failed: {e}")
        raise credentials_exception

    # Lookup user in our local database
    user = db.query(User).filter(User.email == email).first()

    # Auto-sync: If user exists in Supabase (valid token) but not here, create them
    if user is None:
        new_user = User(
            email=email,
            full_name=payload.get("user_metadata", {}).get("full_name", email.split('@')[0]),
            role=payload.get("user_metadata", {}).get("role", "prestador"), # Default role
            is_active=True,
            password_hash="supabase_managed" # Placeholder
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user = new_user

    return user

# Rotas
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Legacy Internal Login (Deprecated by Supabase)
# @router.post("/auth/login")
# ... removed

@router.post("/register", response_model=Token)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "cpf": current_user.cpf,
        "avatar_url": current_user.avatar_url,
        "signature_url": current_user.signature_url,
        "address": current_user.address_json
    }

# Aliases for frontend compatibility
@router.get("/auth/me")
async def auth_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await read_users_me(current_user, db)

@router.post("/auth/google")
async def google_login(token: dict):
    # Mock Google Login for now - aligned with monolithic role structure
    return {
        "token": "mock_google_token",
        "usuario": {
            "id": 1,
            "email": "google@test.com",
            "nome_completo": "Google User",
            "cargo": "prestador"
        }
    }

@router.post("/auth/google/link")
async def google_link(token: dict):
    """Link Google account to existing user"""
    return {"message": "Conta Google vinculada com sucesso"}

@router.post("/auth/setup-admin")
async def setup_first_admin(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    # 1. Verification: Is there ANY admin?
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed. An admin exists."
        )

    # 2. Extract Token from Header (Manual verification as this is a hybrid endpoint)
    # Ideally, we should use Depends(get_current_user) but we want to allow 'unregistered' users in DB to call this?
    # No, with Supabase, the user IS registered in Auth, just not in DB properly as Admin.

    auth_header = request.headers.get('Authorization')
    if not auth_header:
         raise HTTPException(status_code=401, detail="Missing Authorization Header")

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[ALGORITHM], options={"verify_act": False})
        token_email = payload.get("email")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Token: {str(e)}")

    if token_email != user_data.email:
        raise HTTPException(status_code=400, detail="Token email does not match provided email")

    # 3. Create/Update Admin in Local DB
    # Check if user was already auto-created by get_current_user (unlikely if they just signed up and went straight here, but possible)
    user = db.query(User).filter(User.email == user_data.email).first()

    if user:
        user.role = "admin" # Promote
    else:
        new_admin = User(
            email=user_data.email,
            password_hash="supabase_managed",
            full_name=user_data.full_name,
            role="admin", # Force Admin
            is_active=True
        )
        db.add(new_admin)

    db.commit()
    return {"message": "Admin created successfully", "email": user_data.email}

import os
import sys
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

# Load environment BEFORE importing database
load_dotenv('backend_python/.env')

sys.path.append(os.path.join(os.getcwd(), 'backend_python'))
from database import engine, SessionLocal, init_db
from models import User, SystemSettings, Base
from auth import pwd_context

def hard_reset():
    print("--- HARD RESET STARTING ---")
    
    # 1. Drop all tables
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    # 2. Recreate all tables
    print("Recreating all tables...")
    init_db()
    
    # 3. Create Admin User
    db = SessionLocal()
    try:
        print("Creating Admin User...")
        admin = User(
            email="admin@inovar.com.br",
            password_hash=pwd_context.hash("admin123"),
            full_name="Administrador Inovar",
            role="admin",
            is_active=True,
            phone="11999999999",
            cpf="12345678901",
            rg="123456789",
            orgao_emissor="SSP/SP",
            data_nascimento="1980-01-01",
            estado_civil="Casado",
            profissao="Empresário",
            cep="01001000",
            logradouro="Praça da Sé",
            numero="1",
            complemento="Lado A",
            bairro="Sé",
            cidade="São Paulo",
            estado="SP"
        )
        db.add(admin)
        
        # 4. Create Initial System Settings
        print("Creating System Settings...")
        settings = SystemSettings(
            id=1,
            business_name="Inovar Refrigeração",
            cnpj="12345678000199",
            email_contact="contato@inovar.com.br",
            phone_contact="11999999999",
            cep="01001000",
            logradouro="Praça da Sé",
            numero="1",
            bairro="Sé",
            cidade="São Paulo",
            estado="SP"
        )
        db.add(settings)
        
        db.commit()
        print("--- HARD RESET COMPLETE ---")
        print(f"Admin User created: {admin.email} / admin123")
    except Exception as e:
        print(f"Error during reset: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    hard_reset()

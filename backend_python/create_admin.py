from database import SessionLocal, init_db
from models import User
from passlib.context import CryptContext
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CreateAdmin")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    init_db()
    db = SessionLocal()
    try:
        email = "admin2@admin.com"
        password = "admin123"
        
        user = db.query(User).filter(User.email == email).first()
        if user:
            logger.info(f"Usuário {email} já existe. Atualizando senha...")
            user.password_hash = pwd_context.hash(password)
            user.role = "super_admin"
        else:
            logger.info(f"Criando usuário {email}...")
            user = User(
                email=email,
                password_hash=pwd_context.hash(password),
                full_name="Super Admin",
                role="super_admin",
                is_active=True
            )
            db.add(user)
        
        db.commit()
        logger.info("Admin configurado com sucesso!")
    except Exception as e:
        logger.error(f"Erro ao criar admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

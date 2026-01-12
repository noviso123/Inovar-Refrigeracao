import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Add backend_python to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend_python'))
from models import User, Client, ServiceOrder

# Hardcoded URL (same as reset script)
DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def verify():
    session = SessionLocal()
    try:
        print("Verifying Users...")
        users = session.query(User).all()
        print(f"Total Users: {len(users)}")
        
        target_emails = ["jtsatiro@hotmail.com", "gabirel@hotmail.com"]
        for email in target_emails:
            user = session.query(User).filter(User.email == email).first()
            if user:
                print(f"[OK] User {email} exists.")
                if verify_password("123456", user.password_hash):
                    print(f"[OK] Password for {email} is correct.")
                else:
                    print(f"[FAIL] Password for {email} is INCORRECT.")
            else:
                print(f"[FAIL] User {email} NOT found.")

        print("\nVerifying Random Data...")
        clients = session.query(Client).count()
        print(f"Total Clients: {clients}")
        if clients > 0:
            print("[OK] Clients exist.")
        else:
            print("[FAIL] No clients found.")

        os_count = session.query(ServiceOrder).count()
        print(f"Total Service Orders: {os_count}")
        if os_count > 0:
            print("[OK] Service Orders exist.")
        else:
            print("[FAIL] No Service Orders found.")

    except Exception as e:
        print(f"Verification failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    verify()

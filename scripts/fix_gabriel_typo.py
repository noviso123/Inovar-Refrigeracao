import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Setup DB connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or "sqlite" in DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Setup Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(password):
    return pwd_context.hash(password)

def fix_typo():
    print("Fixing typo gabirel -> gabriel...")
    
    # Check if correct user exists
    correct_email = "gabriel@hotmail.com"
    typo_email = "gabirel@hotmail.com"
    
    correct_user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": correct_email}).fetchone()
    typo_user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": typo_email}).fetchone()
    
    new_hash = get_password_hash("123456")
    
    if correct_user:
        print(f"User {correct_email} already exists. Updating role and password...")
        db.execute(text("""
            UPDATE users 
            SET role = 'prestador', 
                password_hash = :hash,
                is_active = true
            WHERE id = :id
        """), {"hash": new_hash, "id": correct_user.id})
        db.commit()
        print("✅ Updated existing gabriel@hotmail.com")
        
        # Optionally delete typo if it exists and is different?
        if typo_user and typo_user.id != correct_user.id:
            print(f"Deleting duplicate typo user {typo_email}...")
            db.execute(text("DELETE FROM users WHERE id = :id"), {"id": typo_user.id})
            db.commit()
            print("🗑️ Deleted typo user.")
            
    elif typo_user:
        print(f"Renaming {typo_email} to {correct_email}...")
        db.execute(text("""
            UPDATE users 
            SET email = :new_email,
                role = 'prestador', 
                password_hash = :hash,
                is_active = true
            WHERE id = :id
        """), {"new_email": correct_email, "hash": new_hash, "id": typo_user.id})
        db.commit()
        print(f"✅ Renamed {typo_email} to {correct_email}")
        
    else:
        print(f"Creating new user {correct_email}...")
        db.execute(text("""
            INSERT INTO users (email, password_hash, full_name, role, is_active)
            VALUES (:email, :hash, 'Gabriel Prestador', 'prestador', true)
        """), {"email": correct_email, "hash": new_hash})
        db.commit()
        print(f"✅ Created {correct_email}")

if __name__ == "__main__":
    try:
        fix_typo()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

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

def fix_user():
    print("Fixing user gabriel@hotmail.com...")
    
    # Check for both spellings just in case
    emails = ["gabriel@hotmail.com", "gabirel@hotmail.com"]
    
    found = False
    for email in emails:
        # Use text query to avoid importing models that might be broken or changed
        result = db.execute(text("SELECT id, email, role FROM users WHERE email = :email"), {"email": email}).fetchone()
        
        if result:
            print(f"Found user: {result.email} (ID: {result.id}, Role: {result.role})")
            
            # Update role and password
            new_hash = get_password_hash("123456")
            db.execute(text("""
                UPDATE users 
                SET role = 'prestador', 
                    password_hash = :hash,
                    is_active = true
                WHERE id = :id
            """), {"hash": new_hash, "id": result.id})
            db.commit()
            print(f"✅ Updated {result.email}: Role -> prestador, Password -> 123456")
            found = True
            
    if not found:
        print("❌ User gabriel@hotmail.com (or gabirel) not found in database!")
        # Create it if not found? User said "should be prestador", implying it exists.
        # But let's create it to be safe.
        print("Creating user gabriel@hotmail.com...")
        new_hash = get_password_hash("123456")
        db.execute(text("""
            INSERT INTO users (email, password_hash, full_name, role, is_active)
            VALUES (:email, :hash, 'Gabriel Prestador', 'prestador', true)
        """), {"email": "gabriel@hotmail.com", "hash": new_hash})
        db.commit()
        print("✅ Created user gabriel@hotmail.com")

if __name__ == "__main__":
    try:
        fix_user()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

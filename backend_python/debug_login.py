import os
# Set env var BEFORE importing database module
# Reverting to Pooler (Session Mode)
os.environ['DATABASE_URL'] = 'postgresql://postgres.apntpretjodygczbeozk:inovar862485@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'

from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, engine
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

print("Testing database connection and login logic...")

try:
    # Test connection
    # Skipping explicit SELECT 1 to avoid transaction issues with pooler
    # with engine.connect() as connection:
    #     print("✅ Engine connection successful!")
    #     result = connection.execute(text("SELECT 1")).fetchone()
    #     print(f"✅ SELECT 1 result: {result}")

    # Test Session and User Query
    db = next(get_db())
    print("✅ Session created.")
    
    email = "admin@inovar.com"
    print(f"Querying user: {email}")
    
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        print(f"✅ User found: {user.id} - {user.email}")
        print(f"Role: {user.role}")
        
        if verify_password("admin123", user.password_hash):
            print("✅ Password verified!")
        else:
            print("❌ Password verification failed!")
    else:
        print("❌ User not found!")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    if 'db' in locals():
        db.close()

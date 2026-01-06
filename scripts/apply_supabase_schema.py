import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to sys.path to import models and database
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend_python"))
sys.path.append(backend_path)

from database import engine, init_db
from models import Base

def apply_schema():
    print("Connecting to Supabase Database (IPv4 Pooler - URL Encoded)...")
    # InovarRefrig2024SecurePass! -> InovarRefrig2024SecurePass%21
    db_url = "postgresql://postgres.apntpretjodygczbeozk:InovarRefrig2024SecurePass%21@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
    temp_engine = create_engine(db_url)

    print("Applying schema (creating tables)...")
    try:
        Base.metadata.create_all(bind=temp_engine)
        print("✅ Schema applied successfully!")
    except Exception as e:
        print(f"❌ Error applying schema: {e}")

if __name__ == "__main__":
    apply_schema()

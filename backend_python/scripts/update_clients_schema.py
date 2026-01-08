import os
import sys
from sqlalchemy import text, inspect

# Add parent directory to path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
except ImportError:
    print("⚠️ python-dotenv not installed, skipping .env loading")

from database import engine

def update_clients_schema():
    print("🔄 Checking clients table schema...")
    inspector = inspect(engine)
    
    columns = [c['name'] for c in inspector.get_columns('clients')]
    print(f"Current columns in 'clients': {columns}")
    
    if 'maintenance_period' not in columns:
        print("⚠️ Missing column: maintenance_period")
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE clients ADD COLUMN maintenance_period INTEGER DEFAULT 6"))
                conn.commit()
                print("✅ Added column maintenance_period")
            except Exception as e:
                print(f"❌ Failed to add column maintenance_period: {e}")
    else:
        print("✅ Column maintenance_period exists")
    
    print("🏁 Schema update complete.")

if __name__ == "__main__":
    update_clients_schema()

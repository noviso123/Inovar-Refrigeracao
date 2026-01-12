import os
import sys

# Add parent directory to path to import database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text, inspect

def update_schema():
    print("🔄 Checking database schema...")
    inspector = inspect(engine)
    
    # Check users table
    columns = [c['name'] for c in inspector.get_columns('users')]
    print(f"Current columns in 'users': {columns}")
    
    missing_columns = []
    
    # Define expected columns and their types
    expected_columns = {
        "phone": "VARCHAR",
        "cpf": "VARCHAR",
        "avatar_url": "VARCHAR",
        "signature_url": "TEXT",
        "address_json": "JSON"
    }
    
    with engine.connect() as conn:
        for col, type_ in expected_columns.items():
            if col not in columns:
                print(f"⚠️ Missing column: {col}")
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {type_}"))
                    print(f"✅ Added column {col}")
                except Exception as e:
                    print(f"❌ Failed to add column {col}: {e}")
            else:
                print(f"✅ Column {col} exists")
        
        conn.commit()
    
    print("🏁 Schema update complete.")

if __name__ == "__main__":
    update_schema()

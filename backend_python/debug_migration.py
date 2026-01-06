import os
import sys

try:
    from sqlalchemy import create_engine, text
    print("SQLAlchemy imported successfully.")
except ImportError as e:
    print(f"Error importing SQLAlchemy: {e}")
    sys.exit(1)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/inovar_db")
# If running locally without docker network, might need localhost
if "db" in DATABASE_URL and os.name == 'nt': # Windows
    print("Detected Windows, trying localhost...")
    DATABASE_URL = DATABASE_URL.replace("@db:", "@localhost:")

print(f"Connecting to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Connected!")
        
        # Check if column exists
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='subscription_plans' AND column_name='limit_technicians'"))
        if result.fetchone():
            print("Column limit_technicians already exists.")
        else:
            print("Adding limit_technicians column...")
            conn.execute(text("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS limit_technicians INTEGER"))
            conn.commit()
            print("Column added successfully.")
            
except Exception as e:
    print(f"Database error: {e}")

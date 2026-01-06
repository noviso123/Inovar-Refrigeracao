from database import engine
from sqlalchemy import create_engine, text

# Try localhost
try:
    print("Trying 127.0.0.1...")
    engine_local = create_engine("postgresql://postgres:postgres@127.0.0.1:5432/inovar_db")
    with engine_local.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"Database connection successful to localhost! Result: {result.scalar()}")
except Exception as e:
    print(f"Database connection failed to localhost: {e}")


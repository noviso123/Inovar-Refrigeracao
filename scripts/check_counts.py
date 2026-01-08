import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_counts():
    tables = ["users", "system_settings", "clients", "locations", "equipments", "service_orders"]
    for table in tables:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"Table {table}: {count} records")

if __name__ == "__main__":
    check_counts()

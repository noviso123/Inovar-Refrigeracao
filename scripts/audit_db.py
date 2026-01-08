import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def audit_all():
    tables = ["system_settings", "users", "clients", "locations", "equipments", "service_orders"]
    for table in tables:
        print(f"\n--- Table: {table} ---")
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY column_name"))
            for row in result:
                print(f" - {row[0]} ({row[1]})")

if __name__ == "__main__":
    audit_all()

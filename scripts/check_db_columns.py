import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def check_columns(table_name):
    print(f"--- Columns for {table_name} ---")
    import sys
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}' ORDER BY column_name"))
        cols = [row[0] for row in result]
        if not cols:
            print(f"Table '{table_name}' not found or has no columns.")
        else:
            for col in cols:
                print(f" - {col}")
    sys.stdout.flush()

if __name__ == "__main__":
    check_columns("clients")
    check_columns("locations")
    check_columns("equipments")
    check_columns("service_orders")
    check_columns("system_settings")
    check_columns("users")

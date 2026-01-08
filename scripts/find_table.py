import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def find_table(table_name):
    print(f"--- Searching for table '{table_name}' ---")
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT table_schema FROM information_schema.tables WHERE table_name = '{table_name}'"))
        for row in result:
            print(f"Found in schema: {row[0]}")

if __name__ == "__main__":
    find_table("users")
    find_table("clients")
    find_table("service_orders")

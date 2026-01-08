import os
import sys
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def get_columns(table):
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position"))
        print(f"Columns for {table}:")
        for row in result:
            print(f" - {row[0]} ({row[1]}, nullable={row[2]})")

if __name__ == "__main__":
    get_columns("users")

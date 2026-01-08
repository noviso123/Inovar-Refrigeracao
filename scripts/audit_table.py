import os
import sys
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def audit_table(table):
    print(f"\n--- Table: {table} ---")
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY column_name"))
        for row in result:
            print(f" - {row[0]} ({row[1]})")
    sys.stdout.flush()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        audit_table(sys.argv[1])
    else:
        print("Usage: python audit_table.py <table_name>")

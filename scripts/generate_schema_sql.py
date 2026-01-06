from sqlalchemy import create_engine
from sqlalchemy.schema import CreateTable
import datetime
import os
import sys

# Add the backend directory to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend_python"))
sys.path.append(backend_path)

from models import Base

def generate_sql():
    # Use a mock engine to generate SQL
    engine = create_engine('postgresql://')

    sql_statements = []
    # Order matters for foreign keys
    for table in Base.metadata.sorted_tables:
        sql_statements.append(str(CreateTable(table).compile(engine)) + ";")

    with open("schema.sql", "w", encoding="utf-8") as f:
        f.write("-- Supabase Schema Fallback\n")
        f.write(f"-- Generated on: {datetime.datetime.now()}\n\n")
        f.write("\n\n".join(sql_statements))

    print("✅ SQL Schema generated in schema.sql")

if __name__ == "__main__":
    generate_sql()

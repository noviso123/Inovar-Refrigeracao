from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('backend_python/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def add_column_if_not_exists(conn, table, column, type_def):
    try:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}"))
        print(f"✅ Added column {column} to {table}")
    except Exception as e:
        if "already exists" in str(e):
            print(f"ℹ️ Column {column} already exists in {table}")
        else:
            print(f"❌ Failed to add column {column}: {e}")

def migrate():
    print("Starting migration...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("COMMIT")) # Ensure we are not in a transaction block for ALTER TABLE
        
        columns = [
            ("rg", "VARCHAR"),
            ("orgao_emissor", "VARCHAR"),
            ("data_nascimento", "VARCHAR"),
            ("estado_civil", "VARCHAR"),
            ("profissao", "VARCHAR")
        ]

        for col, type_def in columns:
            add_column_if_not_exists(conn, "users", col, type_def)
            conn.execute(text("COMMIT"))

    print("Migration complete.")

if __name__ == "__main__":
    migrate()

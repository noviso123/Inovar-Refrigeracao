from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('backend_python/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def drop_column_if_exists(conn, table, column):
    try:
        conn.execute(text(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {column}"))
        print(f"✅ Dropped column {column} from {table}")
    except Exception as e:
        print(f"❌ Failed to drop column {column}: {e}")

def migrate():
    print("Starting schema refactoring...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("COMMIT")) # Ensure we are not in a transaction block for ALTER TABLE
        
        columns_to_drop = [
            "rg",
            "orgao_emissor",
            "data_nascimento",
            "estado_civil",
            "profissao"
        ]

        for col in columns_to_drop:
            drop_column_if_exists(conn, "users", col)
            conn.execute(text("COMMIT"))

    print("Schema refactoring complete.")

if __name__ == "__main__":
    migrate()

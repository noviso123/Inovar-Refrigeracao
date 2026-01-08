from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('backend_python/.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def migrate():
    print("Starting address segmentation migration...")
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("COMMIT")) # Ensure we are not in a transaction block
        
        # 1. Add new columns
        new_columns = [
            ("cep", "VARCHAR"),
            ("logradouro", "VARCHAR"),
            ("numero", "VARCHAR"),
            ("complemento", "VARCHAR"),
            ("bairro", "VARCHAR"),
            ("cidade", "VARCHAR"),
            ("estado", "VARCHAR")
        ]

        for col, type_def in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {type_def}"))
                print(f"✅ Added column {col}")
            except Exception as e:
                if "already exists" in str(e):
                    print(f"ℹ️ Column {col} already exists")
                else:
                    print(f"❌ Failed to add column {col}: {e}")
            conn.execute(text("COMMIT"))

        # 2. Drop old column
        try:
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS address_json"))
            print("✅ Dropped column address_json")
        except Exception as e:
            print(f"❌ Failed to drop column address_json: {e}")
        conn.execute(text("COMMIT"))

    print("Migration complete.")

if __name__ == "__main__":
    migrate()

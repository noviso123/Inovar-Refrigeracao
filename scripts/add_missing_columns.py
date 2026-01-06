import os
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env
load_dotenv(dotenv_path="backend_python/.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    exit(1)

def migrate():
    print(f"🔌 Connecting to database...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("🔍 Checking columns...")

        # Check signature
        try:
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN assinatura_tecnico TEXT"))
            print("✅ Added column: assinatura_tecnico")
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️ Column assinatura_tecnico already exists.")
            else:
                print(f"⚠️ Error adding assinatura_tecnico: {e}")

        # Check nfse_json
        try:
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN nfse_json JSONB")) # Use JSONB for Postgres
            print("✅ Added column: nfse_json")
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️ Column nfse_json already exists.")
            else:
                # Fallback to JSON if JSONB fails (though JSONB is standard in PG)
                try:
                    conn.execute(text("ALTER TABLE service_orders ADD COLUMN nfse_json JSON"))
                    print("✅ Added column: nfse_json (as JSON)")
                except Exception as e2:
                     if "already exists" in str(e2):
                        print("ℹ️ Column nfse_json already exists.")
                     else:
                        print(f"⚠️ Error adding nfse_json: {e2}")

        conn.commit()

    print("\n✅ Migration Check Complete.")

if __name__ == "__main__":
    migrate()

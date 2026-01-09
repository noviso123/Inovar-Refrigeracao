import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.apntpretjodygczbeozk:inovar862485@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"

def test_conn():
    try:
        engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print(f"Connection successful: {result.fetchone()}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_conn()

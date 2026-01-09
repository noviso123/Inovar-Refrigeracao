import psycopg2
import os

# Direct Connection String
DATABASE_URL = "postgresql://postgres.apntpretjodygczbeozk:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres"

print(f"Testing connection to: {DATABASE_URL.split('@')[-1]}...")

try:
    conn = psycopg2.connect(DATABASE_URL, sslmode='require', connect_timeout=10)
    print("✅ Connection successful!")
    
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"✅ Database version: {version[0]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Connection failed: {e}")

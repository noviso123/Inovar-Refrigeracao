import psycopg2
import os

DATABASE_URL = "postgresql://postgres.apntpretjodygczbeozk:inovar862485@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

print(f"Connecting to {DATABASE_URL.split('@')[-1]}...")

try:
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    conn.autocommit = True # Enable autocommit
    print("✅ Connection successful (autocommit=True)!")
    
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"✅ Database version: {version[0]}")
    
    cur.close()
    conn.close()
    print("✅ Connection closed.")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")

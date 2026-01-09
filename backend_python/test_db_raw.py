import psycopg2
import os

DATABASE_URL = "postgresql://postgres.apntpretjodygczbeozk:inovar862485@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

print(f"Connecting to {DATABASE_URL.split('@')[-1]}...")

try:
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    print("✅ Connection successful!")
    
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"✅ Database version: {version[0]}")
    
    cur.execute("SELECT count(*) FROM information_schema.tables;")
    count = cur.fetchone()
    print(f"✅ Table count: {count[0]}")
    
    cur.close()
    conn.close()
    print("✅ Connection closed.")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")

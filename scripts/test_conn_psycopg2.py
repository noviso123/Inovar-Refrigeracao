import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.production'))

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"URL: {DATABASE_URL[:20]}...")

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("Connected successfully!")
    cur = conn.cursor()
    cur.execute("SELECT 1")
    print(f"Result: {cur.fetchone()}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")

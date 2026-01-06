import psycopg2
import sys

def test_conn():
    # Attempt 1: Pooler with different username format
    # format: postgres.[ref]
    params = [
        {"host": "aws-0-sa-east-1.pooler.supabase.com", "port": 6543, "user": "postgres.apntpretjodygczbeozk", "dbname": "postgres"},
        {"host": "aws-0-sa-east-1.pooler.supabase.com", "port": 5432, "user": "postgres.apntpretjodygczbeozk", "dbname": "postgres"},
        {"host": "db.apntpretjodygczbeozk.supabase.co", "port": 5432, "user": "postgres", "dbname": "postgres"}
    ]

    password = "InovarRefrig2024SecurePass!"

    for p in params:
        print(f"Testing: {p['host']}:{p['port']} as {p['user']}...")
        try:
            conn = psycopg2.connect(
                host=p['host'],
                port=p['port'],
                user=p['user'],
                password=password,
                dbname=p['dbname'],
                connect_timeout=5
            )
            print("✅ SUCCESS!")
            conn.close()
            return p
        except Exception as e:
            print(f"❌ Failed: {e}")

    return None

if __name__ == "__main__":
    test_conn()

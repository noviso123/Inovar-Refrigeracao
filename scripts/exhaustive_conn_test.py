import psycopg2
import sys

def exhaustive_test():
    ref = "apntpretjodygczbeozk"
    pw = "InovarRefrig2024SecurePass!"

    # Common Supabase Pooler Hosts
    hosts = [
        "aws-0-sa-east-1.pooler.supabase.com",
        "db.apntpretjodygczbeozk.supabase.co"
    ]

    # Common Formats
    users = [
        f"postgres.{ref}",
        "postgres",
        f"postgres[\"{ref}\"]"
    ]

    ports = [5432, 6543]

    for host in hosts:
        for port in ports:
            for user in users:
                print(f"Testing {host}:{port} as {user}...")
                try:
                    conn = psycopg2.connect(
                        host=host,
                        port=port,
                        user=user,
                        password=pw,
                        dbname="postgres",
                        connect_timeout=3
                    )
                    print(f"✅ SUCCESS: {host}:{port} @ {user}")
                    conn.close()
                    return (host, port, user)
                except Exception as e:
                    print(f"❌ Failed: {str(e).strip()}")

    return None

if __name__ == "__main__":
    exhaustive_test()

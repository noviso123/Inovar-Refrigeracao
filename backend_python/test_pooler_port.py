import socket

host = "aws-0-sa-east-1.pooler.supabase.com"
port = 6543

print(f"Testing TCP connection to {host}:{port}...")

try:
    sock = socket.create_connection((host, port), timeout=10)
    print("✅ Port 6543 is OPEN! We can try using the Pooler.")
    sock.close()
except Exception as e:
    print(f"❌ Port 6543 is BLOCKED: {e}")

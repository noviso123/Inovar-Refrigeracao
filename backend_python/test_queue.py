import requests
import time

BASE_URL = "http://127.0.0.1:8000"

# 1. Check Queue (Should be empty or have old messages)
print("Checking queue...")
try:
    resp = requests.get(f"{BASE_URL}/api/whatsapp/queue")
    print(f"Queue size: {len(resp.json())}")
except Exception as e:
    print(f"Error checking queue: {e}")

# 2. Simulate Service Order Notification (Insert into Queue via DB or Mock)
# Since we don't have a direct endpoint to insert into queue for testing, 
# we'll use the /send endpoint which falls back to queue if WPPConnect is down/busy
# OR we can use the /solicitacoes/{id}/send-whatsapp endpoint if we have an OS.

# Let's try to use the /api/whatsapp/send endpoint to queue a message
print("\nSending test message to queue...")
payload = {
    "number": "5511999999999", # Test number
    "message": "Teste de Fila de Envio - Inovar Refrigeracao"
}
try:
    resp = requests.post(f"{BASE_URL}/api/whatsapp/send", json=payload)
    print(f"Send response: {resp.status_code} - {resp.json()}")
except Exception as e:
    print(f"Error sending message: {e}")

# 3. Wait for Scheduler (runs every 1 minute)
print("\nWaiting 70 seconds for scheduler to process...")
time.sleep(70)

# 4. Check Queue Again (Status should be 'enviado' or 'erro')
print("\nChecking queue status...")
try:
    resp = requests.get(f"{BASE_URL}/api/whatsapp/queue")
    queue = resp.json()
    if queue:
        latest = queue[0]
        print(f"Latest message status: {latest['status']}")
        print(f"Message: {latest['mensagem']}")
    else:
        print("Queue is empty.")
except Exception as e:
    print(f"Error checking queue: {e}")

import sys
import os
import time
from dotenv import load_dotenv

# Load environment BEFORE importing database
load_dotenv('backend_python/.env')

sys.path.append(os.path.join(os.getcwd(), 'backend_python'))
from database import SessionLocal
from models import Client

def test_create_client():
    db = SessionLocal()
    try:
        from sqlalchemy import func
        print("Testing sequential_id logic...")
        max_id = db.query(func.max(Client.sequential_id)).scalar()
        sequential_id = (max_id or 0) + 1
        print(f"Next sequential_id: {sequential_id}")

        print("Creating client directly in DB...")
        client = Client(
            name="Direct Test Client",
            email=f"direct_{int(time.time())}@test.com",
            document="12345678901",
            phone="11999999999",
            sequential_id=sequential_id
        )
        db.add(client)
        db.commit()
        print(f"Client created with ID: {client.id}")
        
        # Cleanup
        db.delete(client)
        db.commit()
        print("Client deleted.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create_client()

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User
from auth import get_password_hash

def reset_password(email, new_password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User {email} not found")
            return
        
        print(f"Resetting password for {email}...")
        hashed = get_password_hash(new_password)
        print(f"Generated hash: {hashed[:10]}...")
        
        user.password_hash = hashed
        db.commit()
        print("✅ Password reset successfully")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_password("jtsatiro@hotmail.com", "123456")

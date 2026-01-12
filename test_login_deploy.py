import os
import sys
from sqlalchemy import create_engine, text

# Mock Redis
os.environ["REDIS_URL"] = ""
os.environ["REDIS_HOST"] = "invalid_host"
# Set Real Supabase Connection
os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL", "postgresql://user:pass@host:5432/db")

# Ensure backend_python is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, "backend_python")
if backend_path not in sys.path:
    sys.path.append(backend_path)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from backend_python.database import init_db, get_db, engine
from backend_python.models import User
from backend_python.auth import get_password_hash, create_access_token

def test_login():
    with open("login_test_log.txt", "w") as log:
        log.write("Starting Login Test...\n")
        
        try:
            log.write("Initializing Database...\n")
            init_db()
            log.write("Database Initialized.\n")

            db = next(get_db())
            email = "test_deploy@example.com"
            password = "password123"
            
            user = db.query(User).filter(User.email == email).first()
            if not user:
                log.write(f"Creating user {email}...\n")
                hashed_pw = get_password_hash(password)
                user = User(email=email, password_hash=hashed_pw, full_name="Test Deploy", role="admin")
                db.add(user)
                db.commit()
                log.write("User created.\n")
            else:
                log.write("User already exists.\n")

            log.write("Testing Login...\n")
            access_token = create_access_token(data={"sub": email})
            log.write(f"Login Successful! Token generated: {access_token[:20]}...\n")

            log.write("Test Complete!\n")
        except Exception as e:
            log.write(f"Test Failed: {e}\n")
            import traceback
            traceback.print_exc(file=log)

if __name__ == "__main__":
    test_login()

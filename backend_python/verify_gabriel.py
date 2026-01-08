import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def verify():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT email, password_hash FROM users WHERE email = 'gabriel@hotmail.com'"))
        row = res.fetchone()
        if row:
            email, pw_hash = row
            print(f"Found user: {email}")
            print(f"Hash: {pw_hash[:10]}...")

            # Test verify with current bcrypt
            from auth import pwd_context
            is_ok = pwd_context.verify("123456", pw_hash)
            print(f"Verification of '123456': {is_ok}")
        else:
            print("User not found!")

if __name__ == "__main__":
    verify()

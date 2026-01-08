import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add the current directory to sys.path to import local modules
sys.path.append(os.getcwd())

load_dotenv()

from auth import get_password_hash

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def sync():
    hashed_pw = get_password_hash('123456')
    print(f"Hashed password: {hashed_pw[:10]}...")

    with engine.connect() as conn:
        print("Updating passwords in Supabase...")
        # Update both id=1 and id=2
        conn.execute(text("UPDATE users SET password_hash = :h WHERE id = 1"), {"h": hashed_pw})
        conn.execute(text("UPDATE users SET password_hash = :h WHERE id = 2"), {"h": hashed_pw})
        conn.commit()
        print("Success: Both users updated to '123456'.")

if __name__ == "__main__":
    sync()

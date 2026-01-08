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

def check():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, email, full_name, role FROM users"))
        users = [dict(row._mapping) for row in res]
        print(f"Total users found: {len(users)}")
        for u in users:
            print(f"ID: {u['id']} | Email: {u['email']} | Name: {u['full_name']} | Role: {u['role']}")

if __name__ == "__main__":
    check()

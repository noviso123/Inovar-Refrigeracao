import sys
import os
from dotenv import load_dotenv

# Load environment BEFORE importing database
load_dotenv('backend_python/.env')

sys.path.append(os.path.join(os.getcwd(), 'backend_python'))
from database import init_db

if __name__ == "__main__":
    print(f"DATABASE_URL: {os.getenv('DATABASE_URL')}")
    print("Initializing database...")
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")

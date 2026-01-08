import os
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

load_dotenv('backend_python/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

def list_schemas():
    print("--- Schemas in Database ---")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT schema_name FROM information_schema.schemata"))
        for row in result:
            print(f" - {row[0]}")

if __name__ == "__main__":
    list_schemas()

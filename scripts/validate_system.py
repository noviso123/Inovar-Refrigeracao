import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
import glob

# Hardcoded URL (same as reset script)
DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)

def validate_database():
    print("\n=== DATABASE VALIDATION ===")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"Found {len(tables)} tables.")
    
    with engine.connect() as conn:
        for table in tables:
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM \"{table}\"")).scalar()
                columns = [col['name'] for col in inspector.get_columns(table)]
                print(f"Table: {table:<25} | Rows: {count:<5} | Columns: {len(columns)}")
                # Optional: Print columns if needed
                # print(f"  Columns: {', '.join(columns)}")
            except Exception as e:
                print(f"Error inspecting {table}: {e}")

def validate_frontend():
    print("\n=== FRONTEND VALIDATION ===")
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend-svelte', 'src', 'routes')
    
    if not os.path.exists(frontend_path):
        print(f"Frontend path not found: {frontend_path}")
        return

    routes = []
    for root, dirs, files in os.walk(frontend_path):
        for file in files:
            if file == "+page.svelte":
                rel_path = os.path.relpath(root, frontend_path)
                route = "/" + rel_path.replace("\\", "/")
                if route == "/.": route = "/"
                routes.append(route)
    
    print(f"Found {len(routes)} routes.")
    for route in sorted(routes):
        print(f"Route: {route}")

if __name__ == "__main__":
    try:
        validate_database()
        validate_frontend()
    except Exception as e:
        print(f"Validation failed: {e}")

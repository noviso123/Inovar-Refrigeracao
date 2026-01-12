import os
import sys
from sqlalchemy import create_engine, text

# Hardcoded URL (same as reset script)
DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)

def wipe_data():
    print("Starting Data Wipe...")
    
    # Tables to truncate (Order matters for foreign keys if not using CASCADE, but we use CASCADE)
    tables_to_wipe = [
        "service_order_items",
        "service_orders",
        "equipments",
        "locations",
        "clients",
        "notifications",
        "system_settings",
        "audit_logs"
    ]
    
    with engine.connect() as conn:
        # Verify users count before
        users_before = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print(f"Users before wipe: {users_before}")
        
        for table in tables_to_wipe:
            print(f"Wiping table: {table}...")
            try:
                # Use CASCADE to handle dependencies
                conn.execute(text(f"TRUNCATE TABLE \"{table}\" CASCADE"))
                conn.commit()
                print(f"  -> {table} wiped.")
            except Exception as e:
                print(f"  -> Error wiping {table} (might not exist): {e}")
                conn.rollback()
        
        # Verify users count after
        users_after = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print(f"Users after wipe: {users_after}")
        
        if users_before == users_after:
            print("SUCCESS: Users table preserved.")
        else:
            print("WARNING: Users count changed!")

if __name__ == "__main__":
    wipe_data()

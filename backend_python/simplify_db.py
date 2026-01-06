import os
from sqlalchemy import create_engine, text

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/inovar_db")

def simplify_database():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            print("Dropping unused tables...")
            conn.execute(text("DROP TABLE IF EXISTS nfse CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS subscriptions CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS subscription_plans CASCADE"))
            
            print("Updating Users roles...")
            # Convert super_admin to admin
            conn.execute(text("UPDATE users SET role = 'admin' WHERE role = 'super_admin'"))
            # Ensure all users belong to company 1
            conn.execute(text("UPDATE users SET company_id = 1 WHERE company_id IS NULL"))
            
            print("Ensuring Company 1 exists...")
            # Check if company 1 exists
            result = conn.execute(text("SELECT id FROM companies WHERE id = 1"))
            if not result.fetchone():
                conn.execute(text("""
                    INSERT INTO companies (id, name, cnpj, email_contact, status)
                    VALUES (1, 'Inovar Refrigeração', '00.000.000/0001-00', 'admin@inovar.com', 'ativa')
                """))
            
            print("Database simplification complete!")
            conn.commit()
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    simplify_database()

import os
import sys
import random
import string
import traceback
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.production'))

# Add backend_python to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend_python'))

from models import Base, User, Client, Location, Equipment, ServiceOrder, ItemOS

# Database setup
# Hardcoded URL from debugging (bypassing .env issues)
DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres?sslmode=require"
print(f"DEBUG: Using Hardcoded URL")


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def random_string(length=10):
    return ''.join(random.choices(string.ascii_letters, k=length))

def random_digits(length=11):
    return ''.join(random.choices(string.digits, k=length))

def random_phone():
    return f"({random_digits(2)}) 9{random_digits(8)}"

def reset_database():
    session = SessionLocal()
    try:
        print("Starting database reset...")
        
        # 1. Preserve Users
        preserved_emails = ["jtsatiro@hotmail.com", "gabirel@hotmail.com"]
        preserved_users_data = []
        
        # 1. Preserve Users (Skipped to avoid crash - will recreate)
        print("STEP: Skipping user preservation (will recreate default users)")
        preserved_users_data = []
        preserved_emails = ["jtsatiro@hotmail.com", "gabirel@hotmail.com"]
        for email in preserved_emails:
            preserved_users_data.append({
                "email": email,
                "full_name": "Admin User",
                "role": "admin",
                "is_active": True
            })
        
        # try:
        #     for email in preserved_emails:
        #         ...
        # except Exception as e:
        #     ...

        # 2. Drop all tables (Robust method - Individual Drop)
        print("STEP: Dropping tables individually...")
        
        # Test connection
        try:
            print("STEP: Testing connection...")
            with engine.connect() as conn:
                conn.execute(text("ROLLBACK")) # Ensure clean state
                conn.execute(text("SELECT 1"))
            print("Connection successful.")
        except Exception as e:
            print(f"Connection failed: {e}")
            raise

        from sqlalchemy import inspect
        tables = []
        try:
            print("STEP: Inspecting tables...")
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print(f"Found tables: {tables}")
        except Exception as e:
            print(f"Inspection failed: {e}. Falling back to known tables.")
            # Fallback to known tables in reverse dependency order
            tables = [
                "service_order_items", "service_orders", "equipments", "locations", 
                "clients", "users", "system_settings", "notifications", "alembic_version"
            ]
        
        with engine.connect() as conn:
            conn.execute(text("ROLLBACK"))
            # Disable constraints temporarily if possible, or just use CASCADE
            for table in tables:
                print(f"STEP: Dropping table {table}...")
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS \"{table}\" CASCADE"))
                    conn.commit() # Commit after each drop
                except Exception as e:
                    print(f"Failed to drop {table}: {e}")
                    conn.rollback()
        print("All tables dropped.")
        
        # 3. Re-create tables
        print("Re-creating tables...")
        Base.metadata.create_all(bind=engine)
        
        # 4. Restore/Create Preserved Users
        print("Restoring users...")
        for user_data in preserved_users_data:
            new_user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=user_data["is_active"],
                password_hash=get_password_hash("123456"),
                phone=random_phone(),
                cpf=random_digits(11)
            )
            session.add(new_user)
        session.commit()
        
        # Get user IDs for relationships
        users = session.query(User).all()
        user_ids = [u.id for u in users]

        # 5. Seed Random Data
        print("Seeding random data...")
        
        # Create Clients
        clients = []
        for i in range(10):
            client = Client(
                name=f"Client {random_string(5)}",
                document=random_digits(14),
                email=f"client{i}@example.com",
                phone=random_phone(),
                maintenance_period=6
            )
            session.add(client)
            clients.append(client)
        session.commit()
        
        # Create Locations
        locations = []
        for client in clients:
            loc = Location(
                client_id=client.id,
                nickname=f"Sede {client.name}",
                address=f"Rua {random_string(10)}",
                city="São Paulo",
                state="SP",
                zip_code=random_digits(8),
                street_number=random_digits(3),
                neighborhood=f"Bairro {random_string(5)}"
            )
            session.add(loc)
            locations.append(loc)
        session.commit()
        
        # Create Equipments
        equipments = []
        for loc in locations:
            for _ in range(2):
                eq = Equipment(
                    location_id=loc.id,
                    name=f"Ar Condicionado {random_string(3)}",
                    brand="Samsung",
                    model="Split",
                    serial_number=random_string(8),
                    equipment_type="ar_condicionado"
                )
                session.add(eq)
                equipments.append(eq)
        session.commit()
        
        # Create Service Orders
        for _ in range(5):
            client = random.choice(clients)
            loc = [l for l in locations if l.client_id == client.id][0]
            eq = [e for e in equipments if e.location_id == loc.id][0]
            user_id = random.choice(user_ids)
            
            so = ServiceOrder(
                user_id=user_id,
                client_id=client.id,
                location_id=loc.id,
                equipment_id=eq.id,
                title=f"Manutenção {random_string(5)}",
                status="aberto",
                priority="media",
                description="Manutenção preventiva de rotina.",
                service_type="preventiva",
                scheduled_at=datetime.utcnow() + timedelta(days=random.randint(1, 10))
            )
            session.add(so)
        session.commit()
        
        print("Database reset complete!")
        
    except Exception as e:
        session.rollback()
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        with open("error_log.txt", "w") as f:
            f.write(f"Error: {e}\n")
            traceback.print_exc(file=f)
        raise
    finally:
        session.close()

if __name__ == "__main__":
    reset_database()

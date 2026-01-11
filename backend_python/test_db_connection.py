import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_connection():
    database_url = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    
    logger.info(f"Testing connection to: {database_url.split(':')[0]}...")

    connect_args = {}
    if database_url.startswith("postgres"):
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        connect_args = {"sslmode": "require"}
    elif "sqlite" in database_url:
        connect_args = {"check_same_thread": False}

    try:
        # Create engine
        engine = create_engine(database_url, connect_args=connect_args)
        
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("✅ Connection successful! (SELECT 1 returned)")
            
            # Check for tables
            if "sqlite" in database_url:
                result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            else:
                result = connection.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            
            tables = [row[0] for row in result]
            logger.info(f"✅ Found {len(tables)} tables: {', '.join(tables)}")
            
            required_tables = ['users', 'clients', 'service_orders', 'equipments', 'locations', 'system_settings']
            missing = [t for t in required_tables if t not in tables]
            
            if missing:
                logger.warning(f"⚠️ Missing tables: {', '.join(missing)}")
                logger.info("ℹ️ Attempting to create tables...")
                from models import Base
                Base.metadata.create_all(bind=engine)
                logger.info("✅ Tables created successfully.")
            else:
                logger.info("✅ All core tables present.")

        return True

    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection()

import os
from sqlalchemy import create_engine, text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# PRODUCTION DATABASE URL (Constructed from user input)
# postgresql://postgres:[password]@db.apntpretjodygczbeozk.supabase.co:5432/postgres
DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres"

def test_production_connection():
    logger.info(f"🚀 Testing connection to PRODUCTION Database...")
    logger.info(f"URL: {DATABASE_URL.split('@')[-1]}") # Log only host

    try:
        # Create engine with SSL mode required for Supabase
        engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})
        
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("✅ Connection successful! (SELECT 1 returned)")
            
            # Check for tables
            result = connection.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [row[0] for row in result]
            logger.info(f"✅ Found {len(tables)} tables: {', '.join(tables)}")
            
            required_tables = ['users', 'clients', 'service_orders', 'equipments', 'locations', 'system_settings']
            missing = [t for t in required_tables if t not in tables]
            
            if missing:
                logger.warning(f"⚠️ Missing tables: {', '.join(missing)}")
            else:
                logger.info("✅ All core tables present in PRODUCTION.")

            # Check System Settings
            result = connection.execute(text("SELECT business_name FROM system_settings LIMIT 1"))
            row = result.fetchone()
            if row:
                logger.info(f"✅ System Settings loaded: {row[0]}")
            else:
                logger.warning("⚠️ System Settings table is empty.")

        return True

    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_production_connection()

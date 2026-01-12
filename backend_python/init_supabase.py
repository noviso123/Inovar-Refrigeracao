#!/usr/bin/env python3
"""
Script para inicializar o banco Supabase PostgreSQL.
"""
import os

# Use Supabase connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.apntpretjodygczbeozk:inovar862485@aws-1-sa-east-1.pooler.supabase.com:6543/postgres')
os.environ['DATABASE_URL'] = DATABASE_URL

print(f"Conectando ao Supabase PostgreSQL...")

from database import get_db, engine
from models import (
    Base, SystemSettings, User, Client, Location, Equipment, 
    ServiceOrder, ItemOS, WhatsAppInstance, Message, Notification,
    BotConfig, FilaEnvio, BotStatus
)
from auth import get_password_hash
from sqlalchemy import inspect, text

print("=" * 60)
print("INOVAR REFRIGERAÇÃO - Supabase Database Setup")
print("=" * 60)

# 1. Create all tables
print("\n[1/4] Creating database tables in Supabase...")
try:
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")
except Exception as e:
    print(f"⚠️ Table creation: {e}")

# 2. Check which tables exist
try:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\n[2/4] Tables in Supabase ({len(tables)}):")
    for table in tables:
        print(f"  📋 {table}")
except Exception as e:
    print(f"⚠️ Could not list tables: {e}")

# 3. Initialize default data
print("\n[3/4] Initializing default data...")
db = next(get_db())

try:
    # System Settings
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(
            id=1,
            business_name="Inovar Refrigeração",
            email_contact="contato@inovarrefrigeracao.com.br",
            phone_contact="(11) 99999-9999"
        )
        db.add(settings)
        db.commit()
        print("  ✅ System Settings created")
    else:
        print("  ⏭️ System Settings already exists")
    
    # Admin User
    admin = db.query(User).filter(User.email == "admin@inovar.com").first()
    if not admin:
        admin = User(
            email="admin@inovar.com",
            password_hash=get_password_hash("admin123"),
            full_name="Admin Inovar",
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("  ✅ Admin user created (admin@inovar.com / admin123)")
    else:
        print("  ⏭️ Admin user already exists")
    
    # Prestador User
    prestador = db.query(User).filter(User.email == "tecnico@inovar.com").first()
    if not prestador:
        prestador = User(
            email="tecnico@inovar.com",
            password_hash=get_password_hash("tecnico123"),
            full_name="Técnico Inovar",
            role="prestador",
            is_active=True
        )
        db.add(prestador)
        db.commit()
        print("  ✅ Prestador user created (tecnico@inovar.com / tecnico123)")
    else:
        print("  ⏭️ Prestador user already exists")
    
    # Bot Config
    bot_config = db.query(BotConfig).first()
    if not bot_config:
        bot_config = BotConfig(
            id="1",
            bot_nome="Inovar Bot",
            ativo=True,
            min_delay=15,
            max_delay=45,
            hora_inicio="08:00",
            hora_fim="21:00"
        )
        db.add(bot_config)
        db.commit()
        print("  ✅ Bot Config created")
    else:
        print("  ⏭️ Bot Config already exists")
    
    # Bot Status
    bot_status = db.query(BotStatus).first()
    if not bot_status:
        bot_status = BotStatus(
            id=1,
            status_conexao="desconectado"
        )
        db.add(bot_status)
        db.commit()
        print("  ✅ Bot Status created")
    else:
        print("  ⏭️ Bot Status already exists")
    
    # Test Client
    test_client = db.query(Client).filter(Client.email == "cliente@teste.com").first()
    if not test_client:
        test_client = Client(
            name="Empresa Teste LTDA",
            document="12345678901",
            email="cliente@teste.com",
            phone="11999998888",
            maintenance_period=6
        )
        db.add(test_client)
        db.commit()
        db.refresh(test_client)
        
        # Add location
        location = Location(
            client_id=test_client.id,
            nickname="Sede Principal",
            address="Rua das Empresas",
            city="São Paulo",
            state="SP",
            zip_code="01000-000",
            street_number="123",
            neighborhood="Centro"
        )
        db.add(location)
        db.commit()
        print("  ✅ Test Client created with location")
    else:
        print("  ⏭️ Test Client already exists")
    
    print("\n[4/4] Database initialization complete!")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Users: {db.query(User).count()}")
    print(f"  Clients: {db.query(Client).count()}")
    print(f"  Locations: {db.query(Location).count()}")
    print(f"  Service Orders: {db.query(ServiceOrder).count()}")
    
    print("\n✅ Supabase PostgreSQL configurado com sucesso!")
    print("\nCredenciais:")
    print("  Admin: admin@inovar.com / admin123")
    print("  Prestador: tecnico@inovar.com / tecnico123")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

#!/usr/bin/env python3
"""
Script para inicializar o banco de dados com todas as tabelas e dados iniciais.
"""
import os
os.environ['DATABASE_URL'] = os.getenv('DATABASE_URL', 'sqlite:///./dev.db')

from database import get_db, init_db, engine
from models import (
    Base, SystemSettings, User, Client, Location, Equipment, 
    ServiceOrder, ItemOS, WhatsAppInstance, Message, Notification,
    BotConfig, FilaEnvio, BotStatus, ManutencaoAgendada
)
from auth import get_password_hash
from sqlalchemy import inspect

print("=" * 60)
print("INOVAR REFRIGERAÇÃO - Database Initialization")
print("=" * 60)

# 1. Wipe and Recreate Database (Controlled by Env Var)
reset_db = os.getenv("RESET_DB", "false").lower() == "true"
if reset_db:
    print("\n⚠️  RESET_DB=true detected! Wiping database...")
    Base.metadata.drop_all(bind=engine)
    print("✅ All tables dropped successfully!")
else:
    print("\nℹ️  RESET_DB not set. Skipping wipe.")

print("\n[1/4] Creating/Verifying database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables verified/created.")

# 2. Check which tables exist
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"\n[2/4] Tables in database ({len(tables)}):")
for table in tables:
    columns = inspector.get_columns(table)
    print(f"  📋 {table} ({len(columns)} columns)")

# 3. Initialize default data
print("\n[3/4] Initializing default data...")
db = next(get_db())

try:
    # System Settings (Required for App)
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
    
    # Single Admin User (jtsatiro@hotmail.com)
    admin_user = db.query(User).filter(User.email == "jtsatiro@hotmail.com").first()
    if not admin_user:
        admin_user = User(
            email="jtsatiro@hotmail.com",
            password_hash=get_password_hash("123456"),
            full_name="Jhonatan Satiro",
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("  ✅ Admin user created (jtsatiro@hotmail.com / 123456)")
    else:
        print("  ⏭️ Admin user already exists")
    
    # Bot Config (Defaults)
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

    # Bot Status (Defaults)
    bot_status = db.query(BotStatus).first()
    if not bot_status:
        bot_status = BotStatus(
            id=1,
            status_conexao="desconectado"
        )
        db.add(bot_status)
        db.commit()
        print("  ✅ Bot Status created")
    
    print("\n[4/4] Database initialization complete!")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Users: {db.query(User).count()}")
    print(f"  Clients: {db.query(Client).count()}")
    print(f"  Locations: {db.query(Location).count()}")
    print(f"  Service Orders: {db.query(ServiceOrder).count()}")
    print(f"  Equipments: {db.query(Equipment).count()}")
    
    print("\n✅ All done! Database is ready.")
    print("\nCredentials:")
    print("  Admin: admin@inovar.com / admin123")
    print("  Prestador: tecnico@inovar.com / tecnico123")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

import psycopg2
import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

DATABASE_URL = "postgresql://postgres.apntpretjodygczbeozk:inovar862485@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

print(f"Connecting to {DATABASE_URL.split('@')[-1]}...")

try:
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cur = conn.cursor()
    
    # Check if users table exists
    cur.execute("SELECT to_regclass('public.users');")
    if not cur.fetchone()[0]:
        print("❌ Table 'users' does not exist! Running CREATE TABLE...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR UNIQUE,
                password_hash VARCHAR,
                full_name VARCHAR,
                role VARCHAR DEFAULT 'prestador',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                phone VARCHAR,
                cpf VARCHAR,
                estado_civil VARCHAR,
                profissao VARCHAR,
                avatar_url VARCHAR,
                signature_url TEXT,
                cep VARCHAR,
                logradouro VARCHAR,
                numero VARCHAR,
                complemento VARCHAR,
                bairro VARCHAR,
                cidade VARCHAR,
                estado VARCHAR,
                automacao JSON
            );
        """)
        conn.commit()
        print("✅ Table 'users' created.")
    
    # Insert Admin
    admin_email = "admin@inovar.com"
    cur.execute("SELECT id FROM users WHERE email = %s", (admin_email,))
    if not cur.fetchone():
        print("Inserting admin user...")
        cur.execute("""
            INSERT INTO users (email, password_hash, full_name, role, is_active)
            VALUES (%s, %s, %s, %s, %s)
        """, (admin_email, get_password_hash("admin123"), "Admin Inovar", "admin", True))
        conn.commit()
        print("✅ Admin user created.")
    else:
        print("✅ Admin user already exists.")
        
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")

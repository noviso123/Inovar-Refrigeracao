import os
from sqlalchemy import create_engine, text

def cleanup():
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/inovar_db"
    engine = create_engine(DATABASE_URL)
    try:
        with engine.connect() as conn:
            email = "admin2@admin.com"
            result = conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": email})
            conn.commit()
            print(f"Usuário {email} removido. Linhas afetadas: {result.rowcount}")
    except Exception as e:
        print(f"Erro ao remover usuário: {e}")

if __name__ == "__main__":
    cleanup()

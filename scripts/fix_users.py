import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Hardcoded URL
DATABASE_URL = "postgresql://postgres:inovar862485@db.apntpretjodygczbeozk.supabase.co:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)

def fix_users():
    print("Populating missing user data...")
    
    updates = {
        "jtsatiro@hotmail.com": {
            "phone": "11999999999",
            "cpf": "123.456.789-00",
            "estado_civil": "Solteiro",
            "profissao": "Administrador",
            "cep": "01001-000",
            "logradouro": "Praça da Sé",
            "numero": "100",
            "bairro": "Sé",
            "cidade": "São Paulo",
            "estado": "SP"
        },
        "gabirel@hotmail.com": {
            "phone": "11988888888",
            "cpf": "987.654.321-00",
            "estado_civil": "Casado",
            "profissao": "Técnico",
            "cep": "01001-000",
            "logradouro": "Praça da Sé",
            "numero": "200",
            "bairro": "Sé",
            "cidade": "São Paulo",
            "estado": "SP"
        }
    }
    
    with engine.connect() as conn:
        for email, data in updates.items():
            print(f"Updating {email}...")
            
            # Construct UPDATE query dynamically
            set_clauses = []
            params = {"email": email}
            for key, value in data.items():
                set_clauses.append(f"{key} = :{key}")
                params[key] = value
            
            query = text(f"UPDATE users SET {', '.join(set_clauses)} WHERE email = :email")
            
            try:
                result = conn.execute(query, params)
                conn.commit()
                print(f"  -> Updated {result.rowcount} row(s).")
            except Exception as e:
                print(f"  -> Error updating {email}: {e}")
                conn.rollback()

if __name__ == "__main__":
    fix_users()

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('.env')
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def restore():
    with engine.connect() as conn:
        print("Restoring Jhonatan Satiro name...")
        conn.execute(text("UPDATE users SET full_name = 'Jhonatan Lins de Souza Satiro' WHERE id = 1"))

        print("Restoring System Settings...")
        conn.execute(text("""
            UPDATE system_settings
            SET business_name = 'Inovar Refrigeração',
                phone_contact = '(27) 99850-3420',
                email_contact = 'jtsatiro@hotmail.com',
                logo_url = '/logo.png'
            WHERE id = 1
        """))
        conn.commit()
        print("Restoration complete.")

if __name__ == "__main__":
    restore()

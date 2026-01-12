import os
from sqlalchemy import create_url
from sqlalchemy.orm import Session
from database import engine
from models import User
from auth import get_password_hash
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def update_password(email, new_password):
    print(f"Updating password for {email}...")
    
    with Session(engine) as session:
        user = session.query(User).filter(User.email == email).first()
        if not user:
            print(f"User {email} not found!")
            return
        
        user.hashed_password = get_password_hash(new_password)
        session.commit()
        print(f"Password updated successfully for {email}!")

if __name__ == "__main__":
    update_password("jtsatiro@hotmail.com", "123456")

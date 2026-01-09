#!/usr/bin/env python3
import os
os.environ['DATABASE_URL'] = 'sqlite:///./dev.db'

from database import get_db, init_db
from models import User
from auth import get_password_hash

# Initialize database
init_db()

db = next(get_db())

try:
    # Create prestador user
    user = db.query(User).filter(User.email == 'tecnico@inovar.com').first()
    if not user:
        user = User(
            email='tecnico@inovar.com',
            password_hash=get_password_hash('tecnico123'),
            full_name='Técnico Inovar',
            role='prestador',
            is_active=True
        )
        db.add(user)
        db.commit()
        print('User tecnico@inovar.com created with password: tecnico123')
    else:
        user.password_hash = get_password_hash('tecnico123')
        db.commit()
        print('Password updated for tecnico@inovar.com to: tecnico123')
    
    # List all users
    print('\n--- All Users ---')
    for u in db.query(User).all():
        print(f'ID: {u.id} | Email: {u.email} | Role: {u.role} | Active: {u.is_active}')
        
except Exception as e:
    print(f'Error: {e}')
finally:
    db.close()

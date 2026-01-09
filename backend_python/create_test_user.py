#!/usr/bin/env python3
import os
import sys
os.environ['DATABASE_URL'] = 'sqlite:///./dev.db'

from database import get_db, init_db
from models import User
from auth import get_password_hash

# Initialize database
init_db()

db = next(get_db())

try:
    # Check existing user
    user = db.query(User).filter(User.email == 'admin@inovar.com').first()
    if not user:
        user = User(
            email='admin@inovar.com',
            password_hash=get_password_hash('admin123'),
            full_name='Admin Inovar',
            role='admin',
            is_active=True
        )
        db.add(user)
        db.commit()
        print('User admin@inovar.com created with password: admin123')
    else:
        # Update password
        user.password_hash = get_password_hash('admin123')
        db.commit()
        print('Password updated for admin@inovar.com to: admin123')
except Exception as e:
    print(f'Error: {e}')
finally:
    db.close()

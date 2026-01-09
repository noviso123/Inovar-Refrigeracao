#!/usr/bin/env python3
import os
os.environ['DATABASE_URL'] = 'sqlite:///./dev.db'

from database import get_db
from models import Client, Location

db = next(get_db())

try:
    # Create test client
    client = db.query(Client).filter(Client.email == 'cliente@teste.com').first()
    if not client:
        client = Client(
            name='Empresa Teste LTDA',
            email='cliente@teste.com',
            document='12345678901',  # CPF
            phone='11999998888',
            maintenance_period=6
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
        # Add location
        location = Location(
            client_id=client.id,
            nickname='Sede Principal',
            address='Rua das Empresas',
            city='São Paulo',
            state='SP',
            zip_code='01000-000',
            street_number='123',
            neighborhood='Centro'
        )
        db.add(location)
        db.commit()
        
        print(f'Client created: {client.name} (ID: {client.id})')
    else:
        print(f'Client already exists: {client.name} (ID: {client.id})')
    
    # List all clients
    print('\n--- All Clients ---')
    for c in db.query(Client).all():
        print(f'ID: {c.id} | Name: {c.name} | Email: {c.email}')
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()

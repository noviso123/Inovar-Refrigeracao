from database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.connect() as conn:
            # ========================================
            # SERVICE ORDERS COLUMNS
            # ========================================
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS title VARCHAR"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'media'"))
            
            # ========================================
            # USER PROFILE COLUMNS
            # ========================================
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_base64 TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address_json JSONB"))
            
            # ========================================
            # COMPANY ADDITIONAL COLUMNS (FIX f405 ERROR)
            # ========================================
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS email VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS state_registration VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'ativa'"))
            
            # FISCAL CONFIGURATION COLUMNS
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS nfse_active BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificate_path VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificate_password VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificate_name VARCHAR"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_code VARCHAR DEFAULT '14.01'"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS iss_rate VARCHAR DEFAULT '2.00'"))
            conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_environment VARCHAR DEFAULT 'homologacao'"))
            
            # ========================================
            # EXCLUSIVE PLANS COLUMN
            # ========================================
            conn.execute(text("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS target_user_id INTEGER"))
            conn.execute(text("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS limit_technicians INTEGER"))
            
            # ========================================
            # CLIENT ADDRESS & MAINTENANCE COLUMNS
            # ========================================
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS street_number VARCHAR"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS complement VARCHAR"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS maintenance_period INTEGER"))

            # ========================================
            # SERVICE ORDERS EXTENDED COLUMNS
            # ========================================
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS description TEXT"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS descricao_detalhada TEXT"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS descricao_orcamento TEXT"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS relatorio_tecnico TEXT"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS orcamento_disponivel BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS relatorio_disponivel BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS data_agendamento_inicio TIMESTAMP"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS data_inicio_real TIMESTAMP"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS data_fim_real TIMESTAMP"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS valor_total FLOAT DEFAULT 0.0"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS assinatura_cliente TEXT"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS assinatura_tecnico TEXT"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS equipment_id INTEGER REFERENCES equipments(id)"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS fotos_os JSONB"))
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS historico_json JSONB"))

            # ========================================
            # SERVICE ORDER ITEMS TABLE
            # ========================================
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS service_order_items (
                    id SERIAL PRIMARY KEY,
                    solicitacao_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
                    equipamento_id INTEGER REFERENCES equipments(id),
                    descricao_tarefa VARCHAR,
                    quantidade FLOAT DEFAULT 1.0,
                    valor_unitario FLOAT DEFAULT 0.0,
                    valor_total FLOAT DEFAULT 0.0,
                    status_item VARCHAR DEFAULT 'pendente',
                    observacao_tecnica TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # ========================================
            # SEQUENTIAL ID COLUMNS & BACKFILL
            # ========================================
            conn.execute(text("ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS sequential_id INTEGER"))
            conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS sequential_id INTEGER"))
            
            # Backfill Service Orders
            conn.execute(text("""
                WITH seq AS (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at) as rn
                    FROM service_orders
                )
                UPDATE service_orders
                SET sequential_id = seq.rn
                FROM seq
                WHERE service_orders.id = seq.id AND service_orders.sequential_id IS NULL
            """))
            
            # Backfill Clients
            conn.execute(text("""
                WITH seq AS (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY id) as rn
                    FROM clients
                )
                UPDATE clients
                SET sequential_id = seq.rn
                FROM seq
                WHERE clients.id = seq.id AND clients.sequential_id IS NULL
            """))

            # ========================================
            # FIX LEGACY URLS (remove /api prefix, full domain, and minio internal URLs)
            # Old formats:
            #   - https://inovar.share.zrok.io/api/files/logos/xxx.png
            #   - /api/files/logos/xxx.png
            #   - http://minio:9000/inovar-refrigeracao/logos/xxx.png
            # New format: /files/logos/xxx.png
            # ========================================
            
            # Fix full Zrok domain URLs in users
            conn.execute(text("""
                UPDATE users 
                SET avatar_url = REPLACE(REPLACE(avatar_url, 'https://inovar.share.zrok.io', ''), '/api/', '/')
                WHERE avatar_url LIKE '%inovar.share.zrok.io%'
            """))
            
            # Fix /api/ prefix in users
            conn.execute(text("""
                UPDATE users 
                SET avatar_url = REPLACE(avatar_url, '/api/files/', '/files/')
                WHERE avatar_url LIKE '/api/files/%'
            """))
            
            # Fix full Zrok domain URLs in companies
            conn.execute(text("""
                UPDATE companies 
                SET logo_url = REPLACE(REPLACE(logo_url, 'https://inovar.share.zrok.io', ''), '/api/', '/')
                WHERE logo_url LIKE '%inovar.share.zrok.io%'
            """))
            
            # Fix /api/ prefix in companies
            conn.execute(text("""
                UPDATE companies 
                SET logo_url = REPLACE(logo_url, '/api/files/', '/files/')
                WHERE logo_url LIKE '/api/files/%'
            """))
            
            # Fix MinIO internal URLs (http://minio:9000/bucket/...)
            conn.execute(text("""
                UPDATE users 
                SET avatar_url = '/files/' || SUBSTRING(avatar_url FROM 'minio:9000/[^/]+/(.*)$')
                WHERE avatar_url LIKE '%minio:9000%'
            """))
            
            conn.execute(text("""
                UPDATE companies 
                SET logo_url = '/files/' || SUBSTRING(logo_url FROM 'minio:9000/[^/]+/(.*)$')
                WHERE logo_url LIKE '%minio:9000%'
            """))


            conn.commit()
            print("✅ Database schema migration completed successfully!")
            print("   - Service Orders columns verified")
            print("   - User Profile columns verified")
            print("   - Company columns verified (13 new columns)")
            print("   - Legacy URLs fixed (removed /api prefix)")
            
            # ========================================
            # CREATE DEFAULT COMPANY FOR ORPHAN RECORDS
            # ========================================
            # Check if there's a company
            result = conn.execute(text("SELECT COUNT(*) FROM companies")).fetchone()
            company_count = result[0] if result else 0
            
            if company_count == 0:
                print("   ⚠️ No companies found. Creating default company...")
                conn.execute(text("""
                    INSERT INTO companies (name, cnpj, email, phone) 
                    VALUES ('Empresa Principal', '00.000.000/0001-00', 'contato@empresa.com', '(00) 00000-0000')
                """))
                conn.commit()
                print("   ✅ Default company created")
            
            # Get the first company ID
            result = conn.execute(text("SELECT id FROM companies ORDER BY id LIMIT 1")).fetchone()
            default_company_id = result[0] if result else None
            
            if default_company_id:
                # Associate orphan users with default company
                conn.execute(text(f"""
                    UPDATE users SET company_id = {default_company_id} 
                    WHERE company_id IS NULL
                """))
                
                # Associate orphan clients with default company
                conn.execute(text(f"""
                    UPDATE clients SET company_id = {default_company_id} 
                    WHERE company_id IS NULL
                """))
                
                # Associate orphan service_orders with default company
                conn.execute(text(f"""
                    UPDATE service_orders SET company_id = {default_company_id} 
                    WHERE company_id IS NULL
                """))
                
                conn.commit()
                print(f"   ✅ Orphan records associated with company ID {default_company_id}")
            
            # ========================================
            # RECALCULATE SEQUENTIAL IDs (FORCE UPDATE ALL)
            # ========================================
            # Force recalculate - set all to NULL first, then recalculate
            conn.execute(text("UPDATE service_orders SET sequential_id = NULL"))
            conn.execute(text("UPDATE clients SET sequential_id = NULL"))
            
            # Recalculate Service Orders Sequential IDs by company
            conn.execute(text("""
                WITH seq AS (
                    SELECT id, 
                           ROW_NUMBER() OVER (PARTITION BY COALESCE(company_id, 0) ORDER BY created_at, id) as rn
                    FROM service_orders
                )
                UPDATE service_orders
                SET sequential_id = seq.rn
                FROM seq
                WHERE service_orders.id = seq.id
            """))
            
            # Recalculate Client Sequential IDs by company
            conn.execute(text("""
                WITH seq AS (
                    SELECT id, 
                           ROW_NUMBER() OVER (PARTITION BY COALESCE(company_id, 0) ORDER BY id) as rn
                    FROM clients
                )
                UPDATE clients
                SET sequential_id = seq.rn
                FROM seq
                WHERE clients.id = seq.id
            """))
            
            conn.commit()
            print("   ✅ Sequential IDs recalculated")
            
            # ========================================
            # ADD company_id TO EQUIPMENTS TABLE
            # ========================================
            conn.execute(text("ALTER TABLE equipments ADD COLUMN IF NOT EXISTS company_id INTEGER"))
            conn.commit()
            print("   ✅ Equipment company_id column added")
    except Exception as e:
        print(f"❌ Error updating schema: {e}")

if __name__ == "__main__":
    migrate()

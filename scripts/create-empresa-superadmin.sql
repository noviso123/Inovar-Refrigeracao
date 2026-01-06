-- =====================================================
-- CRIAR EMPRESA + SUPER ADMIN
-- Backend Python/SQLAlchemy
-- =====================================================

-- 1. Criar empresa demo
INSERT INTO companies (name, cnpj, email_contact, phone_contact, address)
VALUES (
    'Inovar Refrigeração Demo',
    '00.000.000/0001-00',
    'contato@inovar.com',
    '11999999999',
    'São Paulo, SP'
)
ON CONFLICT (cnpj) DO UPDATE SET name = EXCLUDED.name
RETURNING id;

-- 2. Criar ou atualizar super admin
INSERT INTO users (email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'admin@inovar.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RiVi.8.Xy', -- Admin@123
    'Super Administrador',
    'super_admin',
    true,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    is_active = true;

-- 3. Associar admin à empresa (opcional)
UPDATE users 
SET company_id = (SELECT id FROM companies WHERE cnpj = '00.000.000/0001-00')
WHERE email = 'admin@inovar.com';

-- 4. Verificar
SELECT u.email, u.role, c.name as empresa
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'admin@inovar.com';

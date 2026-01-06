-- =====================================================
-- SCRIPT COMPLETO PARA CORRIGIR/CRIAR SUPER ADMIN
-- Backend Python/SQLAlchemy
-- =====================================================

-- 1. Verificar se usuário existe
DO $$
DECLARE
    admin_exists BOOLEAN;
    admin_user_id INTEGER;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@inovar.com') INTO admin_exists;
    
    IF admin_exists THEN
        -- Atualizar usuário existente
        UPDATE users 
        SET role = 'super_admin',
            is_active = true,
            full_name = COALESCE(full_name, 'Super Administrador')
        WHERE email = 'admin@inovar.com';
        
        RAISE NOTICE '✅ Usuário admin@inovar.com atualizado para super_admin';
    ELSE
        -- Criar novo usuário
        INSERT INTO users (email, password_hash, full_name, role, is_active, created_at)
        VALUES (
            'admin@inovar.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RiVi.8.Xy', -- Admin@123
            'Super Administrador',
            'super_admin',
            true,
            NOW()
        );
        
        RAISE NOTICE '✅ Novo usuário super_admin criado: admin@inovar.com';
    END IF;
    
    -- Obter ID do admin
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@inovar.com';
    RAISE NOTICE '   User ID: %', admin_user_id;
END $$;

-- 2. Verificar resultado
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    company_id,
    created_at
FROM users 
WHERE email = 'admin@inovar.com';

-- 3. Listar todos super_admins
SELECT id, email, full_name, role 
FROM users 
WHERE role = 'super_admin';

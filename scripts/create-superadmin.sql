-- Script para criar Super Admin no banco de dados Python/SQLAlchemy
-- Execute com: psql -h localhost -U inovar_admin -d inovar_db -f create-superadmin.sql

-- Inserir usuário Super Admin
INSERT INTO users (email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'admin@inovar.com',
    -- Senha: Admin@123 (bcrypt hash)
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RiVi.8.Xy',
    'Super Administrador',
    'super_admin',
    true,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    is_active = true;

-- Verificar
SELECT id, email, full_name, role, is_active FROM users WHERE email = 'admin@inovar.com';

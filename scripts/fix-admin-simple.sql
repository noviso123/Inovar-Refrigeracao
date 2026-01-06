-- Script simples para corrigir admin
-- Para banco Python/SQLAlchemy

UPDATE users 
SET role = 'super_admin',
    is_active = true
WHERE email = 'admin@inovar.com';

-- Verificar
SELECT id, email, full_name, role, is_active FROM users WHERE role = 'super_admin';

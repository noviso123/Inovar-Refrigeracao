-- Script para verificar Super Admin no banco Python
SELECT id, email, full_name, role, is_active FROM users WHERE email = 'admin@inovar.com';

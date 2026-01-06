-- Drop unused tables
DROP TABLE IF EXISTS nfse CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Update Users roles
UPDATE users SET role = 'admin' WHERE role = 'super_admin';
UPDATE users SET company_id = 1 WHERE company_id IS NULL;

-- Ensure Company 1 exists
INSERT INTO companies (id, name, cnpj, email_contact, status)
SELECT 1, 'Inovar Refrigeração', '00.000.000/0001-00', 'admin@inovar.com', 'ativa'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = 1);

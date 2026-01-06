-- Drop company_id columns
ALTER TABLE users DROP COLUMN IF EXISTS company_id;
ALTER TABLE clients DROP COLUMN IF EXISTS company_id;
ALTER TABLE service_orders DROP COLUMN IF EXISTS company_id;
ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS company_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS company_id;

-- Rename companies table and adjust columns
ALTER TABLE companies RENAME TO system_settings;

-- Rename columns to match new model
ALTER TABLE system_settings RENAME COLUMN name TO business_name;

-- Ensure we have the single record
INSERT INTO system_settings (id, business_name, cnpj, email_contact, status)
SELECT 1, 'Inovar Refrigeração', '00.000.000/0001-00', 'admin@inovar.com', 'ativa'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS assinatura_tecnico TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS nfse_json JSONB;

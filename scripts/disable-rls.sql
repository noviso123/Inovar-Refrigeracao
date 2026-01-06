-- ============================================
-- DESABILITAR RLS EM TODAS AS TABELAS
-- Para garantir que SuperAdmin veja todos os dados
-- ============================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public."' || r.tablename || '" DISABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'RLS desabilitado para: %', r.tablename;
    END LOOP;
END $$;

-- Verificar resultado
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

SELECT 'RLS desabilitado em todas as tabelas!' as resultado;

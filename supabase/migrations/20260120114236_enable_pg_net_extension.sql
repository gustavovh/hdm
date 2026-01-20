/*
  # Habilitar extensión pg_net para hacer llamadas HTTP
  
  1. Propósito:
     - Habilitar la extensión pg_net que permite hacer llamadas HTTP desde PostgreSQL
     - Necesaria para que el cron job pueda invocar la edge function
  
  2. Uso:
     - Utilizada por el job de reporte diario
     - Permite llamar a las edge functions desde scheduled jobs
*/

-- Habilitar la extensión pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verificar que la extensión está habilitada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    RAISE NOTICE '✅ Extensión pg_net habilitada correctamente';
    RAISE NOTICE '🌐 El sistema ahora puede hacer llamadas HTTP desde jobs programados';
  ELSE
    RAISE EXCEPTION 'Error: No se pudo habilitar pg_net';
  END IF;
END $$;

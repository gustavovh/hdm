/*
  # Configurar job con URL directa
  
  1. Problema:
     - No se pueden configurar variables de entorno a nivel de base de datos
  
  2. Solución:
     - Usar URL directa en el job
     - El service_role_key está disponible en el contexto de Edge Functions
  
  3. Nota:
     - Este job se ejecuta a las 8:00 AM todos los días
     - Invoca la edge function directamente
*/

-- Eliminar job anterior
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'reporte-diario-presupuestos'
  ) THEN
    PERFORM cron.unschedule('reporte-diario-presupuestos');
  END IF;
END $$;

-- Crear el job con URL directa
-- Nota: La edge function tiene acceso automático a SUPABASE_SERVICE_ROLE_KEY
SELECT cron.schedule(
  'reporte-diario-presupuestos',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/reporte-diario-presupuestos',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Verificar que el job fue creado
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'reporte-diario-presupuestos' AND active = true;
  
  IF job_count > 0 THEN
    RAISE NOTICE '✅ Job de reporte diario configurado correctamente';
    RAISE NOTICE '📅 Programado para: Todos los días a las 8:00 AM';
    RAISE NOTICE '📧 Enviará reportes CSV por email a todos los administradores';
    RAISE NOTICE '🔒 RESPALDO CRÍTICO: Este job mantiene registro permanente de numeración';
  ELSE
    RAISE EXCEPTION 'Error: Job no fue creado correctamente';
  END IF;
END $$;

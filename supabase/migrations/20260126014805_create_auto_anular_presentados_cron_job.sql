/*
  # Configurar cron job para auto-anular presupuestos presentados con más de 30 días

  1. Descripción:
     - Ejecuta la edge function auto-anular-presentados diariamente
     - Los presupuestos en estado PRESENTADO con más de 30 días desde su creación pasan a ANULADO
     - Se ejecuta a las 2:00 AM todos los días (hora del servidor)
  
  2. Regla de negocio:
     - Un presupuesto PRESENTADO sin respuesta por más de 30 días debe ser ANULADO automáticamente
     - Se usa created_at para calcular los 30 días (no fecha_presentacion)
     - Se notifica al vendedor y a los administrativos
  
  3. Extensiones necesarias:
     - pg_cron: Para programar tareas
     - pg_net: Para hacer peticiones HTTP a edge functions
*/

-- Asegurar que pg_cron está habilitado
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar job anterior si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'auto-anular-presentados-30-dias'
  ) THEN
    PERFORM cron.unschedule('auto-anular-presentados-30-dias');
  END IF;
END $$;

-- Crear el job para ejecutar a las 2:00 AM todos los días
SELECT cron.schedule(
  'auto-anular-presentados-30-dias',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/auto-anular-presentados',
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
  WHERE jobname = 'auto-anular-presentados-30-dias' AND active = true;
  
  IF job_count > 0 THEN
    RAISE NOTICE '✅ Job de auto-anulación configurado correctamente';
    RAISE NOTICE '📅 Programado para: Todos los días a las 2:00 AM';
    RAISE NOTICE '⚠️  Regla: Presupuestos PRESENTADOS con más de 30 días desde creación → ANULADO';
    RAISE NOTICE '📧 Notifica a vendedores y administrativos';
  ELSE
    RAISE EXCEPTION 'Error: Job no fue creado correctamente';
  END IF;
END $$;

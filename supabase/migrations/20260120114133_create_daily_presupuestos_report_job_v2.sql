/*
  # Configurar reporte diario automático de presupuestos
  
  1. Propósito:
     - Crear un job que se ejecute TODOS LOS DÍAS a las 8:00 AM (hora del servidor)
     - Envía un reporte completo con todos los presupuestos creados el día anterior
     - Incluye archivo CSV adjunto como respaldo permanente de la numeración
  
  2. Detalles del Job:
     - Frecuencia: Diario a las 8:00 AM
     - Función: reporte-diario-presupuestos
     - Destinatarios: Todos los administradores activos
  
  3. Contenido del Reporte:
     - Lista completa de presupuestos creados ayer
     - Código, fecha, cliente, vendedor, estado, totales
     - Archivo CSV adjunto con todos los detalles
     - Totales generales del día
  
  4. Importancia Crítica:
     - Este reporte es un RESPALDO PERMANENTE de la numeración
     - NUNCA se debe desactivar este job
     - Permite recuperar la numeración en caso de problemas
*/

-- Habilitar la extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar job anterior si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'reporte-diario-presupuestos'
  ) THEN
    PERFORM cron.unschedule('reporte-diario-presupuestos');
  END IF;
END $$;

-- Crear el job que se ejecuta todos los días a las 8:00 AM
SELECT cron.schedule(
  'reporte-diario-presupuestos',
  '0 8 * * *',
  $$
    SELECT
      net.http_post(
        url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/reporte-diario-presupuestos'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      ) as request_id;
  $$
);

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Job de reporte diario creado exitosamente';
  RAISE NOTICE '📅 Se ejecutará todos los días a las 8:00 AM';
  RAISE NOTICE '📧 Enviará reportes a todos los administradores';
  RAISE NOTICE '⚠️  IMPORTANTE: Este job es CRÍTICO para mantener respaldo de numeración';
END $$;

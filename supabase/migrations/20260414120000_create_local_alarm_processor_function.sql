/*
  # Procesador local de alarmas sin cron

  1. Objetivo
    - Permitir que el frontend procese alarmas vencidas varias veces al dia
    - Evitar dependencia de cron en Vercel Hobby

  2. Seguridad
    - La funcion procesa solo alarmas del usuario autenticado
    - Se expone a rol authenticated

  3. Duplicados
    - Se agrega indice unico parcial para evitar notificaciones duplicadas
      por seguimiento cuando entidad = 'presupuesto_seguimiento'
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_notificaciones_unica_alarma_seguimiento
ON notificaciones (usuario_id, entidad, entidad_id)
WHERE entidad = 'presupuesto_seguimiento';

CREATE OR REPLACE FUNCTION public.procesar_alarmas_locales()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_insertadas integer := 0;
  v_actualizadas integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('procesadas', 0, 'notificaciones', 0);
  END IF;

  WITH alarmas_vencidas AS (
    SELECT
      ps.id,
      ps.user_id,
      ps.presupuesto_id,
      ps.proxima_accion,
      p.codigo,
      p.cliente_nombre
    FROM presupuesto_seguimiento ps
    INNER JOIN presupuestos p ON p.id = ps.presupuesto_id
    WHERE ps.user_id = v_user_id
      AND ps.fecha_proxima_accion IS NOT NULL
      AND ps.fecha_proxima_accion <= NOW()
      AND COALESCE(ps.alarma_notificada, false) = false
  ),
  insertadas AS (
    INSERT INTO notificaciones (
      usuario_id,
      tipo,
      titulo,
      mensaje,
      entidad,
      entidad_id,
      leida
    )
    SELECT
      av.user_id,
      'warning',
      'Alarma: ' || COALESCE(NULLIF(av.proxima_accion, ''), 'Seguimiento pendiente'),
      'Presupuesto ' || COALESCE(av.codigo, 'N/A') || ' - ' || COALESCE(av.cliente_nombre, 'Cliente') || ': ' || COALESCE(NULLIF(av.proxima_accion, ''), 'Accion de seguimiento programada'),
      'presupuesto_seguimiento',
      av.id,
      false
    FROM alarmas_vencidas av
    ON CONFLICT DO NOTHING
    RETURNING entidad_id
  ),
  actualizadas AS (
    UPDATE presupuesto_seguimiento ps
    SET
      alarma_notificada = true,
      alarma_notificada_at = NOW()
    WHERE ps.id IN (SELECT id FROM alarmas_vencidas)
      AND COALESCE(ps.alarma_notificada, false) = false
    RETURNING ps.id
  )
  SELECT
    (SELECT COUNT(*) FROM insertadas),
    (SELECT COUNT(*) FROM actualizadas)
  INTO v_insertadas, v_actualizadas;

  RETURN jsonb_build_object(
    'procesadas', v_actualizadas,
    'notificaciones', v_insertadas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.procesar_alarmas_locales() TO authenticated;

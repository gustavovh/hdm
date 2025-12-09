/*
  # Agregar Hora a las Alarmas de Seguimiento

  ## Cambios
  
  1. Modificaciones a Tabla
    - Cambiar `fecha_proxima_accion` de tipo `date` a `timestamptz` en tabla `presupuesto_seguimiento`
    - Esto permite programar alarmas/notificaciones con fecha Y hora específicas
    - Los usuarios pueden ahora recibir notificaciones el mismo día a una hora determinada
  
  2. Notas Importantes
    - Los datos existentes se mantienen y se convierten automáticamente
    - Las fechas existentes (sin hora) se establecerán a medianoche (00:00:00)
    - El índice existente sigue funcionando correctamente
*/

-- Cambiar el tipo de columna de date a timestamptz
ALTER TABLE presupuesto_seguimiento 
ALTER COLUMN fecha_proxima_accion TYPE timestamptz 
USING fecha_proxima_accion::timestamptz;

-- Recrear el índice para optimizar búsquedas por fecha/hora
DROP INDEX IF EXISTS idx_seguimiento_fecha_proxima;
CREATE INDEX idx_seguimiento_fecha_proxima 
ON presupuesto_seguimiento(fecha_proxima_accion) 
WHERE fecha_proxima_accion IS NOT NULL;

/*
  # Agregar Flag de Notificación a Alarmas de Seguimiento

  ## Descripción
  Agrega campos de seguimiento de notificaciones al sistema de alarmas para presupuestos.
  Esto permite que el sistema detecte y notifique automáticamente cuando una alarma 
  programada llega a su fecha/hora de ejecución.

  ## Cambios

  1. Nueva Columna en presupuesto_seguimiento
    - `alarma_notificada` (boolean): Indica si la alarma ya fue notificada
    - Por defecto es `false` para alarmas nuevas
    - Se marca como `true` cuando el sistema envía la notificación

  2. Nueva Columna en presupuesto_seguimiento  
    - `alarma_notificada_at` (timestamptz): Timestamp de cuando se envió la notificación
    - Se completa automáticamente cuando alarma_notificada cambia a true

  3. Índice para Optimización
    - Índice en alarmas pendientes de notificar
    - Mejora el performance de la consulta diaria que busca alarmas vencidas

  ## Propósito
  Este cambio habilita el sistema automático de notificaciones de alarmas que:
  - Ejecuta diariamente vía edge function
  - Busca alarmas con fecha_proxima_accion <= ahora
  - Envía notificaciones a los usuarios responsables
  - Marca las alarmas como notificadas para no duplicar
*/

-- Agregar columna para tracking de notificaciones de alarmas
ALTER TABLE presupuesto_seguimiento 
ADD COLUMN IF NOT EXISTS alarma_notificada boolean DEFAULT false;

-- Agregar timestamp de cuando se notificó
ALTER TABLE presupuesto_seguimiento 
ADD COLUMN IF NOT EXISTS alarma_notificada_at timestamptz;

-- Crear índice para búsqueda eficiente de alarmas pendientes
CREATE INDEX IF NOT EXISTS idx_seguimiento_alarmas_pendientes 
ON presupuesto_seguimiento(fecha_proxima_accion, alarma_notificada) 
WHERE fecha_proxima_accion IS NOT NULL AND alarma_notificada = false;

-- Comentarios para documentación
COMMENT ON COLUMN presupuesto_seguimiento.alarma_notificada IS 
'Indica si la alarma de esta acción de seguimiento ya fue notificada al usuario';

COMMENT ON COLUMN presupuesto_seguimiento.alarma_notificada_at IS 
'Timestamp de cuando se envió la notificación de alarma al usuario';

/*
  # Soporte para Múltiples Descuentos por Presupuesto

  ## Cambios

  1. Campos Nuevos
    - `numero_descuento` - Indica el orden del descuento (1 = primer descuento, 2 = segundo, etc.)

  2. Funciones
    - `get_next_descuento_number` - Calcula automáticamente el siguiente número de descuento
    - `set_descuento_number` - Trigger para asignar el número automáticamente

  3. Índices
    - Índice compuesto para búsqueda eficiente de descuentos por presupuesto

  ## Notas
  - Permite solicitar y aprobar múltiples descuentos por presupuesto
  - El número de descuento se asigna automáticamente al crear la solicitud
  - Los descuentos existentes se marcarán como número 1
*/

-- Agregar campo numero_descuento a la tabla solicitudes_descuento
ALTER TABLE solicitudes_descuento
ADD COLUMN IF NOT EXISTS numero_descuento integer NOT NULL DEFAULT 1;

-- Crear índice compuesto para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_solicitudes_presupuesto_numero
ON solicitudes_descuento(presupuesto_id, numero_descuento);

-- Función para obtener el siguiente número de descuento para un presupuesto
CREATE OR REPLACE FUNCTION get_next_descuento_number(p_presupuesto_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_numero integer;
BEGIN
  SELECT COALESCE(MAX(numero_descuento), 0) + 1
  INTO v_max_numero
  FROM solicitudes_descuento
  WHERE presupuesto_id = p_presupuesto_id
    AND deleted_at IS NULL;

  RETURN v_max_numero;
END;
$$;

-- Trigger para asignar automáticamente el número de descuento
CREATE OR REPLACE FUNCTION set_descuento_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo asignar número si no se proporcionó explícitamente
  IF NEW.numero_descuento = 1 AND EXISTS (
    SELECT 1
    FROM solicitudes_descuento
    WHERE presupuesto_id = NEW.presupuesto_id
      AND deleted_at IS NULL
  ) THEN
    NEW.numero_descuento := get_next_descuento_number(NEW.presupuesto_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger para la tabla solicitudes_descuento
DROP TRIGGER IF EXISTS trigger_set_descuento_number ON solicitudes_descuento;
CREATE TRIGGER trigger_set_descuento_number
  BEFORE INSERT ON solicitudes_descuento
  FOR EACH ROW
  EXECUTE FUNCTION set_descuento_number();

-- Actualizar descuentos existentes para que todos tengan un número asignado
-- Los descuentos existentes se numerarán según su fecha de creación
WITH numbered_descuentos AS (
  SELECT
    id,
    presupuesto_id,
    ROW_NUMBER() OVER (PARTITION BY presupuesto_id ORDER BY created_at) as new_numero
  FROM solicitudes_descuento
  WHERE deleted_at IS NULL
)
UPDATE solicitudes_descuento sd
SET numero_descuento = nd.new_numero
FROM numbered_descuentos nd
WHERE sd.id = nd.id;
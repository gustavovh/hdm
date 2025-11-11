/*
  # Agregar Nuevos Estados al ENUM budget_status

  1. Nuevos Estados
    - ABIERTO: Estado inicial de presupuesto (reemplaza BORRADOR)
    - EN_EJECUCION: Estado de ejecución (reemplaza ACEPTADO)
    - RECHAZADO: Estado cuando se rechaza un presupuesto
    - CANCELADO: Estado cuando se cancela un presupuesto

  2. Notas
    - Los valores de enum deben agregarse primero y comitearse antes de usarlos
    - Esta migración solo agrega los nuevos valores al enum
*/

-- Agregar nuevos estados al enum budget_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ABIERTO' AND enumtypid = 'budget_status'::regtype) THEN
    ALTER TYPE budget_status ADD VALUE 'ABIERTO';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EN_EJECUCION' AND enumtypid = 'budget_status'::regtype) THEN
    ALTER TYPE budget_status ADD VALUE 'EN_EJECUCION';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RECHAZADO' AND enumtypid = 'budget_status'::regtype) THEN
    ALTER TYPE budget_status ADD VALUE 'RECHAZADO';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCELADO' AND enumtypid = 'budget_status'::regtype) THEN
    ALTER TYPE budget_status ADD VALUE 'CANCELADO';
  END IF;
END $$;

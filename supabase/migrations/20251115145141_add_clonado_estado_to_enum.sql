/*
  # Agregar estado CLONADO al enum budget_status

  ## Cambios aplicados:
  
  1. **Agregar nuevo valor CLONADO al enum**
    - Agregar 'CLONADO' al tipo budget_status
    
  ## Nota:
    - Esta migración solo agrega el valor al enum
    - La siguiente migración actualizará los datos existentes
*/

-- Agregar el nuevo valor CLONADO al enum
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'CLONADO';

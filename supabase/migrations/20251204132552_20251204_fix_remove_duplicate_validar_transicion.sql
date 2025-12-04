/*
  # Eliminar función duplicada de validación
  
  1. Problema
    - Existen DOS funciones validar_transicion_estado con diferentes tipos de parámetros
    - PostgreSQL no puede decidir cuál usar (error PGRST203)
    - Esto causa que la validación falle en el frontend
  
  2. Solución
    - Eliminar la función vieja que usa el tipo enum budget_status
    - Mantener solo la función que usa text (más flexible)
*/

-- Eliminar la función vieja que usa el tipo enum
DROP FUNCTION IF EXISTS validar_transicion_estado(budget_status, budget_status);

-- Verificar que solo quede la función de text
-- La función validar_transicion_estado(text, text) ya existe y es la correcta

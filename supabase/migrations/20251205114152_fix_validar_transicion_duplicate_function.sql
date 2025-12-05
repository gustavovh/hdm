/*
  # Eliminar Función Duplicada validar_transicion_estado
  
  ## Descripción
  Elimina la función `validar_transicion_estado` que usa el tipo `budget_status`
  y deja solo la versión que usa `text`, para resolver el error de ambigüedad:
  "Could not choose the best candidate function"
  
  ## Cambios
  - Elimina la función con parámetros de tipo `budget_status`
  - Mantiene la función con parámetros de tipo `text`
  
  ## Justificación
  Supabase no puede decidir qué función usar cuando hay dos con el mismo nombre
  pero diferentes tipos de parámetros. La versión con `text` es más flexible
  y funciona correctamente con el frontend.
*/

-- Eliminar la función con tipo budget_status
DROP FUNCTION IF EXISTS validar_transicion_estado(p_estado_origen budget_status, p_estado_destino budget_status);

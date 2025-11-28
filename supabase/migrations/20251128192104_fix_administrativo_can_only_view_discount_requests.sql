/*
  # Permitir que Administrativos Vean Solicitudes de Descuento (Solo Lectura)

  1. Cambios
    - Agregar política SELECT para que rol 'administrativo' pueda ver todas las solicitudes de descuento
    - Los administrativos NO pueden aprobar, rechazar o modificar solicitudes
    - Solo los admins pueden UPDATE/aprobar solicitudes

  2. Seguridad
    - Administrativo: Solo SELECT (lectura)
    - Admin: SELECT, UPDATE (lectura y aprobación)
    - Vendedor: SELECT propias, INSERT propias, UPDATE propias solo si PENDIENTE
*/

-- Agregar política para que administrativos puedan ver todas las solicitudes
-- (pero NO modificarlas)
CREATE POLICY "Administrativos view all requests"
  ON solicitudes_descuento
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'administrativo'
    )
  );

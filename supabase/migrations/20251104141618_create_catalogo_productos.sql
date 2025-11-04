/*
  # Crear sistema de catálogo de productos

  1. Nuevas Tablas
    - `categorias`
      - `id` (uuid, primary key)
      - `nombre` (text) - Nombre de la categoría
      - `descripcion` (text) - Descripción opcional
      - `activa` (boolean) - Si está activa
      - `orden` (integer) - Orden de visualización
      - `created_at`, `updated_at`

    - `productos`
      - `id` (uuid, primary key)
      - `codigo` (text, unique) - Código interno del producto
      - `nombre` (text) - Nombre del producto
      - `descripcion` (text) - Descripción detallada
      - `categoria_id` (uuid, foreign key) - Relación con categorías
      - `precio_base` (decimal) - Precio base en guaraníes
      - `precio_usd` (decimal) - Precio en dólares (opcional)
      - `unidad_medida` (text) - unidad, kg, litro, m², etc.
      - `stock_disponible` (integer) - Stock actual (opcional)
      - `stock_minimo` (integer) - Stock mínimo (opcional)
      - `activo` (boolean) - Si está disponible para venta
      - `imagen_url` (text) - URL de la imagen
      - `notas` (text) - Notas internas
      - `created_at`, `updated_at`, `deleted_at`

  2. Security
    - Enable RLS en ambas tablas
    - Todos pueden leer productos/categorías activos
    - Solo admins pueden crear/modificar/eliminar

  3. Índices
    - Búsqueda por código, nombre
    - Filtro por categoría
    - Ordenamiento por nombre
*/

CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  activa boolean DEFAULT true,
  orden integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  precio_base decimal(15,2) NOT NULL DEFAULT 0,
  precio_usd decimal(15,2),
  unidad_medida text DEFAULT 'unidad',
  stock_disponible integer,
  stock_minimo integer,
  activo boolean DEFAULT true,
  imagen_url text,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_activa ON categorias(activa);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer categorías activas"
  ON categorias
  FOR SELECT
  TO authenticated
  USING (activa = true);

CREATE POLICY "Solo admins pueden crear categorías"
  ON categorias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar categorías"
  ON categorias
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar categorías"
  ON categorias
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Todos pueden leer productos activos"
  ON productos
  FOR SELECT
  TO authenticated
  USING (activo = true AND deleted_at IS NULL);

CREATE POLICY "Solo admins pueden crear productos"
  ON productos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar productos"
  ON productos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar productos"
  ON productos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

INSERT INTO categorias (nombre, descripcion, orden) VALUES
  ('General', 'Productos sin categoría específica', 0),
  ('Servicios', 'Servicios profesionales', 1),
  ('Hardware', 'Equipamiento y hardware', 2),
  ('Software', 'Licencias y software', 3),
  ('Suministros', 'Materiales y suministros', 4)
ON CONFLICT DO NOTHING;

# PROBLEMA CRÍTICO: RENUMERACIÓN DE PRESUPUESTOS

## Fecha: 2026-01-19

## Problema Identificado

Las migraciones de renumeración aplicadas anteriormente causaron un problema CRÍTICO:

### Migraciones Problemáticas:
1. `20251119135301_renumber_all_presupuestos_from_2000.sql` - Renumeró todos los presupuestos desde 2000
2. `20251128150727_renumber_presupuestos_from_4000.sql` - Renumeró todos los presupuestos desde 4000
3. `20260119215214_revert_to_2000_numbering.sql` - Revirtió a numeración 2000
4. `20260119221531_revert_back_to_4000_numbering.sql` - Volvió a numeración 4000

### Consecuencias:

Estas migraciones renumeraron presupuestos que:
- Ya tenían PDFs generados
- Ya fueron entregados a clientes
- Ya están en uso en procesos comerciales

**Ejemplos reportados:**
- Presupuesto que debería ser 4228 ahora aparece como 4167 al descargarlo
- Presupuestos 4259 y 3087 no existen en el sistema
- Los PDFs no coinciden con los códigos en la base de datos

## Solución Implementada

### 1. Desactivación Permanente del Trigger

```sql
ALTER TABLE presupuestos DISABLE TRIGGER trigger_set_presupuesto_codigo;
```

El trigger `trigger_set_presupuesto_codigo` ha sido **DESACTIVADO PERMANENTEMENTE**.

### 2. Estado Actual

- Códigos actuales: **4000 a 4253** (253 presupuestos activos)
- Secuencia configurada en: **4254**
- Próximo presupuesto será: **001-001-00004254**

### 3. Política de Códigos (OBLIGATORIA)

**LOS CÓDIGOS DE PRESUPUESTO SON INMUTABLES**

Una vez que un presupuesto recibe un código y se genera su PDF:
- El código NO PUEDE cambiar
- NO se puede renumerar
- NO se puede aplicar migraciones de renumeración

## Cómo Crear Nuevos Presupuestos

Los nuevos presupuestos deben crearse con código manual usando la secuencia:

```sql
-- Al crear un presupuesto nuevo:
codigo = '001-001-' || LPAD(nextval('presupuesto_codigo_seq')::TEXT, 8, '0')
```

## ADVERTENCIAS CRÍTICAS

⚠️ **NUNCA:**
- Aplicar migraciones de renumeración
- Modificar códigos de presupuestos existentes
- Reactivar el trigger automático sin antes verificar que no afecte presupuestos existentes
- Resetear la secuencia a un valor menor al máximo actual

⚠️ **SIEMPRE:**
- Mantener los códigos existentes sin cambios
- Verificar que nuevos presupuestos usen la secuencia correcta
- Documentar cualquier cambio en el sistema de numeración

## Recuperación (NO POSIBLE)

**No es posible recuperar los códigos originales** porque las migraciones no guardaron un backup y renumeraron basándose en `created_at`, perdiendo la información original.

Los clientes que tengan PDFs con códigos diferentes al sistema deberán:
1. Mantener sus PDFs originales como referencia
2. Usar el código actual del sistema para futuras operaciones

## Migraciones Eliminadas

Se eliminaron las siguientes migraciones problemáticas del filesystem:
- `20260119215214_revert_to_2000_numbering.sql`
- `20260119221531_revert_back_to_4000_numbering.sql`

**Nota:** Estas migraciones ya fueron aplicadas en Supabase y no pueden revertirse.

## Verificación

Para verificar el estado actual:

```sql
-- Ver rango de códigos
SELECT
  MIN(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)) as min_codigo,
  MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)) as max_codigo,
  COUNT(*) as total
FROM presupuestos
WHERE deleted_at IS NULL
  AND codigo ~ '^001-001-[0-9]{8}$';

-- Ver estado de la secuencia
SELECT last_value, is_called FROM presupuesto_codigo_seq;

-- Ver estado del trigger
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_set_presupuesto_codigo';
```

## Lecciones Aprendidas

1. Los códigos de documentos comerciales son INMUTABLES
2. Nunca aplicar renumeración masiva en producción
3. Siempre hacer backup antes de cambios estructurales
4. Mantener tabla de auditoría para tracking de cambios

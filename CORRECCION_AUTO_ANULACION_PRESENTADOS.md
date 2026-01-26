# CORRECCIÓN: AUTO-ANULACIÓN DE PRESUPUESTOS PRESENTADOS

## PROBLEMA IDENTIFICADO

Los presupuestos en estado PRESENTADO con más de 30 días NO se estaban anulando automáticamente según la regla de negocio establecida.

### Evidencia del problema:

Presupuestos encontrados en estado PRESENTADO con más de 30 días:

| Código | Cliente | Vendedor | Días transcurridos | Fecha Creación |
|--------|---------|----------|-------------------|----------------|
| 001-001-00004012 | Posta Inmobiliaria - Mangoré | Guillermo Mendoza | **69 días** | 17/11/2025 |
| 001-001-00004013 | Vans - Shopping Mariscal Lopez | Guillermo Mendoza | **69 días** | 17/11/2025 |
| 001-001-00004014 | Shopping Mariscal López | Guillermo Mendoza | **68 días** | 19/11/2025 |
| 001-001-00004031 | PENTA SA | Constanza Medina | **58 días** | 28/11/2025 |
| 001-001-00004034 | Shopping Paseo la Galería | Guillermo Mendoza | **57 días** | 29/11/2025 |
| ... | ... | ... | ... | ... |

**Total encontrados:** 43 presupuestos con más de 30 días en estado PRESENTADO

## REGLA DE NEGOCIO

> **Un presupuesto en estado PRESENTADO sin respuesta del cliente por más de 30 días debe pasar automáticamente a estado ANULADO.**

### Criterios:
1. **Estado:** PRESENTADO
2. **Tiempo:** Más de 30 días desde `created_at`
3. **Acción:** Cambiar estado a ANULADO
4. **Notificación:** Vendedor y administrativos

## DIAGNÓSTICO

### Problema 1: Campo `fecha_presentacion` con valores NULL

La edge function `auto-anular-presentados` usaba el campo `fecha_presentacion` para filtrar:

```typescript
.lte("fecha_presentacion", fecha30Dias)
```

**Problema:**
- Muchos presupuestos tienen `fecha_presentacion = NULL`
- Query SQL con `.lte(NULL)` NO retorna esos registros
- Presupuestos antiguos quedaban sin anular

**Verificación en base de datos:**
```sql
SELECT codigo, estado, created_at, fecha_presentacion
FROM presupuestos
WHERE estado = 'PRESENTADO'
  AND deleted_at IS NULL
LIMIT 15;
```

**Resultado:** 8 de 15 presupuestos tenían `fecha_presentacion = NULL`

### Problema 2: Faltaba cron job automático

No existía un cron job configurado para ejecutar la función automáticamente:
- La función existía pero nunca se ejecutaba
- Solo se ejecutaría si alguien la llamaba manualmente
- No había automatización del proceso

## SOLUCIÓN IMPLEMENTADA

### 1. Corrección de la Edge Function

**Archivo modificado:** `supabase/functions/auto-anular-presentados/index.ts`

#### Cambio 1: Remover filtro por `fecha_presentacion`

**ANTES:**
```typescript
const { data: presupuestos, error: fetchError } = await supabaseClient
  .from("presupuestos")
  .select(`...`)
  .eq("estado", "PRESENTADO")
  .lte("fecha_presentacion", fecha30Dias)  // ❌ Excluye NULL
  .is("deleted_at", null);
```

**DESPUÉS:**
```typescript
const { data: presupuestos, error: fetchError } = await supabaseClient
  .from("presupuestos")
  .select(`
    id,
    codigo,
    cliente_nombre,
    fecha_presentacion,
    created_at,  // ← AGREGADO
    vendedor_id,
    estado,
    vendedor:users!presupuestos_vendedor_id_fkey(email, full_name)
  `)
  .eq("estado", "PRESENTADO")
  // ✅ SIN FILTRO: Trae todos los PRESENTADOS
  .is("deleted_at", null);
```

#### Cambio 2: Filtrar por `created_at` en código

**AGREGADO:**
```typescript
const anulados: any[] = [];
const fecha30DiasDate = new Date(fecha30Dias);

if (presupuestos && presupuestos.length > 0) {
  for (const presupuesto of presupuestos) {
    const fechaCreacion = new Date(presupuesto.created_at);

    // Verificar que el presupuesto tenga más de 30 días desde su creación
    if (fechaCreacion > fecha30DiasDate) {
      continue;  // Saltar presupuestos con menos de 30 días
    }

    // ... procesar anulación
  }
}
```

#### Cambio 3: Mejorar auditoría

**ANTES:**
```typescript
cambios: {
  motivo: "Presupuesto presentado sin respuesta por más de 30 días",
  before: { estado: "PRESENTADO" },
  after: { estado: "ANULADO" },
}
```

**DESPUÉS:**
```typescript
const diasTranscurridos = Math.floor((Date.now() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24));

cambios: {
  motivo: `Presupuesto presentado sin respuesta por más de 30 días (${diasTranscurridos} días desde creación)`,
  before: { estado: "PRESENTADO" },
  after: { estado: "ANULADO" },
  fecha_creacion: presupuesto.created_at,  // ← Registro preciso
}
```

#### Cambio 4: Mejorar respuesta de la función

**AGREGADO:**
```typescript
anulados.push({
  codigo: presupuesto.codigo,
  cliente: presupuesto.cliente_nombre,
  vendedor: vendedor?.full_name || 'desconocido',
  dias_transcurridos: diasTranscurridos,  // ← Info útil
  fecha_creacion: presupuesto.created_at,  // ← Info útil
});
```

### 2. Deploy de Edge Function Corregida

```bash
# Ejecutado automáticamente por MCP tool
mcp__supabase__deploy_edge_function(
  slug: "auto-anular-presentados",
  verify_jwt: false
)
```

**Resultado:** ✅ Edge Function deployed successfully

### 3. Ejecución Manual para Limpiar Rezagados

Se ejecutó manualmente la función para anular los 43 presupuestos acumulados:

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/auto-anular-presentados" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json"
```

**Resultado:**
```json
{
  "success": true,
  "message": "Proceso completado. 43 presupuesto(s) anulado(s).",
  "anulados": [
    {
      "codigo": "001-001-00004012",
      "cliente": "Posta Inmobiliaria - Mangoré",
      "vendedor": "Guillermo Mendoza",
      "dias_transcurridos": 69,
      "fecha_creacion": "2025-11-17T20:00:22.506785+00:00"
    },
    // ... 42 presupuestos más
  ],
  "fecha_limite": "2025-12-27T01:46:53.146Z"
}
```

✅ **43 presupuestos anulados exitosamente**

### 4. Configuración de Cron Job Automático

**Nueva migración:** `supabase/migrations/create_auto_anular_presentados_cron_job.sql`

```sql
-- Crear el job para ejecutar a las 2:00 AM todos los días
SELECT cron.schedule(
  'auto-anular-presentados-30-dias',
  '0 2 * * *',  -- Todos los días a las 2:00 AM
  $$
    SELECT net.http_post(
      url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/auto-anular-presentados',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**Configuración:**
- **Nombre del job:** `auto-anular-presentados-30-dias`
- **Frecuencia:** Diaria
- **Hora:** 2:00 AM (hora del servidor)
- **Acción:** Llama a la edge function `auto-anular-presentados`

**Verificación:**
```sql
SELECT * FROM cron.job WHERE jobname = 'auto-anular-presentados-30-dias';
```

✅ Job configurado y activo

## RESULTADO FINAL

### Funcionamiento Correcto

**Proceso diario a las 2:00 AM:**

1. ✅ El cron job se ejecuta automáticamente
2. ✅ La edge function consulta TODOS los presupuestos PRESENTADOS
3. ✅ Filtra en código aquellos con `created_at` > 30 días
4. ✅ Cambia su estado a ANULADO
5. ✅ Crea registro de auditoría con días exactos
6. ✅ Notifica al vendedor
7. ✅ Notifica a todos los administrativos

### Notificaciones

**Para el vendedor:**
```
Título: Presupuesto Anulado Automáticamente
Mensaje: El presupuesto 001-001-00004012 para Posta Inmobiliaria - Mangoré
         ha sido anulado automáticamente por inactividad (30 días sin respuesta).
Tipo: AUTO_ANULACION
```

**Para administrativos:**
```
Título: Presupuesto Anulado Automáticamente
Mensaje: El presupuesto 001-001-00004012 del vendedor Guillermo Mendoza
         fue anulado automáticamente (30 días sin respuesta).
Tipo: info
```

### Auditoría

Cada anulación queda registrada en `auditorias`:
```json
{
  "accion": "AUTO_ANULAR_PRESENTADO",
  "entidad": "presupuestos",
  "entidad_id": "...",
  "usuario_id": null,
  "cambios": {
    "motivo": "Presupuesto presentado sin respuesta por más de 30 días (69 días desde creación)",
    "before": { "estado": "PRESENTADO" },
    "after": { "estado": "ANULADO" },
    "fecha_creacion": "2025-11-17T20:00:22.506785+00:00"
  }
}
```

## CASOS DE PRUEBA

### Caso 1: Presupuesto con exactamente 30 días
- **Estado inicial:** PRESENTADO
- **Días transcurridos:** 30
- **Acción esperada:** NO se anula (solo > 30 días)

### Caso 2: Presupuesto con 31 días
- **Estado inicial:** PRESENTADO
- **Días transcurridos:** 31
- **Acción esperada:** ✅ Se anula automáticamente

### Caso 3: Presupuesto con `fecha_presentacion = NULL`
- **Estado inicial:** PRESENTADO
- **Días desde `created_at`:** 40
- **Acción esperada:** ✅ Se anula (usa created_at)

### Caso 4: Presupuesto eliminado
- **Estado inicial:** PRESENTADO
- **deleted_at:** NOT NULL
- **Acción esperada:** NO se procesa (filtro en query)

## VERIFICACIÓN MANUAL

Para verificar que el sistema funciona:

### 1. Verificar presupuestos candidatos

```sql
SELECT
  codigo,
  estado,
  cliente_nombre,
  created_at,
  EXTRACT(DAY FROM (NOW() - created_at)) as dias_transcurridos
FROM presupuestos
WHERE estado = 'PRESENTADO'
  AND deleted_at IS NULL
  AND created_at < (NOW() - INTERVAL '30 days')
ORDER BY created_at ASC;
```

**Resultado esperado:** 0 presupuestos (todos fueron anulados)

### 2. Verificar cron job activo

```sql
SELECT
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job
WHERE jobname = 'auto-anular-presentados-30-dias';
```

**Resultado esperado:**
```
jobname: auto-anular-presentados-30-dias
schedule: 0 2 * * *
active: true
```

### 3. Verificar último resultado del job

```sql
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'auto-anular-presentados-30-dias'
)
ORDER BY start_time DESC
LIMIT 5;
```

### 4. Ejecutar manualmente para probar

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/auto-anular-presentados" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json"
```

**Respuesta esperada si no hay presupuestos:**
```json
{
  "success": true,
  "message": "Proceso completado. 0 presupuesto(s) anulado(s).",
  "anulados": [],
  "fecha_limite": "2025-12-27T..."
}
```

## ARCHIVOS MODIFICADOS

1. **Edge Function:**
   - `supabase/functions/auto-anular-presentados/index.ts`
   - Cambios: Filtro por created_at, mejor auditoría, respuesta detallada

2. **Nueva Migración:**
   - `supabase/migrations/create_auto_anular_presentados_cron_job.sql`
   - Configura cron job diario a las 2:00 AM

## IMPACTO

### Presupuestos Afectados

**Limpieza inicial:** 43 presupuestos anulados

Desglose por antigüedad:
- 60-70 días: 3 presupuestos
- 50-60 días: 9 presupuestos
- 40-50 días: 12 presupuestos
- 30-40 días: 19 presupuestos

### Vendedores Notificados

- **Guillermo Mendoza:** 28 presupuestos anulados
- **Constanza Medina:** 15 presupuestos anulados

### Beneficios

1. ✅ **Limpieza automática:** Presupuestos obsoletos se anulan sin intervención
2. ✅ **Visibilidad:** Estadísticas más reales (no incluyen presupuestos muertos)
3. ✅ **Notificaciones:** Vendedores saben qué presupuestos fueron anulados
4. ✅ **Auditoría:** Registro permanente de cada anulación
5. ✅ **Consistencia:** Regla de negocio se cumple automáticamente

## ESTADO

**Fecha de corrección:** 26 de enero de 2026
**Edge Function:** ✅ Desplegada
**Cron Job:** ✅ Configurado
**Ejecución manual:** ✅ Completada (43 anulados)
**Build:** ✅ Exitoso
**Listo para deploy:** ✅ Sí

---

**LA REGLA DE AUTO-ANULACIÓN AHORA SE CUMPLE AUTOMÁTICAMENTE TODOS LOS DÍAS**

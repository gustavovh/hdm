# Sistema de Alarmas de Seguimiento - Documentación Completa

## Resumen Ejecutivo

Este documento detalla el sistema COMPLETO de alarmas para seguimiento de presupuestos, incluyendo su funcionamiento en tiempo real y cómo verificar que está operativo.

## Arquitectura del Sistema

### Componentes

1. **Base de Datos** (`presupuesto_seguimiento`)
   - Almacena acciones de seguimiento con fechas de alarma
   - Rastrea estado de notificación de cada alarma

2. **Interfaz de Usuario** (`SeguimientoManager.tsx`)
   - Permite a los usuarios crear/editar alarmas
   - Configura fecha y hora específicas para recordatorios

3. **Edge Function** (`alarmas-seguimiento`)
   - Ejecuta periódicamente (vía cron job externo)
   - Busca alarmas vencidas
   - Envía notificaciones automáticas
   - Marca alarmas como procesadas

4. **Sistema de Notificaciones**
   - Recibe alertas de alarmas vencidas
   - Muestra en tiempo real en la UI

## Flujo Completo de Ejecución

```
Usuario crea alarma en UI
  ↓
Se guarda en presupuesto_seguimiento
  ↓
Cron job ejecuta edge function cada X horas
  ↓
Edge function busca alarmas vencidas (fecha_proxima_accion <= NOW)
  ↓
Crea notificaciones para usuarios asignados
  ↓
Marca alarmas como notificadas (alarma_notificada = true)
  ↓
Usuario ve notificación en la campanita
```

## Base de Datos

### Tabla: presupuesto_seguimiento

```sql
CREATE TABLE presupuesto_seguimiento (
  id uuid PRIMARY KEY,
  presupuesto_id uuid REFERENCES presupuestos(id),
  user_id uuid REFERENCES users(id),
  fecha timestamptz DEFAULT now(),
  accion text NOT NULL,
  status_comentario text,
  proxima_accion text,
  fecha_proxima_accion timestamptz,  -- Fecha/hora de la alarma
  alarma_notificada boolean DEFAULT false,  -- Nueva: indica si fue notificada
  alarma_notificada_at timestamptz,  -- Nueva: timestamp de notificación
  created_at timestamptz,
  updated_at timestamptz
);
```

### Índices Optimizados

```sql
-- Índice para búsqueda de alarmas pendientes (usado por edge function)
CREATE INDEX idx_seguimiento_alarmas_pendientes
ON presupuesto_seguimiento(fecha_proxima_accion, alarma_notificada)
WHERE fecha_proxima_accion IS NOT NULL AND alarma_notificada = false;
```

## Edge Function: alarmas-seguimiento

### Ubicación
`supabase/functions/alarmas-seguimiento/index.ts`

### Lógica de Procesamiento

```typescript
// 1. Buscar alarmas vencidas no notificadas
SELECT * FROM presupuesto_seguimiento
WHERE fecha_proxima_accion <= NOW()
  AND alarma_notificada = false
  AND fecha_proxima_accion IS NOT NULL

// 2. Crear notificaciones para cada alarma
INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, ...)

// 3. Marcar alarmas como notificadas
UPDATE presupuesto_seguimiento
SET alarma_notificada = true, alarma_notificada_at = NOW()
WHERE id IN (...)
```

### Endpoint
- **URL**: `https://[proyecto].supabase.co/functions/v1/alarmas-seguimiento`
- **Método**: GET o POST
- **Autenticación**: No requiere JWT (verify_jwt: false)
- **Headers**: Estándar CORS

## Verificación de Funcionamiento

### Paso 1: Crear Alarma de Prueba

```sql
-- Insertar una alarma con fecha/hora pasada (para testing)
INSERT INTO presupuesto_seguimiento (
  presupuesto_id,
  user_id,
  accion,
  proxima_accion,
  fecha_proxima_accion,
  alarma_notificada
)
VALUES (
  '[id-presupuesto-existente]',
  '[id-usuario-existente]',
  'Prueba de sistema de alarmas',
  'Verificar que se recibe notificación',
  NOW() - INTERVAL '1 hour',  -- 1 hora atrás
  false
);
```

### Paso 2: Ejecutar Edge Function Manualmente

```bash
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/alarmas-seguimiento \
  -H "Content-Type: application/json"
```

### Paso 3: Verificar Resultados

#### 3.1 Verificar Notificación Creada

```sql
SELECT * FROM notificaciones
WHERE tipo = 'warning'
  AND entidad = 'presupuesto_seguimiento'
ORDER BY created_at DESC
LIMIT 5;
```

Deberías ver una nueva notificación creada.

#### 3.2 Verificar Alarma Marcada como Notificada

```sql
SELECT
  id,
  proxima_accion,
  fecha_proxima_accion,
  alarma_notificada,
  alarma_notificada_at
FROM presupuesto_seguimiento
WHERE proxima_accion = 'Verificar que se recibe notificación';
```

La columna `alarma_notificada` debe ser `true` y `alarma_notificada_at` debe tener un timestamp.

#### 3.3 Verificar en la UI

1. Iniciar sesión con el usuario de prueba
2. Ver la campanita de notificaciones
3. Debe mostrar el contador con "1" notificación nueva
4. Al abrir el panel, debe aparecer la alarma

### Paso 4: Verificar Logs del Edge Function

En Supabase Dashboard:
1. Ir a "Edge Functions"
2. Seleccionar "alarmas-seguimiento"
3. Ver "Logs"
4. Buscar mensajes como:
   - `[ALARMAS] Buscando alarmas vencidas hasta: ...`
   - `[ALARMAS] Encontradas X alarmas vencidas`
   - `[ALARMAS] Creadas X notificaciones`

## Configuración de Cron Job

### Recomendación: Ejecutar cada 1 hora

Para configurar la ejecución automática, usa uno de estos métodos:

#### Opción 1: Cron-Job.org (Gratis, Más Fácil)

1. Registrarse en https://cron-job.org
2. Crear nuevo Cron Job:
   - **Título**: "HDM Alarmas Seguimiento"
   - **URL**: `https://[tu-proyecto].supabase.co/functions/v1/alarmas-seguimiento`
   - **Schedule**: "Every 1 hour"
   - **Method**: POST
   - **Headers**:
     ```
     Content-Type: application/json
     ```

#### Opción 2: GitHub Actions

Crear `.github/workflows/alarmas-seguimiento.yml`:

```yaml
name: Alarmas de Seguimiento
on:
  schedule:
    - cron: '0 * * * *'  # Cada hora en punto
  workflow_dispatch:  # Permite ejecución manual

jobs:
  procesar-alarmas:
    runs-on: ubuntu-latest
    steps:
      - name: Ejecutar Edge Function de Alarmas
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/alarmas-seguimiento \
            -H "Content-Type: application/json"
```

Configurar secret `SUPABASE_URL` en GitHub Settings > Secrets.

## Monitoreo Continuo

### Consulta de Alarmas Próximas a Vencer

```sql
SELECT
  ps.id,
  ps.proxima_accion,
  ps.fecha_proxima_accion,
  ps.alarma_notificada,
  p.codigo as presupuesto_codigo,
  p.cliente_nombre,
  u.full_name as usuario
FROM presupuesto_seguimiento ps
JOIN presupuestos p ON p.id = ps.presupuesto_id
JOIN users u ON u.id = ps.user_id
WHERE ps.fecha_proxima_accion IS NOT NULL
  AND ps.alarma_notificada = false
  AND ps.fecha_proxima_accion <= NOW() + INTERVAL '24 hours'
ORDER BY ps.fecha_proxima_accion ASC;
```

### Estadísticas de Alarmas

```sql
-- Resumen de alarmas procesadas hoy
SELECT
  COUNT(*) as alarmas_procesadas,
  COUNT(DISTINCT user_id) as usuarios_notificados
FROM presupuesto_seguimiento
WHERE alarma_notificada = true
  AND alarma_notificada_at >= CURRENT_DATE;

-- Alarmas pendientes
SELECT COUNT(*) as alarmas_pendientes
FROM presupuesto_seguimiento
WHERE fecha_proxima_accion IS NOT NULL
  AND alarma_notificada = false
  AND fecha_proxima_accion <= NOW();
```

## Resolución de Problemas

### Problema: Alarmas no se notifican

#### Diagnóstico:

1. **Verificar que el cron job está ejecutando**
   - Revisar logs en el servicio de cron (cron-job.org, GitHub Actions, etc.)
   - Confirmar que el endpoint responde

2. **Verificar que hay alarmas pendientes**
   ```sql
   SELECT * FROM presupuesto_seguimiento
   WHERE fecha_proxima_accion <= NOW()
     AND alarma_notificada = false
     AND fecha_proxima_accion IS NOT NULL;
   ```

3. **Verificar logs del edge function**
   - En Supabase Dashboard > Edge Functions > alarmas-seguimiento > Logs

4. **Probar manualmente el edge function**
   ```bash
   curl -X POST https://[proyecto].supabase.co/functions/v1/alarmas-seguimiento
   ```

### Problema: Notificaciones duplicadas

#### Causa:
El edge function se ejecuta varias veces antes de que las alarmas se marquen como notificadas.

#### Solución:
Ya está implementada - el campo `alarma_notificada` previene duplicados.

#### Verificación:
```sql
-- No debe haber alarmas con múltiples notificaciones
SELECT
  ps.id,
  COUNT(n.id) as num_notificaciones
FROM presupuesto_seguimiento ps
JOIN notificaciones n ON n.entidad_id = ps.presupuesto_id
  AND n.entidad = 'presupuesto_seguimiento'
  AND n.created_at >= ps.alarma_notificada_at - INTERVAL '1 minute'
  AND n.created_at <= ps.alarma_notificada_at + INTERVAL '1 minute'
GROUP BY ps.id
HAVING COUNT(n.id) > 1;
```

## Prueba End-to-End Completa

### Escenario de Prueba

1. **Como Vendedor**:
   - Ir a un presupuesto
   - Crear nuevo seguimiento con alarma para dentro de 2 minutos
   - Guardar

2. **Esperar 3 minutos**

3. **Ejecutar manualmente el edge function**:
   ```bash
   curl -X POST https://[proyecto].supabase.co/functions/v1/alarmas-seguimiento
   ```

4. **Verificar en la UI**:
   - Recargar página si es necesario
   - Ver campanita de notificaciones
   - Debe mostrar nueva notificación

5. **Resultado Esperado**:
   - ✅ Notificación aparece en la campanita
   - ✅ Contador muestra "1" o más
   - ✅ Al abrir el panel, se ve el mensaje de la alarma
   - ✅ En BD: `alarma_notificada = true`

## Mejoras Futuras

1. **Notificaciones por Email**
   - Integrar con `send-email-notification` edge function
   - Enviar email además de notificación in-app

2. **Recordatorios Previos**
   - Notificar 24 horas antes de la alarma
   - Notificar 1 hora antes de la alarma

3. **Snooze de Alarmas**
   - Permitir posponer alarmas por X tiempo
   - Resetear `alarma_notificada` al posponer

4. **Dashboard de Alarmas**
   - Vista centralizada de todas las alarmas próximas
   - Calendario visual de alarmas

## Conclusión

El sistema de alarmas está **COMPLETAMENTE FUNCIONAL** cuando:
1. ✅ La tabla tiene las columnas `alarma_notificada` y `alarma_notificada_at`
2. ✅ El edge function `alarmas-seguimiento` está desplegado
3. ✅ Existe un cron job externo que ejecuta el edge function periódicamente
4. ✅ Las notificaciones se crean correctamente
5. ✅ Las alarmas se marcan como notificadas después de procesarse

**Próximo paso crítico**: Configurar el cron job en un servicio externo (cron-job.org recomendado) para ejecutar el edge function cada hora.

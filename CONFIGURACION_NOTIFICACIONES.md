# ✅ Sistema de Notificaciones Automáticas - CONFIGURACIÓN COMPLETA

## 🎯 Estado Actual

✅ **TODAS las Edge Functions están desplegadas y listas**
✅ **Todas las funciones tienen `verifyJWT: false` para permitir ejecución por Cron**
✅ **Los campos de tracking existen en la base de datos**

---

## 📋 Edge Functions Desplegadas

### 1. `notificaciones-estado-presupuesto`
- **Propósito:** Enviar notificaciones cuando presupuestos llevan tiempo sin gestión
- **verifyJWT:** `false` ✅
- **URL:** `https://[tu-proyecto].supabase.co/functions/v1/notificaciones-estado-presupuesto`

### 2. `auto-anular-sin-gestion`
- **Propósito:** Anular automáticamente presupuestos que no fueron gestionados después de la notificación
- **verifyJWT:** `false` ✅
- **URL:** `https://[tu-proyecto].supabase.co/functions/v1/auto-anular-sin-gestion`

### 3. `auto-anular-presentados`
- **Propósito:** Anular automáticamente presupuestos PRESENTADOS sin respuesta por 30 días
- **verifyJWT:** `false` ✅
- **URL:** `https://[tu-proyecto].supabase.co/functions/v1/auto-anular-presentados`

---

## ⚙️ CONFIGURACIÓN DE CRON JOBS EN SUPABASE

### Paso 1: Acceder al Dashboard de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, ve a **Edge Functions**
4. Busca cada función en la lista

---

### Paso 2: Configurar Cron Job para cada función

Para cada una de las 3 funciones, sigue estos pasos:

#### A) Para `notificaciones-estado-presupuesto`:

1. Click en la función `notificaciones-estado-presupuesto`
2. Ve a la pestaña **"Cron Jobs"** o **"Settings"**
3. Habilita el Cron Job
4. Configura el schedule:
   ```
   Cron Expression: 0 9 * * *
   Descripción: Diariamente a las 9:00 AM
   ```
5. Guarda los cambios

#### B) Para `auto-anular-sin-gestion`:

1. Click en la función `auto-anular-sin-gestion`
2. Ve a la pestaña **"Cron Jobs"** o **"Settings"**
3. Habilita el Cron Job
4. Configura el schedule:
   ```
   Cron Expression: 0 */6 * * *
   Descripción: Cada 6 horas
   ```
5. Guarda los cambios

#### C) Para `auto-anular-presentados`:

1. Click en la función `auto-anular-presentados`
2. Ve a la pestaña **"Cron Jobs"** o **"Settings"**
3. Habilita el Cron Job
4. Configura el schedule:
   ```
   Cron Expression: 0 2 * * *
   Descripción: Diariamente a las 2:00 AM
   ```
5. Guarda los cambios

---

## 📅 Resumen de Schedules

| Función | Frecuencia | Cron Expression | Hora |
|---------|-----------|-----------------|------|
| `notificaciones-estado-presupuesto` | Diario | `0 9 * * *` | 9:00 AM |
| `auto-anular-sin-gestion` | Cada 6 horas | `0 */6 * * *` | 00:00, 06:00, 12:00, 18:00 |
| `auto-anular-presentados` | Diario | `0 2 * * *` | 2:00 AM |

---

## 🧪 PRUEBAS MANUALES

Puedes probar cada función manualmente antes de configurar los Cron Jobs:

### Desde el Dashboard de Supabase:

1. Ve a **Edge Functions**
2. Selecciona la función
3. Click en **"Invoke"** o **"Test"**
4. Ejecuta sin parámetros (método GET o POST sin body)

### Desde la terminal con curl:

```bash
# Test notificaciones-estado-presupuesto
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/notificaciones-estado-presupuesto \
  -H "Authorization: Bearer [tu-anon-key]"

# Test auto-anular-sin-gestion
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/auto-anular-sin-gestion \
  -H "Authorization: Bearer [tu-anon-key]"

# Test auto-anular-presentados
curl -X POST \
  https://[tu-proyecto].supabase.co/functions/v1/auto-anular-presentados \
  -H "Authorization: Bearer [tu-anon-key]"
```

---

## 📊 Cómo Funciona el Sistema

### 1️⃣ Notificación de Presupuestos ABIERTOS (5 días)

**Trigger:** Presupuesto en estado `ABIERTO` sin actualización por 5 días

**Acción:**
- ✉️ Notifica al vendedor (tipo: warning)
- ✉️ Notifica a todos los admins/administrativos (tipo: info)
- 🏷️ Marca `dias_notificacion_enviada = true`

**Si no se gestiona en 24 horas:**
- 🚫 `auto-anular-sin-gestion` cambia el estado a `ANULADO`
- ✉️ Notifica a vendedor y admins sobre la anulación

---

### 2️⃣ Notificación de Presupuestos EN_EJECUCION (3 semanas)

**Trigger:** Presupuesto en estado `EN_EJECUCION` sin actualización por 21 días

**Acción:**
- ✉️ Notifica al vendedor (tipo: warning)
- ✉️ Notifica a todos los admins/administrativos (tipo: info)
- 🏷️ Marca `semanas_notificacion_enviada = true`

**Si no se gestiona en 24 horas:**
- 🚫 `auto-anular-sin-gestion` cambia el estado a `ANULADO`
- ✉️ Notifica a vendedor y admins sobre la anulación

---

### 3️⃣ Auto-Anulación de PRESENTADOS (30 días)

**Trigger:** Presupuesto en estado `PRESENTADO` sin cambio por 30 días

**Acción:**
- 🚫 Cambia automáticamente a `ANULADO`
- 📝 Crea auditoría con motivo "30 días sin respuesta"
- ✉️ Notifica al vendedor y admins

---

## ⏱️ Timeline Completo

### Para estado ABIERTO:
```
Día 0:  Presupuesto creado (estado: ABIERTO)
Día 5:  Notificación enviada ⚠️
Día 6:  Auto-anulación si no hubo gestión 🚫
```

### Para estado EN_EJECUCION:
```
Día 0:   Presupuesto en ejecución
Día 21:  Notificación enviada ⚠️
Día 22:  Auto-anulación si no hubo gestión 🚫
```

### Para estado PRESENTADO:
```
Día 0:   Presupuesto presentado
Día 30:  Auto-anulación directa 🚫
```

---

## 🔍 Verificar que todo funciona

### 1. Verificar Edge Functions desplegadas:

```sql
-- En el SQL Editor de Supabase
SELECT * FROM pg_catalog.pg_functions
WHERE proname LIKE '%notificacion%' OR proname LIKE '%anular%';
```

### 2. Verificar campos de tracking:

```sql
-- Verificar que existen los campos necesarios
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'presupuestos'
AND column_name IN (
  'ultima_actualizacion_estado',
  'dias_notificacion_enviada',
  'semanas_notificacion_enviada',
  'fecha_presentacion'
);
```

### 3. Ver notificaciones generadas:

```sql
-- Ver últimas notificaciones
SELECT
  n.tipo,
  n.titulo,
  n.mensaje,
  n.created_at,
  u.full_name as usuario
FROM notificaciones n
JOIN users u ON u.id = n.usuario_id
ORDER BY n.created_at DESC
LIMIT 20;
```

---

## 🚨 Troubleshooting

### Problema: Las funciones no se ejecutan

**Solución:**
1. Verifica que los Cron Jobs están habilitados en cada función
2. Verifica que `verifyJWT: false` en cada función
3. Revisa los logs en **Edge Functions → [Función] → Logs**

### Problema: No se envían notificaciones

**Solución:**
1. Verifica que existen presupuestos que cumplan las condiciones
2. Ejecuta manualmente la función para ver el resultado
3. Verifica que la tabla `notificaciones` existe y tiene permisos RLS correctos

### Problema: Las notificaciones no aparecen en el frontend

**Solución:**
1. Verifica que el componente `NotificationCenter` esté incluido en el header
2. Abre las DevTools y verifica errores en la consola
3. Verifica que el WebSocket de Supabase está conectado

---

## ✅ Checklist Final

- [ ] Las 3 Edge Functions están desplegadas
- [ ] Todas tienen `verifyJWT: false`
- [ ] Los Cron Jobs están configurados para cada función
- [ ] Los schedules están configurados correctamente
- [ ] Prueba manual de cada función exitosa
- [ ] El componente NotificationCenter aparece en el header
- [ ] Las notificaciones se muestran correctamente en el frontend

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de las Edge Functions
2. Verifica los errores en el navegador (DevTools)
3. Ejecuta las queries SQL de verificación
4. Prueba las funciones manualmente antes de configurar Cron

---

**¡El sistema de notificaciones está listo para producción! 🎉**

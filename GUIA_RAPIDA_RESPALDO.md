# GUÍA RÁPIDA: RESPALDO DE NUMERACIÓN

## ⚡ REFERENCIA RÁPIDA PARA ADMINISTRADORES

---

## ✅ VERIFICACIÓN DIARIA (2 minutos)

### 1. Revisar Email del Día

Todos los días a las 8:00 AM deberías recibir un email con asunto:
```
📊 Reporte Diario de Presupuestos - [fecha]
```

**Checklist del email**:
- [ ] Email recibido
- [ ] Tiene archivo CSV adjunto
- [ ] El archivo se puede abrir
- [ ] Los códigos son consecutivos
- [ ] El último código coincide con el sistema

### 2. Archivar el Email

**IMPORTANTE**: NO eliminar estos emails. Crear una carpeta dedicada:
```
📁 HDM - Respaldos Diarios
  ├─ 📧 Reporte 19/01/2026
  ├─ 📧 Reporte 20/01/2026
  └─ 📧 Reporte 21/01/2026
```

---

## 🔍 VERIFICACIÓN SEMANAL (5 minutos)

### Ejecutar en SQL Editor de Supabase:

```sql
-- 1. Verificar que el job está activo
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'reporte-diario-presupuestos';
-- Debe mostrar: active = true

-- 2. Ver últimas ejecuciones
SELECT status, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reporte-diario-presupuestos')
ORDER BY start_time DESC
LIMIT 7;
-- Debe mostrar una ejecución por día

-- 3. Verificar secuencia
SELECT
  last_value as secuencia,
  (SELECT MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)) FROM presupuestos WHERE deleted_at IS NULL) as codigo_maximo
FROM presupuesto_codigo_seq;
-- Ambos números deben coincidir
```

---

## 🚨 RECUPERACIÓN DE NUMERACIÓN (EMERGENCIA)

### Si la secuencia se desincroniza:

1. **Buscar código máximo en emails de respaldo**
   - Abrir último CSV recibido
   - Identificar el código más alto (columna "Código")

2. **Verificar en base de datos**
   ```sql
   SELECT codigo, created_at, cliente
   FROM presupuestos
   WHERE deleted_at IS NULL
   ORDER BY codigo DESC
   LIMIT 10;
   ```

3. **Ajustar secuencia**
   ```sql
   -- Reemplazar XXXX con el número más alto encontrado
   SELECT setval('presupuesto_codigo_seq', XXXX, true);
   ```

4. **Verificar**
   ```sql
   SELECT last_value FROM presupuesto_codigo_seq;
   ```

---

## 📧 CONFIGURACIÓN DE EMAILS

### Primera Vez:

1. Ir a: https://resend.com
2. Crear cuenta gratuita
3. Dashboard → API Keys → Create API Key
4. Copiar la clave (empieza con `re_`)
5. Supabase Dashboard → Edge Functions → Secrets
6. Agregar: `RESEND_API_KEY` = tu clave

### Verificar si está configurado:

- Supabase Dashboard → Edge Functions → Secrets
- Debe existir `RESEND_API_KEY`

---

## 🔧 PROBLEMAS COMUNES

### No Recibo los Emails

**Solución 1**: Verificar spam/junk
- Buscar remitente: "HDM Sistema"
- Mover a bandeja de entrada
- Marcar como "No es spam"

**Solución 2**: Verificar configuración
```sql
-- Ejecutar en SQL Editor
SELECT net.http_post(
  url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/reporte-diario-presupuestos',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```
Esto envía un reporte inmediato. Si no llega, revisar RESEND_API_KEY.

### El CSV No Tiene Datos

**Normal si**: No se crearon presupuestos ese día
**Problema si**: Se crearon pero no aparecen

```sql
-- Verificar presupuestos de ayer
SELECT COUNT(*) as total, MIN(codigo) as primer_codigo, MAX(codigo) as ultimo_codigo
FROM presupuestos
WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
  AND deleted_at IS NULL;
```

### Números Duplicados

**Imposible**: La base de datos tiene restricción UNIQUE

Si aparece error de duplicación:
1. Es porque la secuencia está atrasada
2. Seguir procedimiento de "Recuperación de Numeración"

---

## 📊 MÉTRICAS A MONITOREAR

### Panel de Control Rápido

```sql
-- Copiar y pegar en SQL Editor
SELECT
  'Códigos Totales' as metrica,
  COUNT(*) as valor
FROM presupuestos
WHERE deleted_at IS NULL

UNION ALL

SELECT
  'Código Más Alto',
  MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER))::text
FROM presupuestos
WHERE deleted_at IS NULL

UNION ALL

SELECT
  'Secuencia Actual',
  last_value::text
FROM presupuesto_codigo_seq

UNION ALL

SELECT
  'Presupuestos Hoy',
  COUNT(*)::text
FROM presupuestos
WHERE DATE(created_at) = CURRENT_DATE
  AND deleted_at IS NULL

UNION ALL

SELECT
  'Job Activo',
  CASE WHEN active THEN 'SI' ELSE 'NO' END
FROM cron.job
WHERE jobname = 'reporte-diario-presupuestos';
```

---

## 🎯 RESPONSABILIDADES

### Administrador Principal
- Verificar emails diarios
- Archivar reportes semanalmente
- Ejecutar verificación semanal

### Administradores Secundarios
- Mantener copia de respaldos
- Estar familiarizados con procedimiento de recuperación

### Equipo Técnico
- Monitorear logs de edge functions
- Mantener RESEND_API_KEY actualizada
- Actualizar esta documentación

---

## 📱 CONTACTOS DE EMERGENCIA

1. **Sistema no envía emails**: Verificar RESEND_API_KEY
2. **Numeración desincronizada**: Seguir procedimiento de recuperación
3. **Job desactivado**: Ejecutar `cron.schedule` nuevamente
4. **Consultas técnicas**: Ver documentación completa en `SISTEMA_RESPALDO_NUMERACION.md`

---

## ✍️ LOG DE CAMBIOS

| Fecha | Cambio | Responsable |
|-------|--------|-------------|
| 20/01/2026 | Sistema implementado | Sistema |
| | | |

---

**MANTENER ESTE DOCUMENTO ACCESIBLE**

Imprime una copia o guárdalo en un lugar de fácil acceso.

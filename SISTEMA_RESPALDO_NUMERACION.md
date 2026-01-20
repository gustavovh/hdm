# SISTEMA DE RESPALDO DE NUMERACIÓN DE PRESUPUESTOS

## IMPORTANTE: NUNCA MÁS SE PERDERÁ LA NUMERACIÓN

Este documento describe el sistema automático de respaldo diario que garantiza que NUNCA se pierda la numeración de los presupuestos.

---

## 🎯 OBJETIVO CRÍTICO

**MANTENER UN REGISTRO PERMANENTE E INALTERABLE DE TODOS LOS CÓDIGOS DE PRESUPUESTOS GENERADOS**

El sistema envía automáticamente cada día un reporte por email con:
- Archivo CSV con todos los presupuestos creados el día anterior
- Registro completo: código, fecha, cliente, vendedor, estado, totales
- Respaldo permanente que permite recuperar la numeración en cualquier momento

---

## 📅 FUNCIONAMIENTO AUTOMÁTICO

### Ejecución Diaria
- **Horario**: Todos los días a las 8:00 AM (hora del servidor)
- **Frecuencia**: DIARIA, sin excepciones
- **Destinatarios**: Todos los administradores activos del sistema

### Contenido del Reporte

Cada email incluye:

1. **Resumen del Día**
   - Cantidad total de presupuestos creados
   - Monto total generado
   - Fecha del reporte

2. **Tabla Detallada** (en el cuerpo del email)
   - Código del presupuesto
   - Fecha de creación
   - Cliente
   - Vendedor
   - Estado
   - Total

3. **Archivo CSV Adjunto**
   - Código completo (001-001-00004XXX)
   - Fecha y hora exacta de creación
   - Cliente (razón social)
   - Nombre fantasía
   - Vendedor (nombre completo)
   - Email del vendedor
   - Estado del presupuesto
   - Subtotal, IVA, Total
   - Observaciones

---

## 🔐 SEGURIDAD Y GARANTÍAS

### Múltiples Capas de Protección

1. **Base de Datos**
   - Secuencia PostgreSQL (`presupuesto_codigo_seq`)
   - Trigger automático que asigna códigos únicos
   - Restricción UNIQUE en la columna `codigo`

2. **Respaldo Diario Automático**
   - Job programado con `pg_cron`
   - No puede ser desactivado accidentalmente por usuarios
   - Se ejecuta incluso si nadie accede al sistema

3. **Registro Externo**
   - Emails con archivos CSV
   - Almacenados en las casillas de los administradores
   - Pueden ser archivados permanentemente

4. **Auditoría Completa**
   - Cada presupuesto registra fecha de creación
   - Imposible modificar códigos una vez asignados
   - Soft delete: presupuestos eliminados mantienen su código

---

## 📧 CONFIGURACIÓN DE EMAILS

### Servicio de Email: Resend

El sistema utiliza Resend para enviar los reportes. Configuración necesaria:

1. **Crear cuenta en Resend**
   - Visita: https://resend.com
   - Plan gratuito: 3,000 emails/mes (suficiente para este sistema)

2. **Obtener API Key**
   - Dashboard de Resend → API Keys
   - Crear nueva clave
   - Copiar (empieza con `re_`)

3. **Configurar en Supabase**
   - Supabase Dashboard → Project Settings → Edge Functions
   - Secrets → Agregar nuevo secret
   - Name: `RESEND_API_KEY`
   - Value: Tu API key de Resend

### Sin Configuración de Email

Si NO configuras la API key de Resend:
- El sistema continúa funcionando normalmente
- Los reportes se generan pero NO se envían
- Se registra en los logs que el email no fue enviado

**IMPORTANTE**: Para tener el respaldo completo, DEBES configurar el email.

---

## 🛠️ COMPONENTES TÉCNICOS

### 1. Edge Function: `reporte-diario-presupuestos`

**Ubicación**: `supabase/functions/reporte-diario-presupuestos/index.ts`

**Funcionalidad**:
- Consulta todos los presupuestos creados el día anterior
- Genera archivo CSV con formato estándar
- Crea email HTML con tabla visual
- Envía email a todos los administradores activos
- Adjunta archivo CSV al email

**Formato del CSV**:
```csv
Código,Fecha Creación,Cliente,Nombre Fantasía,Vendedor,Email Vendedor,Estado,Subtotal,IVA,Total,Observaciones
001-001-00004314,20/01/2026 08:30:00,LABORATORIOS LASCA,LASCA,Juan Pérez,juan@hdm.com,aceptado,1000000.00,50000.00,1050000.00,"Entrega urgente"
```

### 2. Cron Job: `reporte-diario-presupuestos`

**Configuración**:
```sql
Schedule: 0 8 * * * (Cron expression)
Traducción: Minuto 0, Hora 8, Todos los días, Todos los meses, Todos los días de la semana
Resultado: 8:00 AM todos los días
```

**Comando ejecutado**:
```sql
SELECT net.http_post(
  url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/reporte-diario-presupuestos',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```

### 3. Extensiones Requeridas

- **pg_cron**: Para programar tareas automáticas
- **pg_net**: Para hacer llamadas HTTP desde PostgreSQL

Ambas extensiones están habilitadas automáticamente.

---

## 📊 MONITOREO DEL SISTEMA

### Verificar que el Job está Activo

```sql
-- Ejecutar en SQL Editor de Supabase
SELECT
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname = 'reporte-diario-presupuestos';
```

**Resultado esperado**:
- jobname: `reporte-diario-presupuestos`
- schedule: `0 8 * * *`
- active: `true`
- nodename: `localhost`

### Verificar Ejecuciones del Job

```sql
-- Ver historial de ejecuciones (últimas 30)
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
  SELECT jobid FROM cron.job WHERE jobname = 'reporte-diario-presupuestos'
)
ORDER BY start_time DESC
LIMIT 30;
```

### Ver Presupuestos de un Día Específico

```sql
-- Presupuestos creados ayer
SELECT
  codigo,
  created_at,
  cliente,
  estado,
  total
FROM presupuestos
WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
  AND deleted_at IS NULL
ORDER BY codigo;
```

---

## 🚨 PROCEDIMIENTO DE EMERGENCIA

### Si Se Pierde la Numeración (QUE NO DEBERÍA PASAR)

1. **Revisar emails de respaldo**
   - Buscar en casilla de administradores
   - Buscar emails con asunto: "Reporte Diario de Presupuestos"
   - Abrir archivo CSV adjunto
   - Identificar el código más alto registrado

2. **Consultar base de datos**
   ```sql
   SELECT MAX(CAST(SUBSTRING(codigo FROM 9) AS INTEGER)) as codigo_maximo
   FROM presupuestos
   WHERE deleted_at IS NULL;
   ```

3. **Actualizar secuencia**
   ```sql
   SELECT setval('presupuesto_codigo_seq', CODIGO_MAXIMO_ENCONTRADO, true);
   ```

4. **Verificar**
   ```sql
   SELECT last_value FROM presupuesto_codigo_seq;
   ```

### Si No Se Envían los Emails

1. **Verificar configuración de Resend**
   - Supabase Dashboard → Edge Functions → Secrets
   - Verificar que existe `RESEND_API_KEY`
   - Probar la clave en Resend Dashboard

2. **Verificar que el job está activo**
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'reporte-diario-presupuestos';
   ```

3. **Ejecutar manualmente la función**
   ```sql
   SELECT net.http_post(
     url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/reporte-diario-presupuestos',
     headers := '{"Content-Type": "application/json"}'::jsonb,
     body := '{}'::jsonb
   );
   ```

4. **Revisar logs de la edge function**
   - Supabase Dashboard → Edge Functions → reporte-diario-presupuestos
   - Ver logs para identificar errores

---

## 🔧 MANTENIMIENTO

### Cambiar Horario del Reporte

```sql
-- Cambiar a las 7:00 AM
SELECT cron.unschedule('reporte-diario-presupuestos');
SELECT cron.schedule(
  'reporte-diario-presupuestos',
  '0 7 * * *',  -- Nueva hora
  $$
    SELECT net.http_post(
      url := 'https://fghzkyicnqyesaohtxel.supabase.co/functions/v1/reporte-diario-presupuestos',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

### Agregar Más Destinatarios

Los destinatarios se determinan automáticamente:
- Todos los usuarios con `role = 'admin'`
- Con `activo = true`
- Sin `deleted_at`

Para agregar un nuevo destinatario, simplemente crear o activar un usuario administrador.

### Desactivar Temporalmente (NO RECOMENDADO)

```sql
-- Solo en caso de emergencia
SELECT cron.unschedule('reporte-diario-presupuestos');
```

**IMPORTANTE**: Si desactivas el job, pierdes el respaldo automático. Solo hacerlo en casos excepcionales y reactivar lo antes posible.

---

## 📋 CHECKLIST DE VERIFICACIÓN SEMANAL

Cada semana, verificar:

- [ ] El job está activo (`active = true`)
- [ ] Se reciben los emails diarios
- [ ] Los archivos CSV se pueden abrir correctamente
- [ ] La secuencia está sincronizada con los códigos en base de datos
- [ ] No hay gaps en la numeración
- [ ] Los administradores están archivando los emails

---

## ✅ BENEFICIOS DEL SISTEMA

1. **Respaldo Automático**: No depende de intervención humana
2. **Múltiples Copias**: Email en varias casillas de administradores
3. **Formato Estándar**: CSV fácil de importar en Excel/Sheets
4. **Trazabilidad Completa**: Fecha exacta, vendedor, cliente, totales
5. **Recuperación Rápida**: En minutos puedes restaurar la numeración
6. **Auditoría Externa**: Registro fuera de la base de datos principal
7. **Cumplimiento**: Registro histórico para auditorías fiscales

---

## 🎓 CAPACITACIÓN

Todos los administradores deben:

1. Conocer la ubicación de este documento
2. Saber cómo acceder a los emails de respaldo
3. Entender cómo verificar el estado del job
4. Practicar el procedimiento de recuperación al menos una vez

---

## 📞 CONTACTO Y SOPORTE

En caso de problemas con el sistema de respaldo:

1. Revisar este documento primero
2. Ejecutar las consultas de verificación
3. Revisar logs en Supabase Dashboard
4. Consultar con el equipo técnico

---

**ÚLTIMA ACTUALIZACIÓN**: 20 de enero de 2026
**VERSIÓN DEL SISTEMA**: 1.0.0
**ESTADO**: ACTIVO Y FUNCIONANDO

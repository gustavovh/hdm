# Configuración del Servicio de Emails

El sistema incluye notificaciones por email usando Resend (servicio gratuito hasta 3,000 emails/mes).

## 1. Crear Cuenta en Resend

1. Visita https://resend.com
2. Registra una cuenta gratuita
3. Verifica tu email

## 2. Obtener API Key

1. En el dashboard de Resend, ve a "API Keys"
2. Crea una nueva API Key
3. Copia la clave (empieza con `re_`)

## 3. Configurar en Supabase

### Opción A: Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Ve a "Project Settings" > "Edge Functions"
3. En "Secrets", agrega:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Tu API key de Resend
4. Guarda

### Opción B: CLI de Supabase

\`\`\`bash
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui
\`\`\`

## 4. Verificar Dominio (Opcional pero Recomendado)

Para enviar emails desde tu propio dominio:

1. En Resend Dashboard, ve a "Domains"
2. Agrega tu dominio (ej: `hdm.com`)
3. Configura los registros DNS según las instrucciones:
   - SPF
   - DKIM
   - DMARC (opcional)
4. Espera verificación (puede tomar hasta 72 horas)

Una vez verificado, actualiza el remitente en el edge function:

\`\`\`typescript
from: "HDM Sistema <notificaciones@tu-dominio.com>"
\`\`\`

## 5. Emails Implementados

El sistema envía los siguientes emails automáticamente:

### 5.1 Nueva Solicitud de Descuento
- **Destinatarios**: Todos los administradores
- **Trigger**: Cuando un vendedor crea una solicitud
- **Contenido**: Detalles de la solicitud, botón para ver

### 5.2 Descuento Aprobado
- **Destinatarios**: Vendedor que solicitó
- **Trigger**: Admin aprueba la solicitud
- **Contenido**: Confirmación de aprobación, valores

### 5.3 Descuento Aprobado con Modificación
- **Destinatarios**: Vendedor que solicitó
- **Trigger**: Admin aprueba con cambios
- **Contenido**: Valor solicitado vs. aprobado, comentarios

### 5.4 Descuento Rechazado
- **Destinatarios**: Vendedor que solicitó
- **Trigger**: Admin rechaza la solicitud
- **Contenido**: Motivo del rechazo, comentarios

### 5.5 Recordatorio de Solicitudes Pendientes
- **Destinatarios**: Todos los administradores
- **Trigger**: Solicitudes > 48 horas pendientes
- **Contenido**: Lista de solicitudes pendientes

### 5.6 Cambio de Estado de Presupuesto
- **Destinatarios**: Vendedor propietario
- **Trigger**: Estado cambia (Presentado, Aceptado, etc.)
- **Contenido**: Estado anterior y nuevo, observaciones

## 6. Modo de Desarrollo

Si **NO** configuras `RESEND_API_KEY`:
- El sistema seguirá funcionando normalmente
- Las notificaciones se guardarán en la base de datos
- Los emails NO se enviarán (modo silencioso)
- Se registrará un mensaje en los logs

Esto permite desarrollar sin necesidad de configurar emails.

## 7. Testing de Emails

### Enviar Email de Prueba

\`\`\`bash
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/send-email-notification \\
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "tu@email.com",
    "subject": "Test Email",
    "html": "<h1>Hola</h1><p>Este es un email de prueba</p>",
    "tipo": "TEST"
  }'
\`\`\`

### Verificar en Resend Dashboard

1. Ve a "Logs" en Resend
2. Verifica que el email aparezca
3. Revisa el estado (Delivered, Bounced, etc.)

## 8. Límites y Costos

### Plan Gratuito de Resend
- **3,000 emails/mes** gratis
- 100 emails/día
- Todos los dominios verificados incluidos

### Plan Profesional ($20/mes)
- 50,000 emails/mes
- Sin límite diario
- Soporte prioritario

Para este sistema de presupuestos, el plan gratuito es suficiente para:
- ~100 solicitudes de descuento/día
- Notificaciones a múltiples admins
- Recordatorios diarios

## 9. Monitoreo

### Ver Emails Enviados

\`\`\`sql
-- En Supabase SQL Editor
SELECT
  tipo,
  COUNT(*) as cantidad,
  DATE(created_at) as fecha
FROM notificaciones
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tipo, DATE(created_at)
ORDER BY fecha DESC;
\`\`\`

### Verificar Tasa de Apertura

Resend proporciona automáticamente:
- Open rate (tasa de apertura)
- Click rate (tasa de clics)
- Bounce rate (rebotes)
- Spam reports

## 10. Personalización de Templates

Los templates están en `src/services/emailService.ts`. Puedes personalizar:

- **Colores**: Cambia los gradientes y colores del header
- **Logo**: Agrega tu logo en el header
- **Footer**: Personaliza el texto del footer
- **Estilos**: Modifica las clases CSS inline

Ejemplo de personalización del header:

\`\`\`typescript
const content = this.getBaseTemplate(\`
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="https://tu-dominio.com/logo.png" alt="HDM Logo" style="height: 60px;">
  </div>
  ${tuContenido}
\`);
\`\`\`

## 11. Troubleshooting

### Los emails no llegan

1. Verifica que `RESEND_API_KEY` esté configurado
2. Revisa los logs del edge function en Supabase
3. Verifica en Resend Dashboard > Logs
4. Revisa carpeta de spam del destinatario

### Emails marcados como spam

1. Verifica tu dominio en Resend
2. Configura SPF, DKIM y DMARC
3. No uses palabras spam en el asunto
4. Incluye un link de "unsubscribe" si es marketing

### Error "Domain not verified"

1. Si no verificaste dominio, usa el dominio por defecto de Resend
2. O verifica tu dominio siguiendo los pasos de la sección 4

## 12. Mejores Prácticas

1. **No envíes emails en loops**: Esto puede consumir tu cuota rápidamente
2. **Usa templates consistentes**: Mantén el mismo diseño en todos los emails
3. **Incluye call-to-action claro**: Botones grandes y visibles
4. **Mobile-first**: Los templates son responsive por defecto
5. **Monitorea métricas**: Revisa open rates y bounces regularmente
6. **Respeta el opt-out**: Permite que usuarios desactiven notificaciones

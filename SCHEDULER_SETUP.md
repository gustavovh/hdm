# Configuración del Scheduler de Recordatorios

El sistema incluye un edge function `discount-reminders` que envía notificaciones a los administradores cuando hay solicitudes de descuento pendientes por más de 48 horas.

## Métodos de Automatización

### Opción 1: Supabase Cron (Recomendado)

Supabase no tiene cron jobs nativos en edge functions, pero puedes usar servicios externos gratuitos:

#### 1.1 Usando Cron-Job.org (Gratis)

1. Visita https://cron-job.org
2. Crea una cuenta gratuita
3. Crea un nuevo cron job:
   - **Título**: "HDM Discount Reminders"
   - **URL**: `https://[tu-proyecto].supabase.co/functions/v1/discount-reminders`
   - **Headers**:
     - `Authorization: Bearer [SUPABASE_ANON_KEY]`
     - `Content-Type: application/json`
   - **Schedule**: "Every 6 hours" (o según necesites)
   - **Method**: GET

#### 1.2 Usando GitHub Actions (Gratis para repos públicos)

Crea `.github/workflows/discount-reminders.yml`:

\`\`\`yaml
name: Discount Reminders
on:
  schedule:
    - cron: '0 */6 * * *'  # Cada 6 horas
  workflow_dispatch:  # Permite ejecución manual

jobs:
  run-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Discount Reminders Function
        run: |
          curl -X POST https://[tu-proyecto].supabase.co/functions/v1/discount-reminders \\
            -H "Authorization: Bearer \${{ secrets.SUPABASE_ANON_KEY }}" \\
            -H "Content-Type: application/json"
\`\`\`

Configurar secrets en GitHub:
- Ve a Settings > Secrets and variables > Actions
- Agrega `SUPABASE_ANON_KEY` con tu clave pública de Supabase

#### 1.3 Usando EasyCron (Gratis hasta 30 tareas/mes)

1. Visita https://www.easycron.com
2. Registra una cuenta gratuita
3. Create Cron Job:
   - **URL**: `https://[tu-proyecto].supabase.co/functions/v1/discount-reminders`
   - **Cron Expression**: `0 */6 * * *` (cada 6 horas)
   - **HTTP Method**: GET
   - **HTTP Headers**:
     ```
     Authorization: Bearer [SUPABASE_ANON_KEY]
     Content-Type: application/json
     ```

### Opción 2: Servidor Propio con Cron

Si tienes un servidor Linux:

\`\`\`bash
# Editar crontab
crontab -e

# Agregar línea (cada 6 horas)
0 */6 * * * curl -X POST https://[tu-proyecto].supabase.co/functions/v1/discount-reminders -H "Authorization: Bearer [SUPABASE_ANON_KEY]" -H "Content-Type: application/json"
\`\`\`

### Opción 3: Vercel Cron Jobs

Si usas Vercel para el frontend, puedes agregar en `vercel.json`:

\`\`\`json
{
  "crons": [{
    "path": "/api/trigger-reminders",
    "schedule": "0 */6 * * *"
  }]
}
\`\`\`

Y crear el archivo `api/trigger-reminders.ts`:

\`\`\`typescript
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.headers.authorization !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      \`\${process.env.VITE_SUPABASE_URL}/functions/v1/discount-reminders\`,
      {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${process.env.VITE_SUPABASE_ANON_KEY}\`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to trigger reminders' });
  }
}
\`\`\`

## Configuración del Intervalo

El intervalo de recordatorio (48 horas por defecto) está hardcodeado en el edge function. Para hacerlo configurable:

### Actualizar el Edge Function

El edge function ya lee de la tabla `configuracion`:

\`\`\`typescript
const { data: config } = await supabase
  .from('configuracion')
  .select('valor')
  .eq('clave', 'discount_reminder_hours')
  .single();

const reminderHours = config ? parseInt(config.valor) : 48;
\`\`\`

### Cambiar el Intervalo

\`\`\`sql
UPDATE configuracion
SET valor = '24'::jsonb
WHERE clave = 'discount_reminder_hours';
\`\`\`

## Verificación

Para probar manualmente el edge function:

\`\`\`bash
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/discount-reminders \\
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \\
  -H "Content-Type: application/json"
\`\`\`

## Monitoreo

Los recordatorios se registran como notificaciones en la base de datos. Puedes verificar que están funcionando:

\`\`\`sql
SELECT * FROM notificaciones
WHERE tipo = 'RECORDATORIO_SOLICITUDES_PENDIENTES'
ORDER BY created_at DESC
LIMIT 10;
\`\`\`

## Mejores Prácticas

1. **No ejecutar muy frecuentemente**: 6-12 horas es un intervalo razonable
2. **Monitorear el uso**: Cada ejecución consume recursos de Supabase
3. **Configurar alertas**: Si el cron job falla, deberías saberlo
4. **Logs**: Revisar logs del edge function en Supabase Dashboard

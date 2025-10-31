# Sistema de Gestión de Solicitudes de Descuento - HDM

Sistema completo de gestión de presupuestos con módulo de solicitudes de descuento, aprobación administrativa, auditoría completa y generación de PDFs.

---

## 🚨 CONFIGURACIÓN DE SEGURIDAD OBLIGATORIA

**⚠️ ANTES DE USAR ESTE SISTEMA, DEBES CONFIGURAR LA SEGURIDAD:**

1. **Ve al Dashboard de Supabase** → Authentication → Policies
2. **Habilita**: "Check passwords against HaveIBeenPwned" ✅
3. **Esto es obligatorio** para prevenir contraseñas comprometidas

📄 **Instrucciones detalladas**: Ver [`SECURITY_SETUP.md`](./SECURITY_SETUP.md) y [`.bolt/security-instructions.md`](./.bolt/security-instructions.md)

---

## Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Backend**: Supabase Edge Functions
- **PDF**: jsPDF + jspdf-autotable
- **Notificaciones**: Supabase Realtime
- **Iconos**: Lucide React

## Características Principales

### 1. Gestión de Presupuestos
- Creación y edición de presupuestos
- Múltiples ítems por presupuesto
- Soporte para PYG y USD con tipo de cambio
- Cálculo automático de totales, impuestos y comisiones
- Estados: BORRADOR → PRESENTADO → ACEPTADO → FACTURADO
- Soft delete para presupuestos ANULADOS

### 2. Solicitudes de Descuento
- **Vendedores pueden**:
  - Solicitar descuentos (porcentaje o monto fijo)
  - Aplicar descuentos globales o por ítem específico
  - Justificar cada solicitud con un motivo
  - Cancelar solicitudes pendientes
  - Ver estado de sus solicitudes

- **Administradores pueden**:
  - Ver todas las solicitudes pendientes
  - Aprobar solicitudes tal cual
  - Aprobar con modificación (cambiar el valor)
  - Rechazar con comentario
  - Filtrar y buscar solicitudes

### 3. Cálculos Automáticos
- Servicio `BudgetCalculator` con lógica pura y testeable
- Recalculo automático al aprobar descuentos
- Aplicación de descuentos a nivel global o por ítem
- Actualización de totales, impuestos y comisiones

### 4. Sistema de Notificaciones
- Notificaciones en tiempo real con Supabase Realtime
- Bell icon con contador de no leídas
- Notificaciones para:
  - Nueva solicitud (admin)
  - Solicitud aprobada (vendedor)
  - Solicitud rechazada (vendedor)
  - Recordatorios de solicitudes pendientes

### 5. Auditoría Completa
- Registro de todas las acciones críticas
- Timeline visual de eventos
- Información de usuario, IP y timestamp
- Cambios before/after en formato JSON
- Solo admins pueden ver auditorías

### 6. Generación de PDFs
- PDFs profesionales con jsPDF
- Incluye todos los ítems del presupuesto
- Sección destacada si hay descuentos aprobados
- Muestra tipo, valor, fecha y aprobador
- Totales calculados correctamente
- Footer con trazabilidad

### 7. Recordatorios Automáticos
- Edge Function programable
- Envía recordatorios a admins de solicitudes pendientes
- Configurable por horas (default: 48h)
- Se ejecuta mediante cron o manualmente

## Arquitectura del Proyecto

```
src/
├── components/
│   ├── ui/               # Componentes reutilizables
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── Textarea.tsx
│   ├── discount/         # Componentes de solicitudes
│   │   ├── DiscountRequestForm.tsx
│   │   └── DiscountRequestList.tsx
│   ├── admin/            # Componentes de administrador
│   │   ├── AdminDashboard.tsx
│   │   └── ApprovalModal.tsx
│   ├── notifications/    # Sistema de notificaciones
│   │   └── NotificationCenter.tsx
│   └── audit/            # Auditoría y timeline
│       └── AuditTimeline.tsx
├── pages/
│   └── PresupuestoDetail.tsx
├── contexts/
│   └── AuthContext.tsx
├── services/
│   ├── api.ts            # Servicios de API
│   ├── budgetCalculator.ts
│   └── pdfGenerator.ts
├── lib/
│   └── supabase.ts       # Cliente Supabase
├── types/
│   ├── database.types.ts # Tipos del dominio
│   └── api.types.ts      # DTOs y respuestas
└── App.tsx

supabase/
└── functions/
    └── discount-reminders/
        └── index.ts
```

## Base de Datos

### Tablas Principales

1. **users**: Usuarios del sistema (admin, vendedor)
2. **presupuestos**: Presupuestos con totales calculados
3. **presupuesto_items**: Ítems individuales
4. **solicitudes_descuento**: Solicitudes con estado y valores
5. **auditorias**: Log de todas las acciones
6. **notificaciones**: Notificaciones del sistema
7. **configuracion**: Configuración del sistema

### Row Level Security (RLS)

- **Vendedores**: Solo acceden a sus propios presupuestos y solicitudes
- **Administradores**: Acceso completo a todos los recursos
- **Presupuestos ANULADOS**: Solo visibles para admins vía auditoría
- **Auditorías**: Solo lectura para admins

## Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` con:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 3. ⚠️ CONFIGURAR SEGURIDAD DE SUPABASE (OBLIGATORIO)

**ANTES de crear usuarios, debes configurar la seguridad en Supabase:**

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Settings**
3. **HABILITA**: "Check passwords against HaveIBeenPwned" ✅
4. **DESACTIVA**: "Enable email confirmations" (para desarrollo/testing)

**Esto es CRÍTICO**: La protección de contraseñas previene el uso de contraseñas comprometidas verificando contra bases de datos de brechas conocidas.

**Nota sobre Email**: La confirmación de email está desactivada para facilitar desarrollo. Los usuarios pueden iniciar sesión inmediatamente después de registrarse sin verificar su correo.

📄 **Para configuración completa de seguridad, consulta** [`SECURITY_SETUP.md`](./SECURITY_SETUP.md)

Este archivo incluye:
- Configuración de protección contra contraseñas filtradas (OBLIGATORIO)
- Políticas de contraseñas fuertes
- Rate limiting contra ataques de fuerza bruta
- Configuración de tokens y sesiones
- Checklist de seguridad pre-producción

### 4. Configurar Supabase

Las migraciones ya están aplicadas. Para verificar:

```bash
# Listar tablas
supabase db list

# Ver migraciones aplicadas
supabase db migrations list
```

### 5. Crear Usuarios de Prueba

En Supabase Dashboard → Authentication → Users:

1. Crear usuario administrador:
   - Email: admin@hdm.com
   - Password: (usa una contraseña segura, el sistema verificará que no esté comprometida)

2. Crear usuario vendedor:
   - Email: vendedor1@hdm.com
   - Password: (usa una contraseña segura)

**Nota**: Si la protección está habilitada, contraseñas comunes como "password123" serán rechazadas automáticamente.

Los perfiles en la tabla `users` ya están creados por el seed.

### 6. Ejecutar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 7. Configurar Recordatorios (Opcional)

La Edge Function `discount-reminders` ya está desplegada. Para programar ejecuciones automáticas:

**Opción A: Usando Supabase Cron (Recomendado)**

En tu proyecto Supabase, configura un cron job para llamar la función cada X horas.

**Opción B: Llamada Manual**

```bash
curl -X POST https://tu-proyecto.supabase.co/functions/v1/discount-reminders \
  -H "Authorization: Bearer TU_ANON_KEY"
```

**Opción C: Servicio Externo**

Usa servicios como cron-job.org o GitHub Actions para llamar la función periódicamente.

## Uso del Sistema

### Como Vendedor

1. **Iniciar Sesión**: Usa `vendedor1@hdm.com`
2. **Ver Presupuestos**: Lista de tus presupuestos
3. **Solicitar Descuento**:
   - Abre un presupuesto
   - Click en "Solicitar Descuento"
   - Selecciona tipo (% o monto)
   - Elige alcance (global o por ítem)
   - Justifica la solicitud
   - Enviar
4. **Seguimiento**: Ver estado en la pestaña "Solicitudes"
5. **Cancelar**: Puedes cancelar si está PENDIENTE

### Como Administrador

1. **Iniciar Sesión**: Usa `admin@hdm.com`
2. **Panel de Aprobación**: Ver todas las solicitudes pendientes
3. **Revisar Solicitud**: Click en cualquier solicitud
4. **Decidir**:
   - **Aprobar**: Acepta el valor propuesto
   - **Modificar**: Cambia el valor y aprueba
   - **Rechazar**: Con comentario obligatorio
5. **Notificación**: El vendedor recibe notificación inmediata
6. **PDF**: Descargar presupuesto con descuento aplicado

### Generación de PDFs

```typescript
// En cualquier componente
import { PDFGenerator } from '../services/pdfGenerator';

// Descargar PDF
PDFGenerator.downloadPresupuestoPDF(presupuesto, solicitudAprobada);

// Vista previa en nueva pestaña
PDFGenerator.previewPresupuestoPDF(presupuesto, solicitudAprobada);
```

## Flujo de Aprobación

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Vendedor solicita descuento                              │
│    Estado: PENDIENTE                                        │
│    Notifica: Administradores                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Administrador revisa                                     │
│    Opciones: Aprobar / Modificar / Rechazar                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────┼────────┐
         │        │        │
         ▼        ▼        ▼
    ┌────────┐ ┌─────────┐ ┌──────────┐
    │APROBADO│ │APROBADO │ │RECHAZADO │
    │        │ │MODIFICADO│ │          │
    └────────┘ └─────────┘ └──────────┘
         │        │            │
         └────────┴────────────┘
                  │
                  ▼
    ┌──────────────────────────┐
    │ 3. Aplicar cambios       │
    │    - Recalcular totales  │
    │    - Actualizar DB       │
    │    - Registrar auditoría │
    │    - Notificar vendedor  │
    └──────────────────────────┘
```

## Cálculos de Presupuestos

### Fórmulas

```
Total Bruto = Σ(cantidad × precio_unitario)

Total Descuento = descuento_global + Σ(descuentos_por_item)

Total Neto = Total Bruto - Total Descuento

Total Impuestos = Total Neto × (tasa_impuesto / 100)

Total Comisiones = Total Neto × (tasa_comision / 100)

TOTAL FINAL = Total Neto + Total Impuestos
```

### Validaciones

- Descuentos porcentuales: 0% ≤ valor ≤ 100%
- Descuentos en monto: 0 ≤ valor ≤ total del ítem/presupuesto
- Total Neto nunca puede ser negativo

## Seguridad

### Políticas RLS Implementadas

- **Aislamiento de datos**: Vendedores solo ven sus recursos
- **Validación de permisos**: Todas las operaciones verifican rol
- **Presupuestos anulados**: Ocultos para vendedores
- **Auditoría protegida**: Solo lectura para admins
- **Integridad referencial**: Foreign keys con acciones apropiadas

### Validaciones

- Frontend: Validación inmediata de formularios
- Backend: RLS + Constraints de base de datos
- Edge Functions: Verificación de autenticación

## Testing (Recomendaciones)

```bash
# Instalar dependencias de testing
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e
```

### Casos de Prueba Sugeridos

1. **BudgetCalculator**:
   - Descuento 0%
   - Descuento 100%
   - Descuento > total (debe fallar)
   - Valores negativos (debe fallar)
   - Conversión de monedas

2. **Flujo de Aprobación**:
   - Vendedor crea solicitud → Admin aprueba → Totales recalculados
   - Vendedor crea → Admin rechaza → Estado rechazado
   - Vendedor crea → Admin modifica → Nuevo valor aplicado
   - Vendedor intenta aprobar (debe fallar)

3. **Notificaciones**:
   - Crear solicitud → Admin recibe notificación
   - Aprobar solicitud → Vendedor recibe notificación

4. **PDF**:
   - Generar sin descuentos
   - Generar con descuento aprobado
   - Verificar valores correctos

## Troubleshooting

### Error: "Missing Supabase environment variables"

- Verifica que `.env` exista y tenga las variables correctas
- Reinicia el servidor de desarrollo

### Error: RLS Policy Violation

- Verifica que el usuario tenga el rol correcto
- Revisa las políticas RLS en Supabase Dashboard

### Notificaciones no llegan en tiempo real

- Verifica que Supabase Realtime esté habilitado
- Revisa la consola del navegador para errores de conexión

### PDFs no se generan correctamente

- Verifica que jsPDF esté instalado: `npm list jspdf`
- Revisa la consola para errores de rendering

## Mejoras Futuras

- [ ] Tests unitarios y E2E completos
- [ ] Internacionalización (i18n)
- [ ] Exportar a Excel
- [ ] Dashboard con gráficos de estadísticas
- [ ] Envío de PDFs por email
- [ ] Firma digital de presupuestos
- [ ] Objetivos y metas por vendedor
- [ ] Integracion con ERP externo
- [ ] App móvil (React Native)

## Soporte

Para soporte o preguntas:
- Email: dev@hdm.com
- Documentación: https://docs.hdm.com

## Licencia

Propiedad de HDM. Todos los derechos reservados.

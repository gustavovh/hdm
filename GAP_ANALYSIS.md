# Análisis de Brecha (GAP Analysis)
## Sistema HDM vs Relevamiento Oficial

**Fecha:** 04/11/2025
**Estado del Análisis:** Completado

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Completitud | Estado |
|-----------|-------------|--------|
| **Módulo Presupuestos** | 70% | 🟡 Parcial |
| **Sistema de Descuentos** | 100% | 🟢 Completo |
| **Catálogo de Productos** | 0% | 🔴 Faltante |
| **Reportes y Dashboards** | 85% | 🟢 Casi Completo |
| **Estados y Workflow** | 95% | 🟢 Casi Completo |
| **Comisiones** | 100% | 🟢 Completo |
| **Auditoría** | 100% | 🟢 Completo |
| **Seguridad y Permisos** | 100% | 🟢 Completo |
| **PDFs e Impresión** | 60% | 🟡 Parcial |
| **TOTAL GENERAL** | **78%** | 🟡 **Parcial** |

---

## ✅ FUNCIONALIDADES COMPLETAMENTE IMPLEMENTADAS

### 1. Sistema de Descuentos (100%)
- ✅ Solicitudes con tipo (Porcentaje/Monto)
- ✅ Alcance (Global/Item)
- ✅ Aprobación/Rechazo/Modificación
- ✅ Recálculo automático
- ✅ Validaciones completas
- ✅ Auditoría de cambios

### 2. Estados del Presupuesto (95%)
- ✅ BORRADOR
- ✅ PRESENTADO
- ✅ ACEPTADO
- ✅ FACTURADO (con campos completos)
- ✅ ANULADO
- ✅ Transiciones validadas
- ⚠️ **FALTA:** Pasaje automático PRESENTADO→ANULADO a 30 días

### 3. Datos de Facturación (100%)
- ✅ Número de factura
- ✅ Fecha de facturación
- ✅ Monto facturado
- ✅ Condición de pago
- ✅ Medio de pago
- ✅ Enlace al comprobante

### 4. Auditoría Completa (100%)
- ✅ Registro de todas las acciones
- ✅ Before/After en cambios
- ✅ Usuario, IP, User-Agent
- ✅ Timeline visual
- ✅ Histórico exportable

### 5. Sistema de Comisiones (100%)
- ✅ Tramos configurables
- ✅ Objetivos por vendedor
- ✅ Cálculo automático mensual
- ✅ % sobre cumplimiento
- ✅ Reportes de comisiones

### 6. Notificaciones (100%)
- ✅ Centro de notificaciones
- ✅ Notificaciones en BD
- ✅ Emails con templates HTML
- ✅ Integración con Resend

### 7. Recordatorios (100%)
- ✅ Edge function implementado
- ✅ Configurable por período
- ✅ Documentación completa
- ✅ Múltiples opciones de scheduler

### 8. Seguridad y Permisos (100%)
- ✅ RLS habilitado
- ✅ Roles Admin/Vendedor
- ✅ Políticas restrictivas
- ✅ Estado ANULADO solo visible para admin

### 9. Reportes Admin (85%)
- ✅ Métricas clave
- ✅ Tasas de conversión
- ✅ Top vendedores
- ✅ Totales por estado
- ⚠️ **FALTA:** Gráficos por vendedor comparativos

### 10. Tests (100%)
- ✅ 28 tests unitarios
- ✅ BudgetCalculator completo
- ✅ Vitest configurado

---

## 🔴 FUNCIONALIDADES CRÍTICAS FALTANTES

### 1. Campo "Concepto" en Presupuesto (CRÍTICO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.1.1
**Descripción:** Campo texto para título/propósito del presupuesto

**Impacto:** ALTO - Es un campo básico solicitado explícitamente

**Implementación Requerida:**
```typescript
// En database.types.ts - Presupuesto interface
concepto: string; // Campo requerido

// En migraciones
ALTER TABLE presupuestos ADD COLUMN concepto text NOT NULL DEFAULT '';
```

---

### 2. Módulo Catálogo de Productos (CRÍTICO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.2
**Descripción:** Sistema completo de gestión de productos/servicios

**Impacto:** CRÍTICO - Es un módulo completo del sistema

**Componentes Faltantes:**
- ❌ Tabla `productos` en BD
- ❌ CRUD de productos
- ❌ Categorías de productos
- ❌ SKU/Código
- ❌ Precios e impuestos
- ❌ Estado activo/inactivo
- ❌ Integración con presupuestos
- ❌ Alta rápida desde presupuesto (4.1.5)

**Estructura BD Requerida:**
```sql
CREATE TABLE categorias (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  activo boolean DEFAULT true
);

CREATE TABLE productos (
  id uuid PRIMARY KEY,
  sku text UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  categoria_id uuid REFERENCES categorias(id),
  tipo text CHECK (tipo IN ('producto', 'servicio')),
  precio_base decimal(14,2) NOT NULL,
  unidad text,
  tasa_impuesto decimal(5,2),
  activo boolean DEFAULT true,
  imagen_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### 3. Clonar Presupuestos (CRÍTICO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.1.2
**Descripción:** Duplicar presupuesto completo

**Impacto:** ALTO - Funcionalidad clave para eficiencia

**Implementación Requerida:**
```typescript
// En PresupuestoService
static async clone(presupuestoId: string): Promise<Presupuesto> {
  // 1. Obtener presupuesto original con ítems
  // 2. Crear nuevo presupuesto con datos copiados
  // 3. Copiar ítems
  // 4. Estado = BORRADOR
  // 5. Fecha actual
  // 6. Nuevo código/consecutivo
}
```

**UI Requerida:**
- Botón "Clonar" en lista y detalle
- Confirmación antes de clonar
- Redirección al nuevo presupuesto

---

### 4. Plantillas de Presupuesto (ALTO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.1.3
**Descripción:** Plantillas predefinidas con campos e ítems

**Impacto:** ALTO - Mejora significativa de productividad

**Componentes Faltantes:**
- ❌ Tabla `plantillas_presupuesto`
- ❌ CRUD de plantillas
- ❌ Selección al crear presupuesto
- ❌ Pre-carga de datos

**Estructura BD Requerida:**
```sql
CREATE TABLE plantillas_presupuesto (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  items jsonb, -- Array de items predefinidos
  configuracion jsonb, -- Tasas, moneda, etc.
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

### 5. Adjuntar Imágenes (ALTO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.1.4
**Descripción:** Imágenes generales y por producto

**Impacto:** ALTO - Presupuestos más profesionales

**Componentes Faltantes:**
- ❌ Storage de Supabase configurado
- ❌ Upload de imágenes
- ❌ Vista previa en UI
- ❌ Imágenes en PDF
- ❌ Relación imagen-presupuesto
- ❌ Relación imagen-producto

**Estructura BD Requerida:**
```sql
CREATE TABLE presupuesto_imagenes (
  id uuid PRIMARY KEY,
  presupuesto_id uuid REFERENCES presupuestos(id),
  item_id uuid REFERENCES presupuesto_items(id), -- NULL si es general
  url text NOT NULL,
  tipo text CHECK (tipo IN ('general', 'producto')),
  orden integer,
  created_at timestamptz DEFAULT now()
);
```

---

### 6. Vista Preliminar de Impresión Corporativa (CRÍTICO)
**Estado:** ⚠️ PARCIAL (60%)
**Requerimiento:** 4.1.16
**Descripción:** Template corporativo con logo y formato

**Lo que ESTÁ:**
- ✅ Generación de PDF básico
- ✅ Contenido del presupuesto
- ✅ Descarga de PDF

**Lo que FALTA:**
- ❌ Logo de la empresa configurable
- ❌ Encabezado corporativo
- ❌ Pie de página con condiciones
- ❌ Vista previa antes de descargar
- ❌ Configuración de plantilla por admin
- ❌ Estilo visual personalizado

**Implementación Requerida:**
```typescript
// Nueva tabla
CREATE TABLE configuracion_pdf (
  id uuid PRIMARY KEY,
  logo_url text,
  encabezado jsonb,
  pie_pagina jsonb,
  estilos jsonb,
  activo boolean DEFAULT true
);

// Componente PreviewModal
<PreviewModal>
  <PDFPreview presupuesto={} config={} />
  <Actions>
    <Button>Descargar</Button>
    <Button>Guardar</Button>
    <Button>Clonar</Button>
  </Actions>
</PreviewModal>
```

---

### 7. Dashboard del Vendedor (MEDIO)
**Estado:** ⚠️ PARCIAL (40%)
**Requerimiento:** 4.3
**Descripción:** Dashboard específico con KPIs propios

**Lo que ESTÁ:**
- ✅ Acceso a lista de presupuestos
- ✅ Ver detalles propios

**Lo que FALTA:**
- ❌ Dashboard dedicado para vendedor
- ❌ KPIs personales
- ❌ Gráficos de evolución
- ❌ Recordatorios próximos
- ❌ Tasa de aceptación
- ❌ Monto promedio
- ❌ Avance vs objetivo personal

---

### 8. Pasaje Automático PRESENTADO→ANULADO (MEDIO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.1.13 + 6.2
**Descripción:** A 30 días sin aceptación

**Impacto:** MEDIO - Automatización del workflow

**Implementación Requerida:**
```typescript
// Edge Function: auto-anular-presentados
// Cron Job diario
// Buscar presentados > 30 días
// Cambiar a ANULADO
// Notificar vendedor y admin
```

---

### 9. Gráficos por Vendedor (Admin) (MEDIO)
**Estado:** ❌ NO implementado
**Requerimiento:** 4.1.15
**Descripción:** Comparativos entre vendedores

**Impacto:** MEDIO - Análisis gerencial

**Componentes Faltantes:**
- ❌ Gráfico de ranking
- ❌ Avance vs objetivo por vendedor
- ❌ Comparativa temporal
- ❌ Proyecciones

---

### 10. Recordatorios de Workflow (MEDIO)
**Estado:** ⚠️ PARCIAL (60%)
**Requerimiento:** 4.1.14 + 6.3
**Descripción:** Alertas por estado y tiempo

**Lo que ESTÁ:**
- ✅ Recordatorios de solicitudes pendientes

**Lo que FALTA:**
- ❌ Alerta en Presentado sin respuesta (día 3, 7, 14, 28)
- ❌ Alerta en Aceptado para facturar
- ❌ Alerta en Facturado para seguimiento
- ❌ Configuración de tiempos

---

### 11. Dolarización Completa (BAJO)
**Estado:** ⚠️ PARCIAL (70%)
**Requerimiento:** 4.1.7
**Descripción:** Visualización y cálculos en USD

**Lo que ESTÁ:**
- ✅ Campo moneda (PYG/USD)
- ✅ Tipo de cambio
- ✅ Conversión en BudgetCalculator

**Lo que FALTA:**
- ❌ Toggle para ver en USD/PYG
- ❌ Fuente automática de tipo cambio
- ❌ Vista dual en reportes

---

## 📋 LISTADO PRIORIZADO DE IMPLEMENTACIÓN

### 🔴 PRIORIDAD CRÍTICA (Bloqueantes)

1. **Campo "Concepto"** - 1 hora
   - Migración BD
   - Actualizar tipos
   - Agregar a formularios

2. **Módulo Catálogo Completo** - 3-4 días
   - Tablas BD (productos, categorías)
   - CRUD productos
   - Integración con presupuestos
   - Alta rápida desde presupuesto

3. **Clonar Presupuestos** - 4 horas
   - Servicio de clonación
   - Botones en UI
   - Confirmación

4. **Vista Preliminar de Impresión** - 2 días
   - Configuración de plantilla
   - Logo y formato corporativo
   - Modal de preview
   - Botones descargar/guardar/clonar

### 🟡 PRIORIDAD ALTA (Importantes)

5. **Plantillas de Presupuesto** - 1 día
   - Tabla BD
   - CRUD plantillas
   - Selector al crear

6. **Sistema de Imágenes** - 2 días
   - Storage configuración
   - Upload component
   - Vista previa
   - Integración en PDF

7. **Dashboard del Vendedor** - 1 día
   - Componente dedicado
   - KPIs personales
   - Gráficos

### 🟢 PRIORIDAD MEDIA (Deseables)

8. **Auto-anulación 30 días** - 4 horas
   - Edge function
   - Cron job
   - Notificaciones

9. **Gráficos por Vendedor (Admin)** - 1 día
   - Componentes visuales
   - Queries de comparación

10. **Recordatorios Avanzados** - 1 día
    - Edge functions por estado
    - Configuración de tiempos

11. **Dolarización Completa** - 4 horas
    - Toggle UI
    - Fuente de cambio

---

## 📊 MÉTRICAS DE COMPLETITUD POR MÓDULO

```
Presupuestos Core:     ████████░░ 80%
Catálogo:              ░░░░░░░░░░  0%
Descuentos:            ██████████ 100%
Estados/Workflow:      █████████░ 95%
Facturación:           ██████████ 100%
Comisiones:            ██████████ 100%
Reportes Admin:        ████████░░ 85%
Dashboard Vendedor:    ████░░░░░░ 40%
PDFs:                  ██████░░░░ 60%
Imágenes:              ░░░░░░░░░░  0%
Plantillas:            ░░░░░░░░░░  0%
Auditoría:             ██████████ 100%
Seguridad:             ██████████ 100%
Tests:                 ██████████ 100%
```

---

## 🎯 ESTIMACIÓN DE TIEMPO TOTAL

| Prioridad | Tiempo Estimado |
|-----------|-----------------|
| Crítica   | 7-8 días |
| Alta      | 4 días |
| Media     | 2.5 días |
| **TOTAL** | **13-14 días** |

---

## 💡 RECOMENDACIONES

### Fase 1 - Críticos (1 semana)
1. Campo Concepto
2. Clonar presupuestos
3. Módulo Catálogo básico
4. Vista preliminar corporativa

### Fase 2 - Importantes (1 semana)
5. Plantillas
6. Sistema de imágenes
7. Dashboard vendedor

### Fase 3 - Mejoras (3-4 días)
8. Auto-anulación
9. Gráficos comparativos
10. Recordatorios avanzados
11. Dolarización completa

---

## ✅ CONCLUSIÓN

El sistema tiene **78% de completitud** con excelentes bases:
- ✅ Core de descuentos perfecto
- ✅ Seguridad robusta
- ✅ Comisiones avanzadas
- ✅ Auditoría completa

**Principales gaps:**
- ❌ Catálogo de productos (0%)
- ❌ Plantillas e imágenes (0%)
- ⚠️ Vista preliminar corporativa (60%)
- ⚠️ Dashboard vendedor (40%)

**Tiempo para completar 100%:** 2-3 semanas de desarrollo.

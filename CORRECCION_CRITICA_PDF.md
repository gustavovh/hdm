# CORRECCIÓN CRÍTICA: Superposición en PDFs

## ❌ PROBLEMA RAÍZ IDENTIFICADO

### Superposición de Contenido en Páginas Adicionales
**Causa REAL:** La tabla NO reservaba espacio superior para el header en páginas adicionales.

**Explicación del Flujo:**
1. autoTable calcula dónde dibujar la tabla
2. En páginas adicionales, comienza en `yTop = margin` (20mm desde arriba)
3. Dibuja toda la tabla
4. DESPUÉS ejecuta `didDrawPage` callback
5. `didDrawPage` dibuja header (logo + servicios + contacto) en yTop = 20mm
6. **Resultado:** Header se dibuja ENCIMA de la tabla ya renderizada

**La Solución Correcta:**
```typescript
margin: {
  left: margin,
  right: margin,
  top: 50,     // ← CRÍTICO: Espacio para header en páginas adicionales
  bottom: 50,  // Espacio para footer
}
```

Esto obliga a autoTable a comenzar la tabla en yTop = 50mm en todas las páginas, dejando espacio libre arriba para que `didDrawPage` dibuje el header sin superposición.

## ✅ IMPLEMENTACIÓN CORRECTA

### 1. Pre-carga de Logo
```typescript
async function preloadLogo(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  // Carga el logo UNA VEZ antes de crear la tabla
  // Retorna dataUrl + dimensiones para uso sincrónico en didDrawPage
}
```

### 2. Uso del Logo Pre-cargado
```typescript
const preloadedLogo = await preloadLogo();
yPosition = await addItemsTable(doc, margin, yPosition, pageWidth, presupuesto, preloadedLogo);
```

### 3. Callback Sincrónico con Margen Superior
```typescript
autoTable(doc, {
  startY: yPosition,
  margin: {
    left: margin,
    right: margin,
    top: 50,    // ← Reserva espacio para header
    bottom: 50,
  },
  didDrawPage: (data) => {  // ← Sincrónico (NO async)
    if (data.pageNumber > 1) {
      // Dibuja header usando preloadedLogo (ya en memoria)
      const scaledH = LOGO_WIDTH_MM * (preloadedLogo.height / preloadedLogo.width);
      doc.addImage(preloadedLogo.dataUrl, 'PNG', leftMargin, yTop, LOGO_WIDTH_MM, scaledH);
      // ... servicios, contacto, número
    }
  }
});
```

### 4. Cálculo del Espacio del Header
- Logo: ~13mm (50mm ancho × aspect ratio)
- Gap después del logo: 8mm
- Servicios (3 líneas): 12mm (3 × 4mm)
- Gap adicional: 7mm
- **Total: ~40mm** → Usamos **50mm** para margen de seguridad

## 🛡️ REGLAS ABSOLUTAS

### REGLA 1: SIEMPRE usar `margin.top` en autoTable
```typescript
margin: {
  top: 50,  // NO OMITIR - Previene superposición
}
```

### REGLA 2: Logo SIEMPRE 50mm de ancho
```typescript
const LOGO_WIDTH_MM = 50;  // CONSTANTE - NO MODIFICAR
```

### REGLA 3: Pre-cargar logo antes de autoTable
```typescript
const preloadedLogo = await preloadLogo();
// ... luego usar en didDrawPage
```

### REGLA 4: didDrawPage SIEMPRE sincrónico
```typescript
// ❌ MAL - Async se ejecuta después del render
didDrawPage: async (data) => { ... }

// ✅ BIEN - Sincrónico se ejecuta durante el render
didDrawPage: (data) => { ... }
```

## 📏 CONSTANTES FINALES

```typescript
// Archivo: pdfGeneratorHDMStandard.ts

const LOGO_WIDTH_MM = 50;        // Ancho fijo del logo
const BOTTOM_MARGIN = 20;        // Margen inferior de página
const SAFE_FOOTER_ZONE = 25;     // Zona protegida para footer

// Configuración de autoTable
margin: {
  left: 20,
  right: 20,
  top: 50,     // Espacio para header en páginas adicionales
  bottom: 50,  // Espacio para footer
}
```

## ✅ RESULTADO ESPERADO

Después de estos cambios:
- ✅ Cero superposiciones en todas las páginas
- ✅ Logo 50mm ancho con aspect ratio correcto
- ✅ Header completo en TODAS las páginas adicionales
- ✅ Tabla comienza DESPUÉS del header (yTop = 50mm)
- ✅ Footer protegido en todas las páginas

## 🔧 VERIFICACIÓN

Para verificar que funciona:
1. Crear presupuesto con muchos ítems (para forzar múltiples páginas)
2. Generar PDF
3. Verificar página 2 y siguientes:
   - Logo visible en parte superior
   - Servicios visibles debajo del logo
   - Contacto visible en esquina superior derecha
   - Número de presupuesto visible
   - **Tabla comienza DEBAJO de todo lo anterior (sin superposición)**

---

**ÚLTIMA ACTUALIZACIÓN:** 2025-12-05
**CAUSA RAÍZ:** Falta de `margin.top` en configuración de autoTable
**SOLUCIÓN:** Agregado `margin: { top: 50 }` para reservar espacio para header

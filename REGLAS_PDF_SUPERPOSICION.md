# REGLAS ABSOLUTAS PARA EVITAR SUPERPOSICIONES EN PDFs

## ⚠️ REGLA DE ORO: NUNCA JAMÁS PERMITIR SUPERPOSICIONES

Esta regla es ABSOLUTA e INQUEBRANTABLE. NINGÚN contenido debe superponerse sobre:
- El encabezado (header)
- El pie de página (footer)  
- El logo
- Cualquier otro elemento del documento

## 📐 CONSTANTES OBLIGATORIAS

```typescript
const PAGE_HEIGHT = 297; // A4 en mm
const BOTTOM_MARGIN = 30;
const SAFE_FOOTER_ZONE = 60; // Zona de seguridad antes del footer
const CONTENT_MAX_Y = PAGE_HEIGHT - BOTTOM_MARGIN - SAFE_FOOTER_ZONE;
```

## 🛡️ VERIFICACIÓN ANTES DE AGREGAR CONTENIDO

SIEMPRE verificar espacio disponible:

```typescript
if (yPosition + requiredSpace > CONTENT_MAX_Y) {
  doc.addPage();
  yPosition = reiniciar_despues_header;
}
```

## ✅ ESPACIOS REQUERIDOS

- Línea de texto: 6mm
- Párrafo: 20mm
- Firma completa: 50mm
- Tabla: margen bottom de 90mm
- Imagen: calcular altura + 20mm

## 🚨 APLICAR EN AUTOTABLE

```typescript
margin: {
  bottom: 90 // CRÍTICO: evita que tabla invada footer
}
```

# REGLAS ABSOLUTAS ANTI-SUPERPOSICIÓN EN PDFs

## ⚠️ REGLA DE ORO: CERO SUPERPOSICIONES

**NUNCA** debe haber superposición de contenido sobre:
1. El pie de página (footer)
2. El logo del encabezado
3. Cualquier otro elemento

## 📐 CONSTANTES OPTIMIZADAS

```typescript
const BOTTOM_MARGIN = 20;        // Margen inferior de la página
const SAFE_FOOTER_ZONE = 25;     // Zona de seguridad antes del footer
const CONTENT_MAX_Y = pageHeight - BOTTOM_MARGIN - SAFE_FOOTER_ZONE;
```

**Total de zona protegida: 45mm desde el borde inferior**

## 🛡️ VERIFICACIONES OBLIGATORIAS

### 1. Tablas (autoTable)
```typescript
margin: {
  bottom: 50, // Zona de seguridad para footer
}
```

### 2. Firma
```typescript
const signatureHeight = 45;
if (yPosition + signatureHeight > CONTENT_MAX_Y) {
  doc.addPage();
  await addHeader(doc, margin, margin, pageWidth);
  yPosition = headerEndY + 10;
}
```

### 3. Observaciones
```typescript
const MIN_SPACE_FOR_CONTENT = 30;
if (yPosition > CONTENT_MAX_Y - MIN_SPACE_FOR_CONTENT) {
  doc.addPage();
  yPosition = margin + 10;
}
```

### 4. Texto Línea por Línea
```typescript
if (yPosition + 6 > CONTENT_MAX_Y) {
  doc.addPage();
  yPosition = margin + 10;
}
```

## ✅ MÁXIMAS DE DISEÑO

1. **Aprovechar espacio disponible**: La zona protegida es mínima pero suficiente
2. **Agregar encabezado en páginas nuevas**: SIEMPRE que se cree una página
3. **NO modificar tamaño del logo**: Las dimensiones del logo son fijas
4. **Espacio prudencial**: Dejar margen de 10-15mm después del encabezado

## 🚨 PROHIBICIONES ABSOLUTAS

❌ NO aumentar SAFE_FOOTER_ZONE más de 30mm (desperdicia espacio)
❌ NO modificar dimensiones del logo del encabezado
❌ NO omitir encabezado en páginas secundarias
❌ NO usar márgenes inferiores de tabla mayores a 50mm

---

**Estas reglas garantizan PDFs perfectos sin superposiciones y con uso óptimo del espacio.**

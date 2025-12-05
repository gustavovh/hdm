# CORRECCIÓN CRÍTICA: Superposición en PDFs

## ❌ PROBLEMAS IDENTIFICADOS

### 1. Superposición de Contenido en Página 2
**Causa:** El callback `didDrawPage` de autoTable era `async`, lo que causaba que:
- El header se agregaba DESPUÉS de que la tabla se dibujaba
- La tabla se superponía sobre el logo y la información de contacto

**Solución:** 
- Pre-cargar el logo ANTES de crear la tabla
- Usar callback SINCRÓNICO en `didDrawPage`
- Agregar header con logo pre-cargado en memoria

### 2. Logo Más Pequeño de lo Esperado
**Causa:** Configuración incorrecta del tamaño:
```typescript
// ❌ INCORRECTO
const TARGET_H = 15;  // altura objetivo
scaledH = TARGET_H;
scaledW = TARGET_H * aspect;
```

**Solución:**
```typescript
// ✅ CORRECTO
const LOGO_WIDTH_MM = 50;  // TAMAÑO FIJO - NO MODIFICAR
scaledW = LOGO_WIDTH_MM;
scaledH = LOGO_WIDTH_MM * aspect;  // Alto proporcional
```

### 3. Espacio Excesivo en Blanco
**Causa:** Zona de seguridad exageradamente grande (90mm de margen inferior)

**Solución:** Optimización a 50mm, suficiente para evitar superposiciones

## ✅ CORRECCIONES IMPLEMENTADAS

### 1. Pre-carga de Logo
```typescript
async function preloadLogo(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  // Carga el logo una sola vez antes de la tabla
  // Retorna dataUrl + dimensiones para uso sincrónico
}
```

### 2. Callback Sincrónico en didDrawPage
```typescript
didDrawPage: (data) => {  // NO async!
  if (currentPage > 1) {
    // Usa preloadedLogo (ya en memoria)
    doc.addImage(preloadedLogo.dataUrl, ...);
    // Agrega servicios y contacto
    // Agrega número de presupuesto
  }
}
```

### 3. Tamaño de Logo Fijo
- **Ancho:** 50mm (CONSTANTE - NO MODIFICAR)
- **Alto:** Calculado según aspect ratio real de la imagen
- Preserva proporciones originales

### 4. Optimización de Espacios
- Margen inferior de tabla: 50mm (antes 90mm)
- Zona de seguridad footer: 25mm (antes 60mm)
- Total protegido: 45mm (suficiente y óptimo)

## 🛡️ POLÍTICA DE EJECUCIÓN

### REGLA ABSOLUTA: NUNCA Modificar Tamaño del Logo
```typescript
const LOGO_WIDTH_MM = 50;  // TAMAÑO FIJO - NO MODIFICAR
```

### REGLA ABSOLUTA: SIEMPRE Agregar Header en Páginas Adicionales
El `didDrawPage` DEBE:
1. Verificar si `currentPage > 1`
2. Agregar logo, servicios, contacto y número
3. Usar logo PRE-CARGADO (sincrónico)

### REGLA ABSOLUTA: Callbacks de autoTable NUNCA Async
```typescript
// ❌ MAL
didDrawPage: async (data) => {
  await addHeader(...);  // Se ejecuta DESPUÉS del dibujo
}

// ✅ BIEN
didDrawPage: (data) => {
  doc.addImage(preloadedLogo.dataUrl, ...);  // Sincrónico
}
```

## 📏 CONSTANTES OPTIMIZADAS

```typescript
// Zona protegida para footer
const BOTTOM_MARGIN = 20;
const SAFE_FOOTER_ZONE = 25;
const CONTENT_MAX_Y = pageHeight - BOTTOM_MARGIN - SAFE_FOOTER_ZONE;

// Logo (TAMAÑO FIJO)
const LOGO_WIDTH_MM = 50;  // NO MODIFICAR

// Margen de tabla
margin: {
  bottom: 50,  // Suficiente para evitar superposición
}
```

## ✅ RESULTADO FINAL

- ✅ Cero superposiciones en todas las páginas
- ✅ Logo con tamaño correcto (50mm ancho)
- ✅ Header presente en TODAS las páginas
- ✅ Uso óptimo del espacio disponible
- ✅ Zona de seguridad adecuada para footer

---

**IMPORTANTE:** No modificar estas configuraciones sin documentar el motivo y validar que NO se introduzcan superposiciones.

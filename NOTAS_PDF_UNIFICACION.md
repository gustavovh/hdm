# Notas de Unificación de PDFs

## Resumen del Problema

Al visualizar el presupuesto en la app se muestra correctamente, pero cuando se descarga el PDF el resultado queda "deformado" (logo/elementos con tamaño incorrecto). Esto se debe a:

1. **Inconsistencia entre vista previa y descarga**: Algunos generadores usan `doc.save(...)` directamente mientras que la vista previa usa `output('blob')` -> `URL.createObjectURL()` -> `window.open()`.
2. **Dimensiones incorrectas en imágenes**: Se pasan dimensiones en píxeles como si fueran milímetros, o no se preserva el aspect ratio correctamente.
3. **Imágenes no completamente cargadas**: En algunos casos las imágenes no terminan de cargarse antes de generar el PDF.

## Solución Implementada

### Archivos Modificados (este PR)

1. **src/services/pdfGenerator.ts** ✅
2. **src/services/pdfGeneratorHDM.ts** ✅
3. **src/services/pdfGeneratorHDMStandard.ts** ✅

### Cambios Principales

#### 1. Helpers Reutilizables

**`loadImageAsBase64WithSize(url: string)`**
```typescript
// Carga una imagen y devuelve { dataUrl, width, height }
// - Incluye logs de debug para facilitar troubleshooting
// - Manejo robusto de errores
// - Retorna dimensiones reales en píxeles de la imagen
```

**`calcHeightMmFromWidthMm(widthPx, heightPx, targetWidthMm)`**
```typescript
// Calcula la altura en mm a partir de un ancho objetivo en mm
// - Preserva el aspect ratio de la imagen original
// - Incluye logs para debugging
// - Asegura que las dimensiones en el PDF sean correctas
```

#### 2. Descarga Unificada (Blob-based)

**Antes:**
```typescript
static async downloadPresupuestoPDF(...) {
  const doc = await this.generatePresupuestoPDF(...);
  doc.save(`presupuesto-${presupuesto.codigo}.pdf`); // ❌ No garantiza consistencia
}
```

**Después:**
```typescript
static async downloadPresupuestoPDF(...) {
  const doc = await this.generatePresupuestoPDF(...);
  const blob = doc.output('blob'); // ✅ Mismo blob que preview
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `presupuesto-${presupuesto.codigo}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

**Beneficio:** La vista previa y la descarga usan exactamente el mismo blob, garantizando que sean idénticos.

#### 3. Dimensiones Correctas en Imágenes

**Antes:**
```typescript
// ❌ Usa dimensiones fijas que pueden deformar la imagen
const signatureWidth = 40;
const signatureHeight = 20;
doc.addImage(signatureBase64, 'PNG', xPos, yPosition, signatureWidth, signatureHeight);
```

**Después:**
```typescript
// ✅ Calcula dimensiones preservando aspect ratio
const signature = await this.loadImageAsBase64WithSize(signatureUrl);
const signatureWidthMm = 40; // ancho objetivo en mm
const signatureHeightMm = this.calcHeightMmFromWidthMm(
  signature.width,
  signature.height,
  signatureWidthMm
);
doc.addImage(signature.dataUrl, 'PNG', xPos, yPosition, signatureWidthMm, signatureHeightMm);
```

## Archivos Pendientes (PR Futuro)

### 1. src/services/pdfGeneratorHDMv2.ts

**Acciones Necesarias:**
- [ ] Añadir helpers `loadImageAsBase64WithSize` y `calcHeightMmFromWidthMm`
- [ ] Actualizar `downloadPresupuestoPDF` para usar blob-based download
- [ ] Revisar todas las llamadas a `doc.addImage` para usar dimensiones calculadas en mm
- [ ] Añadir logs de debug

**Líneas específicas a revisar:**
- Línea ~XXX: `doc.save(...)` - Reemplazar con blob-based download
- Buscar todos los `doc.addImage` y verificar dimensiones

### 2. src/services/pdfGeneratorCorporate.ts

**Acciones Necesarias:**
- [ ] Añadir helpers `loadImageAsBase64WithSize` y `calcHeightMmFromWidthMm`
- [ ] Actualizar `downloadPresupuestoPDF` para usar blob-based download
- [ ] Revisar todas las llamadas a `doc.addImage` para usar dimensiones calculadas en mm
- [ ] Añadir logs de debug

**Líneas específicas a revisar:**
- Buscar `doc.save(...)` - Reemplazar con blob-based download
- Buscar todos los `doc.addImage` y verificar dimensiones

## Patrón de Migración

Para migrar cualquier generador de PDF, seguir estos pasos:

### Paso 1: Añadir Helpers

```typescript
/**
 * Carga una imagen y devuelve su dataUrl con dimensiones en píxeles
 */
private static async loadImageAsBase64WithSize(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    console.debug(`[GENERATOR_NAME] Loading image: ${url}`);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[GENERATOR_NAME] Failed to get canvas context');
          return reject(new Error('Failed to get canvas context'));
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        console.debug(`[GENERATOR_NAME] Image loaded successfully: ${img.width}x${img.height}px`);
        resolve({ dataUrl, width: img.width, height: img.height });
      } catch (error) {
        console.error('[GENERATOR_NAME] Error processing image:', error);
        reject(error);
      }
    };
    img.onerror = (error) => {
      console.error('[GENERATOR_NAME] Failed to load image:', url, error);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
}

/**
 * Calcula la altura en mm a partir de un ancho objetivo en mm, preservando el aspect ratio
 */
private static calcHeightMmFromWidthMm(
  widthPx: number,
  heightPx: number,
  targetWidthMm: number
): number {
  const aspectRatio = heightPx / widthPx;
  const heightMm = targetWidthMm * aspectRatio;
  console.debug(`[GENERATOR_NAME] Calculated dimensions: ${targetWidthMm}mm x ${heightMm.toFixed(2)}mm (aspect ratio: ${aspectRatio.toFixed(3)})`);
  return heightMm;
}
```

### Paso 2: Actualizar downloadPresupuestoPDF

```typescript
static async downloadPresupuestoPDF(...): Promise<void> {
  console.debug('[GENERATOR_NAME] Starting PDF download for:', presupuesto.codigo);
  const doc = await this.generatePresupuestoPDF(...);
  const blob = doc.output('blob');
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `presupuesto-${presupuesto.codigo}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  console.debug('[GENERATOR_NAME] PDF download completed');
}
```

### Paso 3: Actualizar Inserciones de Imágenes

Para logos:
```typescript
const logo = await this.loadImageAsBase64WithSize('/hdm-logo.png');
const logoWidthMm = 50; // ancho objetivo
const logoHeightMm = this.calcHeightMmFromWidthMm(logo.width, logo.height, logoWidthMm);
doc.addImage(logo.dataUrl, 'PNG', xPos, yPos, logoWidthMm, logoHeightMm);
```

Para firmas:
```typescript
const signature = await this.loadImageAsBase64WithSize(signatureUrl);
const signatureWidthMm = 40;
const signatureHeightMm = this.calcHeightMmFromWidthMm(
  signature.width,
  signature.height,
  signatureWidthMm
);
doc.addImage(signature.dataUrl, 'PNG', xPos, yPos, signatureWidthMm, signatureHeightMm);
```

Para imágenes de anexos:
```typescript
const imagen = await this.loadImageAsBase64WithSize(imageUrl);
const imgWidthMm = 80; // ancho máximo
const imgHeightMm = this.calcHeightMmFromWidthMm(imagen.width, imagen.height, imgWidthMm);

// Ajustar si excede el alto máximo disponible
const maxHeightMm = 60;
const finalImgHeight = Math.min(imgHeightMm, maxHeightMm);
const finalImgWidth = finalImgHeight === imgHeightMm ? imgWidthMm : 
  (maxHeightMm * imagen.width / imagen.height);

doc.addImage(imagen.dataUrl, 'JPEG', xPos, yPos, finalImgWidth, finalImgHeight);
```

## Pruebas Manuales

Para cada generador modificado, verificar:

1. **Vista previa vs Descarga**
   - Abrir vista previa (botón "Ver PDF" o similar)
   - Descargar PDF (botón "Descargar")
   - Comparar visualmente - deben ser idénticos

2. **Tamaño del Logo**
   - Verificar que el logo no esté deformado
   - Verificar que mantenga su aspect ratio
   - Verificar que el tamaño sea consistente

3. **Firma del Vendedor**
   - Probar con presupuesto que tiene firma
   - Probar con presupuesto sin firma
   - Verificar que la firma no esté estirada o comprimida

4. **Imágenes de Anexos** (si aplica)
   - Probar presupuesto con múltiples imágenes
   - Verificar que las imágenes mantengan su aspect ratio
   - Verificar que no se desborde el layout

## Logs de Debug

Los cambios añaden logs útiles para debugging:

```
[PDFGenerator] Loading image: /hdm-logo.png
[PDFGenerator] Image loaded successfully: 800x200px
[PDFGenerator] Calculated dimensions: 50mm x 12.50mm (aspect ratio: 0.250)
[PDFGenerator] Starting PDF download for: PRE-12345
[PDFGenerator] PDF download completed
```

Para ver estos logs en producción:
- Abrir DevTools (F12)
- Ir a la pestaña Console
- Filtrar por "PDFGenerator", "HDMPDFGenerator" o "HDMStandard"

## Referencias

### jsPDF - Unidades y Dimensiones

jsPDF trabaja en milímetros (mm) por defecto cuando se crea con `unit: 'mm'`.

**Importante:**
- NO pasar dimensiones en píxeles directamente a `doc.addImage(..., widthMm, heightMm)`
- SIEMPRE calcular las dimensiones en mm basándose en el aspect ratio de la imagen
- Usar `calcHeightMmFromWidthMm` para mantener proporciones

### Formato A4

- Ancho: 210mm
- Alto: 297mm
- Con márgenes de 20mm: área útil de 170mm x 257mm

## Notas Adicionales

- **Limpieza de URLs:** Se usa `setTimeout(() => URL.revokeObjectURL(url), 100)` para limpiar el objeto URL después de descargar
- **Cross-Origin:** Las imágenes se cargan con `img.crossOrigin = 'anonymous'` para evitar problemas CORS
- **Error Handling:** Todos los helpers incluyen manejo de errores con console.error para facilitar debugging
- **Console Logs:** Los logs están marcados con el nombre del generador para facilitar la identificación

## Checklist para PR Futuro

- [ ] Aplicar cambios en `pdfGeneratorHDMv2.ts`
- [ ] Aplicar cambios en `pdfGeneratorCorporate.ts`
- [ ] Ejecutar `npm run typecheck` sin errores relacionados
- [ ] Probar manualmente vista previa vs descarga
- [ ] Probar con presupuestos con/sin firma
- [ ] Probar con presupuestos con/sin imágenes anexas
- [ ] Verificar que el tamaño del logo sea correcto en todos los PDFs
- [ ] Actualizar esta documentación si se encuentran casos edge

---

**Autor:** GitHub Copilot  
**Fecha:** 2025-11-21  
**Branch:** feature/unificar-pdf-descarga

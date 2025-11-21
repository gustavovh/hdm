# Patrón de Unificación de Generadores PDF

## Objetivo

Garantizar que la vista previa y la descarga de PDFs generen exactamente el mismo blob, y que todas las imágenes (logos, firmas, anexos) mantengan su aspect ratio correcto al insertarse en el PDF.

## Archivos ya actualizados (este PR)

- ✅ `src/services/pdfGenerator.ts`
- ✅ `src/services/pdfGeneratorHDM.ts`
- ✅ `src/services/pdfGeneratorHDMStandard.ts`

## Archivos pendientes (PRs futuros)

- ⏳ `src/services/pdfGeneratorHDMv2.ts`
- ⏳ `src/services/pdfGeneratorCorporate.ts`

## Patrón de implementación

### 1. Agregar helpers para manejo de imágenes

Para archivos que usan clases (ej. `PDFGenerator`, `HDMPDFGenerator`):

```typescript
private static async loadImageAsBase64WithSize(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context'));
      ctx.drawImage(img, 0, 0);
      console.debug(`[NombreClase] Image loaded: ${url}, dimensions: ${img.width}x${img.height}px`);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

private static calcHeightMmFromWidthMm(imgWidthPx: number, imgHeightPx: number, targetWidthMm: number): number {
  const aspectRatio = imgHeightPx / imgWidthPx;
  const calculatedHeightMm = targetWidthMm * aspectRatio;
  console.debug(`[NombreClase] Calc dimensions: ${imgWidthPx}x${imgHeightPx}px -> ${targetWidthMm}x${calculatedHeightMm.toFixed(2)}mm`);
  return calculatedHeightMm;
}
```

Para archivos que usan funciones (ej. `pdfGeneratorHDMStandard.ts`):

```typescript
async function loadImageAsBase64WithSize(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
  // ... mismo código que arriba
}

function calcHeightMmFromWidthMm(imgWidthPx: number, imgHeightPx: number, targetWidthMm: number): number {
  // ... mismo código que arriba
}
```

### 2. Actualizar método de descarga

**ANTES:**
```typescript
static async downloadPresupuestoPDF(presupuesto: Presupuesto): Promise<void> {
  const doc = await this.generatePresupuestoPDF(presupuesto);
  doc.save(`presupuesto-${presupuesto.codigo}.pdf`);
}
```

**DESPUÉS:**
```typescript
static async downloadPresupuestoPDF(presupuesto: Presupuesto): Promise<void> {
  const doc = await this.generatePresupuestoPDF(presupuesto);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `presupuesto-${presupuesto.codigo}.pdf`;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.debug(`[NombreClase] PDF downloaded: presupuesto-${presupuesto.codigo}.pdf`);
}
```

### 3. Actualizar inserción de imágenes

**ANTES (dimensiones fijas, sin aspect ratio):**
```typescript
const signatureBase64 = await this.loadImageAsBase64(signatureUrl);
const signatureWidth = 40;
const signatureHeight = 20;  // ⚠️ Dimensión fija puede deformar
doc.addImage(signatureBase64, 'PNG', x, y, signatureWidth, signatureHeight);
```

**DESPUÉS (mantiene aspect ratio):**
```typescript
const signature = await this.loadImageAsBase64WithSize(signatureUrl);
const signatureWidthMm = 40;
const signatureHeightMm = this.calcHeightMmFromWidthMm(
  signature.width, 
  signature.height, 
  signatureWidthMm
);
doc.addImage(signature.dataUrl, 'PNG', x, y, signatureWidthMm, signatureHeightMm);
```

### 4. Casos especiales

#### Logo en el header

Si el logo ya usa cálculo de aspect ratio (como en `pdfGeneratorHDMStandard.ts`):

```typescript
const logo = await loadImageAsBase64WithSize('/hdm-logo.png');
const aspect = logo.height / logo.width;
const logoW = leftColumnWidth;
const logoH = logoW * aspect;  // ✅ Ya mantiene aspect ratio
doc.addImage(logo.dataUrl, 'PNG', x, y, logoW, logoH);
```

#### Imágenes de anexos

```typescript
// ANTES: dimensiones fijas
const imgWidth = 80;
const imgHeight = 60;
doc.addImage(imgBase64, 'JPEG', xPos, yPos, imgWidth, imgHeight);

// DESPUÉS: calcula altura manteniendo ratio
const imagen = await loadImageAsBase64WithSize(imageUrl);
const imgWidthMm = 80;
const imgHeightMm = calcHeightMmFromWidthMm(imagen.width, imagen.height, imgWidthMm);
doc.addImage(imagen.dataUrl, 'JPEG', xPos, yPos, imgWidthMm, imgHeightMm);
```

## Beneficios

1. **Consistencia**: Vista previa y descarga son idénticas (mismo blob)
2. **Calidad**: Imágenes no se deforman al mantener aspect ratio
3. **Trazabilidad**: Logs en consola facilitan debugging
4. **Mantenibilidad**: Patrón uniforme en todos los generadores

## Testing manual recomendado

Después de aplicar cambios:

1. ✅ Abrir un presupuesto → Vista previa (nueva pestaña)
2. ✅ Descargar el mismo presupuesto con el botón
3. ✅ Comparar visualmente ambos PDFs (deben ser idénticos)
4. ✅ Probar con presupuestos que tengan firma
5. ✅ Probar con presupuestos sin firma
6. ✅ Probar con presupuestos que tengan imágenes de anexos
7. ✅ Verificar que logos y firmas no aparezcan deformados

## Notas técnicas

- El método `doc.output('blob')` genera exactamente el mismo PDF que `window.open()` usa para preview
- `doc.save()` internamente puede aplicar conversiones diferentes según el navegador
- El cálculo de dimensiones en mm debe hacerse antes de `doc.addImage()` para que jsPDF respete el aspect ratio
- Los logs con `console.debug` no afectan producción pero ayudan en desarrollo

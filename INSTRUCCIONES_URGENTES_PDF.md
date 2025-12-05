# INSTRUCCIONES URGENTES - LIMPIAR CACHÉ

## PROBLEMA
El código está correcto pero el navegador tiene archivos viejos en caché.

## SOLUCIÓN - SIGUE ESTOS PASOS EXACTAMENTE:

### PASO 1: Limpiar Caché del Navegador
Presiona simultáneamente:
```
CTRL + SHIFT + R
```
O:
```
CTRL + F5
```

Esto forza al navegador a descargar los archivos NUEVOS.

### PASO 2: Verificar que Cargó la Nueva Versión
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. REGENERA el PDF (NO uses un PDF viejo)
4. Busca este mensaje:
   ```
   🎯 USANDO GENERADOR HDMSTANDARD - VERSIÓN ANTI-SUPERPOSICIÓN v2.1 - 2024-12-05-1456
   ```

### PASO 3: Generar PDF Nuevo
NO abras PDFs viejos que ya descargaste.
1. Ve al sistema
2. Crea un nuevo presupuesto O edita uno existente
3. Haz clic en "Generar PDF"
4. Verifica el PDF generado AHORA

## ALTERNATIVA: Modo Incógnito
Si los pasos anteriores no funcionan:
1. Abre una ventana de incógnito (CTRL+SHIFT+N en Chrome)
2. Ve a la URL del sistema
3. Inicia sesión
4. Genera el PDF
5. Verifica que esté correcto

## QUÉ ESPERAR EN EL PDF CORRECTO:

### Página 1:
- Logo HDM: 50mm de ancho (GRANDE)
- Servicios visibles debajo del logo
- Contacto en esquina superior derecha
- Número de presupuesto visible

### Página 2 y siguientes:
- Logo HDM: 50mm de ancho (GRANDE) en parte superior
- Servicios visibles debajo del logo
- Contacto en esquina superior derecha
- Número de presupuesto visible
- **TABLA COMIENZA DEBAJO** (sin superposición)

## CAMBIOS APLICADOS EN EL CÓDIGO:

1. **Logo 50mm fijo** en todas las páginas
2. **margin.top: 50** en autoTable para reservar espacio para header
3. **didDrawPage sincrónico** con logo pre-cargado
4. **yTop ajustado** para que header se dibuje dentro del margin.top

---

**SI AÚN VES SUPERPOSICIÓN:**
1. Verifica que hiciste CTRL+SHIFT+R
2. Verifica en consola que dice "v2.1 - 2024-12-05-1456"
3. Verifica que GENERASTE un PDF nuevo (no abriste uno viejo)

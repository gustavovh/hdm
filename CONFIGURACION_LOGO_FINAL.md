# CONFIGURACIÓN FINAL DEL LOGO - NO MODIFICAR

## Tamaño Aprobado y Validado

**LOGO_WIDTH_MM: 65mm**
**LOGO_HEIGHT_MM: 17mm**

Este es el tamaño FINAL y CORRECTO del logo para todos los PDFs generados con el formato HDM Standard.

## Configuraciones Relacionadas

### Margin Top de la Tabla
```typescript
margin: {
  top: 78, // Espacio para header con logo 65mm x 17mm
}
```

### Posición del Número de Presupuesto
```typescript
const servicesBottom = yTop + scaledH + 8 + 14;
```

Con logo de 65mm:
- yTop: 22mm
- scaledH: 17mm
- Gap después de logo: 8mm
- Gap después de servicios: 14mm
- **Posición final: 61mm** (bien separado de la tabla que inicia en 78mm)

## Archivo Afectado

`src/services/pdfGeneratorHDMStandard.ts`

## Notas Importantes

1. **NO modificar** `LOGO_WIDTH_MM` ni `LOGO_HEIGHT_MM` bajo ninguna circunstancia
2. El tamaño de 65mm x 17mm ha sido validado y aprobado
3. Cualquier cambio en el tamaño del logo afectará el espaciado y alineación de todo el documento
4. El margin.top de 78mm está calculado específicamente para este tamaño de logo

## Historial de Cambios

- **2024-12-05 16:35**: Configuración FINAL ajustada a 65mm x 17mm (tamaño exacto del modelo proporcionado)
- **2024-12-05 16:25**: Configuración temporal establecida en 80mm x 21mm (demasiado grande)
- **2024-12-05 16:10**: Configuración temporal establecida en 50mm x 13mm (demasiado pequeño)
- Se agregaron comentarios de advertencia en el código
- Se documentó la configuración en este archivo

---

**¡ESTA CONFIGURACIÓN NO DEBE SER MODIFICADA!**

# CONFIGURACIÓN FINAL DEL LOGO - NO MODIFICAR

## Tamaño Aprobado y Validado

**LOGO_WIDTH_MM: 55mm**
**LOGO_HEIGHT_MM: 14mm**

Este es el tamaño FINAL y CORRECTO del logo para todos los PDFs generados con el formato HDM Standard.

## Configuraciones Relacionadas

### Margin Top de la Tabla
```typescript
margin: {
  top: 70, // Espacio para header con logo 55mm x 14mm
}
```

### Posición del Número de Presupuesto
```typescript
const servicesBottom = yTop + scaledH + 8 + 14;
```

Con logo de 55mm:
- yTop: 22mm
- scaledH: 14mm
- Gap después de logo: 8mm
- Gap después de servicios: 14mm
- **Posición final: 58mm** (bien separado de la tabla que inicia en 70mm)

## Archivo Afectado

`src/services/pdfGeneratorHDMStandard.ts`

## Notas Importantes

1. **NO modificar** `LOGO_WIDTH_MM` ni `LOGO_HEIGHT_MM` bajo ninguna circunstancia
2. El tamaño de 55mm x 14mm ha sido validado y aprobado
3. Cualquier cambio en el tamaño del logo afectará el espaciado y alineación de todo el documento
4. El margin.top de 70mm está calculado específicamente para este tamaño de logo

## Historial de Cambios

- **2024-12-05 16:40**: Configuración CORREGIDA a 55mm x 14mm (tamaño reducido y correcto)
- **2024-12-05 16:35**: Configuración temporal a 65mm x 17mm (seguía grande)
- **2024-12-05 16:25**: Configuración temporal a 80mm x 21mm (demasiado grande)
- **2024-12-05 16:10**: Configuración temporal a 50mm x 13mm (demasiado pequeño)
- Se agregaron comentarios de advertencia en el código
- Se documentó la configuración en este archivo

---

**¡ESTA CONFIGURACIÓN NO DEBE SER MODIFICADA!**

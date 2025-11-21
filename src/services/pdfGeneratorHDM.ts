import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, PresupuestoImagen } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

const LOGO_WIDTH_MM = 50;
const LOGO_HEIGHT_MM = 13;

export class HDMPDFGenerator {
  /**
   * Carga una imagen y devuelve su dataUrl con dimensiones en píxeles
   */
  private static async loadImageAsBase64WithSize(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      console.debug(`[HDMPDFGenerator] Loading image: ${url}`);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('[HDMPDFGenerator] Failed to get canvas context');
            return reject(new Error('Failed to get canvas context'));
          }
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          console.debug(`[HDMPDFGenerator] Image loaded successfully: ${img.width}x${img.height}px`);
          resolve({ dataUrl, width: img.width, height: img.height });
        } catch (error) {
          console.error('[HDMPDFGenerator] Error processing image:', error);
          reject(error);
        }
      };
      img.onerror = (error) => {
        console.error('[HDMPDFGenerator] Failed to load image:', url, error);
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
    console.debug(`[HDMPDFGenerator] Calculated dimensions: ${targetWidthMm}mm x ${heightMm.toFixed(2)}mm (aspect ratio: ${aspectRatio.toFixed(3)})`);
    return heightMm;
  }

  private static async renderHeader(
    doc: jsPDF,
    pageWidth: number,
    leftMargin: number,
    rightMargin: number,
    yTop: number,
    presupuesto: Presupuesto
  ): Promise<number> {

    // --- Layout constants (A4 in mm) ---
    const leftColumnX = leftMargin;
    const contactX = pageWidth - rightMargin;
    const headerTopY = yTop - 12;   // sube un poquito el header
    const lineGap = 4;              // interlineado de 4mm

    // Usar el máximo ancho disponible para logo y servicios
    const gap = 12; // separación con la columna derecha
    const maxAllowed = contactX - leftColumnX - gap;
    const leftColumnWidth = maxAllowed; // usar SIEMPRE el máximo posible

    // --- RIGHT column (100% alineado a derecha) ---
    let rightY = headerTopY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Dirección: Profesor Almada C/21 de setiembre', contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text('Luque - Paraguay',                                  contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text(`Email: hmino@hdm.com.py`,                           contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text(`Cel: +595981795669`,                                contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text(`RUC: 80122639-2`,                                   contactX, rightY, { align: 'right' });

    // --- LEFT column: LOGO (misma ANCHURA que servicios, SIN deformar) ---
    let currentY = headerTopY;
    try {
      const logo = await this.loadImageAsBase64WithSize('/hdm-logo.png');
      const logoWidthMm = leftColumnWidth;           // ancho en mm
      const logoHeightMm = this.calcHeightMmFromWidthMm(logo.width, logo.height, logoWidthMm);
      doc.addImage(logo.dataUrl, 'PNG', leftColumnX, currentY, logoWidthMm, logoHeightMm);
      currentY += logoHeightMm + 6;                   // espacio debajo del logo
    } catch (e) {
      console.error('[HDMPDFGenerator] Logo error:', e);
      currentY += 12; // fallback spacing
    }

    // --- LEFT column: BLOQUE "servicios" (negrita, wrap al MISMO ancho del logo) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const servicesLines = [
      'Sistemas eléctricos de potencia – Obras civiles – Metalúrgica',
      'Domótica – Electrónica de Potencia – Media Tensión 23kV',
      'Mediciones Eléctricas – Gestoría ANDE – Asesoría Energética',
    ];

    const wrapped: string[] = [];
    for (const line of servicesLines) {
      wrapped.push(...doc.splitTextToSize(line, leftColumnWidth));
    }

    wrapped.forEach((ln, i) => {
      doc.text(ln, leftColumnX, currentY + i * 4);
    });

    const servicesBottomY = wrapped.length ? currentY + (wrapped.length - 1) * lineGap : currentY;
    const sepY = servicesBottomY + 8; // separador después del bloque

    // --- Línea separadora fina de todo el header ---
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, sepY, pageWidth - rightMargin, sepY);

    // Devolver la siguiente Y disponible
    return sepY + 6;
  }
  static async generatePresupuestoPDF(
    presupuesto: Presupuesto,
    imagenes: PresupuestoImagen[] = []
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const topMargin = 20;

    // Renderizar encabezado
    let yPosition = await HDMPDFGenerator.renderHeader(
      doc, pageWidth, leftMargin, rightMargin, topMargin, presupuesto
    );
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text('Fecha:', leftMargin, yPosition);
    doc.text(new Date(presupuesto.created_at).toLocaleDateString('es-PY'), leftMargin + 20, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Señores:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.cliente_nombre.toUpperCase(), leftMargin + 20, yPosition);

    if (presupuesto.cliente_ruc) {
      yPosition += 5;
      doc.text('RUC:', leftMargin + 20, yPosition);
      doc.text(presupuesto.cliente_ruc, leftMargin + 30, yPosition);
    }

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Referencia de', leftMargin, yPosition);
    doc.text('presupuesto:', leftMargin, yPosition + 4);
    doc.setFont('helvetica', 'normal');
    const concepto = presupuesto.concepto || 'PRESUPUESTO DE SERVICIOS';
    const conceptoLines = doc.splitTextToSize(concepto.toUpperCase(), pageWidth - leftMargin - rightMargin - 40);
    doc.text(conceptoLines, leftMargin + 30, yPosition);

    yPosition += Math.max(8, conceptoLines.length * 4) + 6;
    doc.setFont('helvetica', 'normal');
    const introLines = doc.splitTextToSize(
      'Tengo el agrado de dirigirme a Ud. A fin de presentar la oferta económica por el trabajo de referencia a ser realizado.',
      pageWidth - leftMargin - rightMargin
    );
    introLines.forEach((line: string) => {
      doc.text(line, leftMargin, yPosition);
      yPosition += 4;
    });

    yPosition += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Trabajos a ser Realizados:', leftMargin, yPosition);

    yPosition += 6;

    const items = presupuesto.items || [];
    const tableData = items.map((item, index) => {
      const itemGrupo = item.grupo || '';
      return [
        (index + 1).toString(),
        itemGrupo,
        item.descripcion,
        item.cantidad.toFixed(2),
        item.unidad || 'UNID',
        BudgetCalculator.formatCurrency(item.precio_unitario, presupuesto.moneda).replace('$', '').replace('₲', '').trim(),
        BudgetCalculator.formatCurrency(item.subtotal, presupuesto.moneda).replace('$', '').replace('₲', '').trim(),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      margin: { left: leftMargin, right: rightMargin },
      head: [['#', 'Item|Grp', 'Descripción', 'Cantidad', 'Unidad', 'P.Unitario', 'Sub Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 8,
        fontStyle: 'bold',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      styles: {
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 4;

    const currencySymbol = presupuesto.moneda === 'USD' ? '' : 'Gs.:';
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    const totalBoxX = pageWidth - rightMargin - 50;
    doc.rect(totalBoxX, yPosition, 50, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL ${currencySymbol}`, totalBoxX + 2, yPosition + 5);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_neto, presupuesto.moneda).replace('$', '').replace('₲', '').trim(),
      pageWidth - rightMargin - 2,
      yPosition + 5,
      { align: 'right' }
    );

    yPosition += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const diasPago = presupuesto.dias_validez || 30;
    doc.text(`Forma de pago: ${diasPago} DIAS`, leftMargin, yPosition);

    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Observación(es):', leftMargin, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');

    const observaciones = [
      'EL PRESUPUESTO CONTEMPLA 2 HORAS DE IZAJE, PASADO EL TIEMPO',
      'ESTABLECIDO, SE COBRARA UN ADICIONAL DE 192.500 POR HORA. EL',
      'PRESUPUESTO NO INCLUYE EL DESMONTAJE Y MONTAJE DE BARANDAS',
    ];

    observaciones.forEach(obs => {
      doc.text(obs, leftMargin, yPosition);
      yPosition += 4;
    });

    yPosition += 3;
    doc.setFont('helvetica', 'normal');
    doc.text('* Los precios incluyen IVA.', leftMargin, yPosition);

    yPosition += 8;
    doc.text('Estamos a su disposición ante cualquier consulta.', leftMargin, yPosition);

    // Agregar imágenes si existen
    if (imagenes.length > 0) {
      yPosition += 10;

      // Verificar si hay espacio en la página actual, si no, agregar nueva página
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = topMargin;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Imágenes de Referencia:', leftMargin, yPosition);
      yPosition += 6;

      const imgWidth = 80;
      const imgHeight = 60;
      const imgsPerRow = 2;
      const spacing = 10;

      for (let i = 0; i < imagenes.length; i++) {
        try {
          const imagen = await this.loadImageAsBase64WithSize(imagenes[i].url);

          const col = i % imgsPerRow;
          const row = Math.floor(i / imgsPerRow);

          const xPos = leftMargin + col * (imgWidth + spacing);
          const yPos = yPosition + row * (imgHeight + spacing);

          // Calcular dimensiones manteniendo aspect ratio
          const imgWidthMm = imgWidth;
          const imgHeightMm = this.calcHeightMmFromWidthMm(imagen.width, imagen.height, imgWidthMm);
          
          // Ajustar si la altura calculada excede el límite
          const finalImgHeight = Math.min(imgHeightMm, imgHeight);
          const finalImgWidth = finalImgHeight === imgHeightMm ? imgWidthMm : 
            (imgHeight * imagen.width / imagen.height);

          // Verificar si necesitamos nueva página
          if (yPos + finalImgHeight > pageHeight - 20) {
            doc.addPage();
            yPosition = topMargin;
            const newRow = 0;
            const newYPos = yPosition + newRow * (imgHeight + spacing);
            doc.addImage(imagen.dataUrl, 'JPEG', xPos, newYPos, finalImgWidth, finalImgHeight);
          } else {
            doc.addImage(imagen.dataUrl, 'JPEG', xPos, yPos, finalImgWidth, finalImgHeight);
          }

          // Agregar descripción si existe
          if (imagenes[i].descripcion) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(
              imagenes[i].descripcion!,
              xPos + finalImgWidth / 2,
              yPos + finalImgHeight + 3,
              { align: 'center', maxWidth: finalImgWidth }
            );
          }
        } catch (error) {
          console.error(`[HDMPDFGenerator] Error loading image ${i}:`, error);
        }
      }

      // Calcular espacio usado por imágenes
      const totalRows = Math.ceil(imagenes.length / imgsPerRow);
      yPosition += totalRows * (imgHeight + spacing) + 10;
    }

    doc.setFontSize(55);
    doc.setTextColor(245, 245, 245);
    doc.setFont('helvetica', 'bold');
    doc.saveGraphicsState();
    doc.text('PRESUPUESTO', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();

    // Verificar si hay espacio para la firma
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = topMargin;
    } else {
      yPosition += 20;
    }

    // Agregar firma del vendedor si existe
    const vendedorName = presupuesto.vendedor?.full_name || 'Vendedor';
    const signatureUrl = presupuesto.vendedor?.signature_url;

    if (signatureUrl) {
      try {
        const signature = await this.loadImageAsBase64WithSize(signatureUrl);
        const signatureWidthMm = 40; // ancho objetivo en mm
        const signatureHeightMm = this.calcHeightMmFromWidthMm(
          signature.width,
          signature.height,
          signatureWidthMm
        );
        const xPos = pageWidth - rightMargin - 45;

        doc.addImage(signature.dataUrl, 'PNG', xPos, yPosition, signatureWidthMm, signatureHeightMm);
        yPosition += signatureHeightMm + 2;
      } catch (error) {
        console.error('[HDMPDFGenerator] Error loading signature:', error);
        yPosition += 2;
      }
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('_______________________', pageWidth - rightMargin - 45, yPosition);
      yPosition += 4;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(vendedorName, pageWidth - rightMargin - 42, yPosition, { align: 'left' });

    return doc;
  }

  static async downloadPresupuestoPDF(
    presupuesto: Presupuesto,
    imagenes: PresupuestoImagen[] = []
  ): Promise<void> {
    console.debug('[HDMPDFGenerator] Starting PDF download for:', presupuesto.codigo);
    const doc = await this.generatePresupuestoPDF(presupuesto, imagenes);
    const blob = doc.output('blob');
    
    // Crear un enlace temporal para descargar desde el blob
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuesto-${presupuesto.codigo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar el objeto URL después de un breve delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
    console.debug('[HDMPDFGenerator] PDF download completed');
  }

  static async previewPresupuestoPDF(
    presupuesto: Presupuesto,
    imagenes: PresupuestoImagen[] = []
  ): Promise<void> {
    const doc = await this.generatePresupuestoPDF(presupuesto, imagenes);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  static async getPDFBlob(
    presupuesto: Presupuesto,
    imagenes: PresupuestoImagen[] = []
  ): Promise<Blob> {
    const doc = await this.generatePresupuestoPDF(presupuesto, imagenes);
    return doc.output('blob');
  }
}

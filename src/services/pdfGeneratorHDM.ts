import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, PresupuestoImagen } from '../types/database.types';
import { DEFAULT_PDF_OPTIONS, formatGs } from './pdfGeneratorHDMv2';

export class HDMPDFGenerator {
  private static async loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  static async generatePresupuestoPDF(
    presupuesto: Presupuesto,
    imagenes: PresupuestoImagen[] = [],
    options?: Partial<typeof DEFAULT_PDF_OPTIONS> & { margins?: Partial<typeof DEFAULT_PDF_OPTIONS.margins> }
  ): Promise<jsPDF> {
    const opts = { ...DEFAULT_PDF_OPTIONS, ...(options || {}) };
    opts.margins = { ...DEFAULT_PDF_OPTIONS.margins, ...(options?.margins || {}) };

    const doc = new jsPDF({
      unit: opts.unit,
      format: opts.format,
      orientation: opts.orientation,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = opts.margins.left;
    const rightMargin = opts.margins.right;
    const topMargin = opts.margins.top;
    let yPosition = topMargin;

    try {
      const logoBase64 = await this.loadImageAsBase64('/hdm logo copy.png');
      doc.addImage(logoBase64, 'PNG', leftMargin, yPosition, 60, 18);
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    yPosition += 20;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Sistemas eléctricos de potencia - Obras civiles - Metalúrgica', leftMargin, yPosition);
    yPosition += 3;
    doc.text('Domótica - Electrónica de Potencia - Media Tensión 23kV', leftMargin, yPosition);
    yPosition += 3;
    doc.text('Mediciones Eléctricas - Gestoría ANDE - Asesoría Energética', leftMargin, yPosition);

    const contactStartY = topMargin;
    let contactY = contactStartY;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Direccion: Profesor Almada C/21 de', pageWidth - rightMargin, contactY, { align: 'right' });
    contactY += 3;
    doc.text('setiembre', pageWidth - rightMargin, contactY, { align: 'right' });
    contactY += 3;
    doc.text('Luque - Paraguay', pageWidth - rightMargin, contactY, { align: 'right' });
    contactY += 3;
    doc.text('Email: hmino@hdm.com.py', pageWidth - rightMargin, contactY, { align: 'right' });
    contactY += 3;
    doc.text('Cel: +595981795669', pageWidth - rightMargin, contactY, { align: 'right' });
    contactY += 3;
    doc.text('Ruc: 80122639-2', pageWidth - rightMargin, contactY, { align: 'right' });

    yPosition = 45;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Presupuesto #: ${presupuesto.codigo}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition = 58;
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
      return [
        (index + 1).toString(),
        '',  // Item|Grp (no disponible en el tipo)
        item.descripcion,
        item.cantidad.toFixed(2),
        'UNID',  // Unidad (no disponible en el tipo)
        formatGs(item.precio_unitario),
        formatGs(item.subtotal),
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      margin: { left: leftMargin, right: rightMargin },
      head: [['#', 'Item|Grp', 'Descripción', 'Cantidad', 'Unidad', 'P.Unit.', 'Sub Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 8,
        fontStyle: DEFAULT_PDF_OPTIONS.table.headerFontStyle,
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
        lineColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[0], halign: 'center' },
        1: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[1], halign: 'center' },
        2: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[2], halign: 'left' },
        3: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[3], halign: 'right' },
        4: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[4], halign: 'center' },
        5: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[5], halign: 'right' },
        6: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[6], halign: 'right' },
      },
      styles: {
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
        lineColor: [0, 0, 0],
      },
      didDrawPage: () => {
        if (opts.watermark.enabled) {
          this.addWatermark(doc, pageWidth, pageHeight, opts);
        }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 4;

    // TOTAL row con borde superior
    const currencySymbol = presupuesto.moneda === 'USD' ? '' : 'Gs.:';
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    const totalRowY = yPosition;
    const totalLabelX = pageWidth - rightMargin - DEFAULT_PDF_OPTIONS.table.columnWidthsMm[6] - DEFAULT_PDF_OPTIONS.table.columnWidthsMm[5];
    const totalValueX = pageWidth - rightMargin - DEFAULT_PDF_OPTIONS.table.columnWidthsMm[6];
    
    // Línea superior del TOTAL
    doc.line(totalLabelX, totalRowY, pageWidth - rightMargin, totalRowY);
    
    yPosition += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL ${currencySymbol}`, totalValueX - 2, yPosition, { align: 'right' });
    doc.text(formatGs(presupuesto.total_neto), pageWidth - rightMargin - 2, yPosition, { align: 'right' });

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

    // Watermark
    if (opts.watermark.enabled) {
      this.addWatermark(doc, pageWidth, pageHeight, opts);
    }

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
          const imgBase64 = await this.loadImageAsBase64(imagenes[i].url);

          const col = i % imgsPerRow;
          const row = Math.floor(i / imgsPerRow);

          const xPos = leftMargin + col * (imgWidth + spacing);
          const yPos = yPosition + row * (imgHeight + spacing);

          // Verificar si necesitamos nueva página
          if (yPos + imgHeight > pageHeight - 20) {
            doc.addPage();
            yPosition = topMargin;
            const newRow = 0;
            const newYPos = yPosition + newRow * (imgHeight + spacing);
            doc.addImage(imgBase64, 'JPEG', xPos, newYPos, imgWidth, imgHeight);
          } else {
            doc.addImage(imgBase64, 'JPEG', xPos, yPos, imgWidth, imgHeight);
          }

          // Agregar descripción si existe
          if (imagenes[i].descripcion) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(
              imagenes[i].descripcion!,
              xPos + imgWidth / 2,
              yPos + imgHeight + 3,
              { align: 'center', maxWidth: imgWidth }
            );
          }
        } catch (error) {
          console.error(`Error loading image ${i}:`, error);
        }
      }

      // Calcular espacio usado por imágenes
      const totalRows = Math.ceil(imagenes.length / imgsPerRow);
      yPosition += totalRows * (imgHeight + spacing) + 10;
    }

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
        const signatureBase64 = await this.loadImageAsBase64(signatureUrl);
        const signatureWidth = 40;
        const signatureHeight = 20;
        const xPos = pageWidth - rightMargin - 45;

        doc.addImage(signatureBase64, 'PNG', xPos, yPosition, signatureWidth, signatureHeight);
        yPosition += signatureHeight + 2;
      } catch (error) {
        console.error('Error loading signature:', error);
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

  private static addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number, opts: typeof DEFAULT_PDF_OPTIONS) {
    if (!opts.watermark.enabled) return;

    doc.saveGraphicsState();
    const gstate = new doc.GState({ opacity: opts.watermark.opacity });
    doc.setGState(gstate);
    doc.setTextColor(180, 180, 180);

    doc.setFontSize(opts.watermark.fontSizePt);
    doc.setFont('helvetica', 'bold');

    const text = opts.watermark.text;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    doc.text(text, centerX, centerY, {
      align: 'center',
      angle: opts.watermark.rotationDeg
    });

    doc.restoreGraphicsState();
  }

  static async downloadPresupuestoPDF(
    presupuesto: Presupuesto,
    imagenes: PresupuestoImagen[] = []
  ): Promise<void> {
    const doc = await this.generatePresupuestoPDF(presupuesto, imagenes);
    doc.save(`presupuesto-${presupuesto.codigo}.pdf`);
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

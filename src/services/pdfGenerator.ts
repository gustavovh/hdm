import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, SolicitudDescuento } from '../types/database.types';
import { DEFAULT_PDF_OPTIONS, formatGs } from './pdfGeneratorHDMv2';

export class PDFGenerator {
  static async loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
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
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  static async generatePresupuestoPDF(
    presupuesto: Presupuesto,
    solicitudAprobada?: SolicitudDescuento,
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
    let yPosition = opts.margins.top;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('HDM - Presupuesto', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${presupuesto.codigo}`, opts.margins.left, yPosition);
    doc.text(
      `Fecha: ${new Date(presupuesto.created_at).toLocaleDateString()}`,
      pageWidth - opts.margins.right,
      yPosition,
      { align: 'right' }
    );

    yPosition += 5;
    doc.setLineWidth(0.5);
    doc.line(opts.margins.left, yPosition, pageWidth - opts.margins.right, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Cliente', opts.margins.left, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${presupuesto.cliente_nombre}`, opts.margins.left, yPosition);
    yPosition += 5;
    if (presupuesto.cliente_email) {
      doc.text(`Email: ${presupuesto.cliente_email}`, opts.margins.left, yPosition);
      yPosition += 5;
    }
    if (presupuesto.cliente_telefono) {
      doc.text(`Teléfono: ${presupuesto.cliente_telefono}`, opts.margins.left, yPosition);
      yPosition += 5;
    }

    yPosition += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Vendedor', opts.margins.left, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vendedor: ${presupuesto.vendedor?.full_name || 'N/A'}`, opts.margins.left, yPosition);
    yPosition += 5;
    doc.text(`Email: ${presupuesto.vendedor?.email || 'N/A'}`, opts.margins.left, yPosition);
    yPosition += 10;

    const items = presupuesto.items || [];
    const tableData = items.map((item, index) => [
      index + 1,
      item.descripcion,
      item.cantidad.toString(),
      formatGs(item.precio_unitario),
      formatGs(item.subtotal),
      item.descuento_aplicado > 0
        ? formatGs(item.descuento_aplicado)
        : '-',
      formatGs(item.subtotal - item.descuento_aplicado),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [
        [
          '#',
          'Descripción',
          'Cant.',
          'Precio Unit.',
          'Subtotal',
          'Descuento',
          'Total',
        ],
      ],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246], 
        fontSize: 9,
        fontStyle: DEFAULT_PDF_OPTIONS.table.headerFontStyle,
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      styles: {
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
      },
      margin: { left: opts.margins.left, right: opts.margins.right },
      didDrawPage: () => {
        if (opts.watermark.enabled) {
          this.addWatermark(doc, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), opts);
        }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (solicitudAprobada) {
      doc.setFillColor(219, 234, 254);
      doc.rect(opts.margins.left, yPosition, pageWidth - opts.margins.left - opts.margins.right, 30, 'F');

      yPosition += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216);
      doc.text('Descuento Aprobado', opts.margins.left + 5, yPosition);

      yPosition += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const estadoText =
        solicitudAprobada.estado === 'APROBADO_MODIFICADO'
          ? 'APROBADO CON MODIFICACIÓN'
          : 'APROBADO';
      doc.text(`Estado: ${estadoText}`, opts.margins.left + 5, yPosition);

      yPosition += 4;
      doc.text(`Tipo: ${solicitudAprobada.tipo}`, opts.margins.left + 5, yPosition);

      yPosition += 4;
      const valorAprobado = solicitudAprobada.valor_aprobado || 0;
      if (solicitudAprobada.tipo === 'PORCENTAJE') {
        doc.text(`Descuento: ${valorAprobado}%`, opts.margins.left + 5, yPosition);
      } else {
        doc.text(`Descuento: ${formatGs(valorAprobado)}`, opts.margins.left + 5, yPosition);
      }

      yPosition += 4;
      doc.text(
        `Aprobado el: ${new Date(
          solicitudAprobada.applied_at || ''
        ).toLocaleDateString()}`,
        opts.margins.left + 5,
        yPosition
      );

      if (solicitudAprobada.comentario_admin) {
        yPosition += 4;
        doc.text(`Observaciones: ${solicitudAprobada.comentario_admin}`, opts.margins.left + 5, yPosition);
      }

      yPosition += 10;
    }

    const summaryStartY = yPosition;
    const summaryX = pageWidth - opts.margins.right - 55;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text('Total Bruto:', summaryX, summaryStartY);
    doc.text(
      formatGs(presupuesto.total_bruto),
      summaryX + 50,
      summaryStartY,
      { align: 'right' }
    );

    if (presupuesto.total_descuento > 0) {
      doc.text('Descuento:', summaryX, summaryStartY + 5);
      doc.setTextColor(220, 38, 38);
      doc.text(
        `- ${formatGs(presupuesto.total_descuento)}`,
        summaryX + 50,
        summaryStartY + 5,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.text('Total Neto:', summaryX, summaryStartY + 10);
    doc.text(
      formatGs(presupuesto.total_neto),
      summaryX + 50,
      summaryStartY + 10,
      { align: 'right' }
    );

    doc.text(
      `Impuestos (${presupuesto.tasa_impuesto}%):`,
      summaryX,
      summaryStartY + 15
    );
    doc.text(
      formatGs(presupuesto.total_impuestos),
      summaryX + 50,
      summaryStartY + 15,
      { align: 'right' }
    );

    doc.setLineWidth(0.5);
    doc.line(summaryX, summaryStartY + 18, summaryX + 50, summaryStartY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', summaryX, summaryStartY + 24);
    doc.text(
      formatGs(presupuesto.total_neto + presupuesto.total_impuestos),
      summaryX + 50,
      summaryStartY + 24,
      { align: 'right' }
    );

    // Agregar firma del vendedor
    let signatureY = summaryStartY + 35;
    const vendedorName = presupuesto.vendedor?.full_name || 'Vendedor';
    const signatureUrl = presupuesto.vendedor?.signature_url;

    if (signatureUrl) {
      try {
        const signatureBase64 = await this.loadImageAsBase64(signatureUrl);
        const signatureWidth = 40;
        const signatureHeight = 20;
        const xPos = summaryX;

        doc.addImage(signatureBase64, 'PNG', xPos, signatureY, signatureWidth, signatureHeight);
        signatureY += signatureHeight + 2;
      } catch (error) {
        console.error('Error loading signature:', error);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('_______________________', summaryX, signatureY);
        signatureY += 4;
      }
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('_______________________', summaryX, signatureY);
      signatureY += 4;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(vendedorName, summaryX, signatureY);

    // Footer opcional
    const pageHeight = doc.internal.pageSize.getHeight();
    if (opts.footerEnabled) {
      const footerY = pageHeight - opts.margins.bottom;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generado el ${new Date().toLocaleString()}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );

      if (solicitudAprobada) {
        doc.text(
          `ID Solicitud: ${solicitudAprobada.id}`,
          pageWidth / 2,
          footerY + 4,
          { align: 'center' }
        );
      }
    }

    // Watermark
    if (opts.watermark.enabled) {
      this.addWatermark(doc, pageWidth, pageHeight, opts);
    }

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
    solicitudAprobada?: SolicitudDescuento
  ): Promise<void> {
    const doc = await this.generatePresupuestoPDF(presupuesto, solicitudAprobada);
    doc.save(`presupuesto-${presupuesto.codigo}.pdf`);
  }

  static async previewPresupuestoPDF(
    presupuesto: Presupuesto,
    solicitudAprobada?: SolicitudDescuento
  ): Promise<void> {
    const doc = await this.generatePresupuestoPDF(presupuesto, solicitudAprobada);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  static async getPDFBlob(
    presupuesto: Presupuesto,
    solicitudAprobada?: SolicitudDescuento
  ): Promise<Blob> {
    const doc = await this.generatePresupuestoPDF(presupuesto, solicitudAprobada);
    return doc.output('blob');
  }
}

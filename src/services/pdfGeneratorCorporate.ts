import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, SolicitudDescuento } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { DEFAULT_PDF_OPTIONS, formatGs } from './pdfGeneratorHDMv2';

interface PDFConfig {
  logo_url?: string;
  nombre_empresa: string;
  ruc_empresa?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  pie_pagina?: string;
  colores?: {
    primary?: string;
    secondary?: string;
  };
}

export class CorporatePDFGenerator {
  private static async loadImageAsBase64(url: string): Promise<string> {
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

  private static async getConfig(): Promise<PDFConfig> {
    try {
      const { data, error } = await supabase
        .from('configuracion_pdf')
        .select('*')
        .eq('activo', true)
        .maybeSingle();

      if (error) throw error;

      return data || {
        nombre_empresa: 'HDM',
        pie_pagina: 'Presupuesto válido por 30 días. Sujeto a disponibilidad de stock.',
      };
    } catch (error) {
      console.error('Error loading PDF config:', error);
      return {
        nombre_empresa: 'HDM',
        pie_pagina: 'Presupuesto válido por 30 días.',
      };
    }
  }

  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [37, 99, 235];
  }

  static async generatePresupuestoPDF(
    presupuesto: Presupuesto,
    solicitudAprobada?: SolicitudDescuento,
    options?: Partial<typeof DEFAULT_PDF_OPTIONS> & { margins?: Partial<typeof DEFAULT_PDF_OPTIONS.margins> }
  ): Promise<jsPDF> {
    const config = await this.getConfig();
    const opts = { ...DEFAULT_PDF_OPTIONS, ...(options || {}) };
    opts.margins = { ...DEFAULT_PDF_OPTIONS.margins, ...(options?.margins || {}) };

    const doc = new jsPDF({
      unit: opts.unit,
      format: opts.format,
      orientation: opts.orientation,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = opts.margins.top;

    const primaryColor = this.hexToRgb(config.colores?.primary || '#2563eb');
    const secondaryColor = this.hexToRgb(config.colores?.secondary || '#64748b');

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');

    yPosition = 15;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(config.nombre_empresa, opts.margins.left, yPosition);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', pageWidth - opts.margins.right, yPosition, { align: 'right' });

    yPosition += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (config.ruc_empresa) {
      doc.text(`RUC: ${config.ruc_empresa}`, opts.margins.left, yPosition);
    }
    doc.text(presupuesto.codigo, pageWidth - opts.margins.right, yPosition, { align: 'right' });

    if (config.direccion || config.telefono || config.email) {
      yPosition += 4;
      const contactInfo = [
        config.direccion,
        config.telefono,
        config.email,
      ].filter(Boolean).join(' | ');
      doc.text(contactInfo, opts.margins.left, yPosition);
    }

    yPosition = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    doc.setFillColor(245, 245, 245);
    const boxWidth = (pageWidth - opts.margins.left - opts.margins.right - 10) / 2;
    doc.rect(opts.margins.left, yPosition, boxWidth, 30, 'F');
    doc.rect(opts.margins.left + boxWidth + 10, yPosition, boxWidth, 30, 'F');

    yPosition += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    const clientX = opts.margins.left + 5;
    const fechaX = opts.margins.left + boxWidth + 15;
    doc.text('CLIENTE', clientX, yPosition);
    doc.text('FECHA', fechaX, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(presupuesto.cliente_nombre, clientX, yPosition);
    doc.text(
      new Date(presupuesto.created_at).toLocaleDateString('es-PY'),
      fechaX,
      yPosition
    );

    yPosition += 4;
    if (presupuesto.concepto) {
      doc.setFont('helvetica', 'bold');
      doc.text('Concepto:', clientX, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += 4;
      doc.text(presupuesto.concepto, clientX, yPosition);
    }

    yPosition += 4;
    if (presupuesto.cliente_ruc) {
      doc.text(`RUC: ${presupuesto.cliente_ruc}`, clientX, yPosition);
    }

    if (presupuesto.estado) {
      doc.text(`Estado: ${presupuesto.estado}`, fechaX, yPosition);
    }

    yPosition += 4;
    if (presupuesto.cliente_telefono) {
      doc.text(`Tel: ${presupuesto.cliente_telefono}`, clientX, yPosition);
    }

    if (presupuesto.dias_validez) {
      doc.text(
        `Validez: ${presupuesto.dias_validez} días`,
        fechaX,
        yPosition
      );
    }

    yPosition = 85;

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
        fillColor: primaryColor,
        fontSize: 9,
        fontStyle: DEFAULT_PDF_OPTIONS.table.headerFontStyle,
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: {
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
      },
      margin: { left: opts.margins.left, right: opts.margins.right },
      didDrawPage: () => {
        if (opts.watermark.enabled) {
          this.addWatermark(doc, pageWidth, pageHeight, opts);
        }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (solicitudAprobada) {
      doc.setFillColor(...primaryColor);
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.rect(opts.margins.left, yPosition, pageWidth - opts.margins.left - opts.margins.right, 25, 'S');

      yPosition += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('✓ DESCUENTO APROBADO', opts.margins.left + 5, yPosition);

      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const valorAprobado = solicitudAprobada.valor_aprobado || 0;
      const descuentoText =
        solicitudAprobada.tipo === 'PORCENTAJE'
          ? `${valorAprobado}%`
          : formatGs(valorAprobado);

      doc.text(`Tipo: ${solicitudAprobada.tipo} | Valor: ${descuentoText}`, opts.margins.left + 5, yPosition);

      yPosition += 4;
      doc.text(
        `Aprobado: ${new Date(solicitudAprobada.applied_at || '').toLocaleDateString()}`,
        opts.margins.left + 5,
        yPosition
      );

      if (solicitudAprobada.comentario_admin) {
        yPosition += 4;
        doc.text(`Obs: ${solicitudAprobada.comentario_admin}`, opts.margins.left + 5, yPosition);
      }

      yPosition += 8;
    }

    const summaryStartY = yPosition;
    const summaryX = pageWidth - opts.margins.right - 55;

    doc.setFillColor(248, 250, 252);
    doc.rect(summaryX - 5, summaryStartY - 5, 75, 35, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text('Total Bruto:', summaryX, summaryStartY);
    doc.text(
      formatGs(presupuesto.total_bruto),
      pageWidth - opts.margins.right - 5,
      summaryStartY,
      { align: 'right' }
    );

    if (presupuesto.total_descuento > 0) {
      doc.text('Descuento:', summaryX, summaryStartY + 5);
      doc.setTextColor(220, 38, 38);
      doc.text(
        `- ${formatGs(presupuesto.total_descuento)}`,
        pageWidth - opts.margins.right - 5,
        summaryStartY + 5,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.text('Subtotal:', summaryX, summaryStartY + 10);
    doc.text(
      formatGs(presupuesto.total_neto),
      pageWidth - opts.margins.right - 5,
      summaryStartY + 10,
      { align: 'right' }
    );

    doc.text(`IVA (${presupuesto.tasa_impuesto}%):`, summaryX, summaryStartY + 15);
    doc.text(
      formatGs(presupuesto.total_impuestos),
      pageWidth - opts.margins.right - 5,
      summaryStartY + 15,
      { align: 'right' }
    );

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(summaryX, summaryStartY + 18, pageWidth - opts.margins.right, summaryStartY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL:', summaryX, summaryStartY + 25);
    doc.text(
      formatGs(presupuesto.total_neto + presupuesto.total_impuestos),
      pageWidth - opts.margins.right - 5,
      summaryStartY + 25,
      { align: 'right' }
    );

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const monedaTexto = presupuesto.moneda === 'USD' ? 'Dólares Americanos' : 'Guaraníes';
    doc.text(`Moneda: ${monedaTexto}`, summaryX, summaryStartY + 30);

    // No se agrega firma ni nombre en presupuesto administrativo

    // Footer opcional
    if (opts.footerEnabled) {
      const footerY = pageHeight - opts.margins.bottom;
      doc.setDrawColor(...secondaryColor);
      doc.setLineWidth(0.3);
      doc.line(opts.margins.left, footerY - 5, pageWidth - opts.margins.right, footerY - 5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);

      if (config.pie_pagina) {
        const lines = doc.splitTextToSize(config.pie_pagina, pageWidth - opts.margins.left - opts.margins.right);
        doc.text(lines, pageWidth / 2, footerY, { align: 'center' });
      }

      doc.setFontSize(6);
      doc.text(
        `Documento generado el ${new Date().toLocaleString('es-PY')}`,
        pageWidth / 2,
        footerY + 10,
        { align: 'center' }
      );
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

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, SolicitudDescuento } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';
import { supabase } from '../lib/supabase';

const LOGO_WIDTH_MM = 50;
const LOGO_HEIGHT_MM = 13;

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
        if (!ctx) return reject(new Error('No canvas context'));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

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
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
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
      const aspect = logo.height / logo.width;
      const logoW = leftColumnWidth;           // ancho fijo
      const logoH = logoW * aspect;            // alto proporcional
      doc.addImage(logo.dataUrl, 'PNG', leftColumnX, currentY, logoW, logoH);
      currentY += logoH + 6;                   // espacio debajo del logo
    } catch (e) {
      console.error('Logo error:', e);
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
    solicitudAprobada?: SolicitudDescuento
  ): Promise<jsPDF> {
    const config = await this.getConfig();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const topMargin = 20;

    // Define colors from config
    const primaryColor = config.colores?.primary
      ? this.hexToRgb(config.colores.primary)
      : [37, 99, 235] as [number, number, number];
    const secondaryColor = config.colores?.secondary
      ? this.hexToRgb(config.colores.secondary)
      : [59, 130, 246] as [number, number, number];

    // Renderizar encabezado
    let yPosition = await CorporatePDFGenerator.renderHeader(
      doc, pageWidth, leftMargin, rightMargin, topMargin, presupuesto
    );

    yPosition += 5;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPosition, (pageWidth - 40) / 2 - 5, 30, 'F');
    doc.rect(20 + (pageWidth - 40) / 2 + 5, yPosition, (pageWidth - 40) / 2 - 5, 30, 'F');

    yPosition += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text('CLIENTE', 25, yPosition);
    doc.text('FECHA', 25 + (pageWidth - 40) / 2 + 5, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(presupuesto.cliente_nombre, 25, yPosition);
    doc.text(
      new Date(presupuesto.created_at).toLocaleDateString('es-PY'),
      25 + (pageWidth - 40) / 2 + 5,
      yPosition
    );

    yPosition += 4;
    if (presupuesto.concepto) {
      doc.setFont('helvetica', 'bold');
      doc.text('Concepto:', 25, yPosition);
      doc.setFont('helvetica', 'normal');
      yPosition += 4;
      doc.text(presupuesto.concepto, 25, yPosition);
    }

    yPosition += 4;
    if (presupuesto.cliente_ruc) {
      doc.text(`RUC: ${presupuesto.cliente_ruc}`, 25, yPosition);
    }

    if (presupuesto.estado) {
      doc.text(`Estado: ${presupuesto.estado}`, 25 + (pageWidth - 40) / 2 + 5, yPosition);
    }

    yPosition += 4;
    if (presupuesto.cliente_telefono) {
      doc.text(`Tel: ${presupuesto.cliente_telefono}`, 25, yPosition);
    }

    if (presupuesto.dias_validez) {
      doc.text(
        `Validez: ${presupuesto.dias_validez} días`,
        25 + (pageWidth - 40) / 2 + 5,
        yPosition
      );
    }

    yPosition = 85;

    const items = presupuesto.items || [];
    const tableData = items.map((item, index) => [
      index + 1,
      item.descripcion,
      item.cantidad.toString(),
      BudgetCalculator.formatCurrency(item.precio_unitario, presupuesto.moneda),
      BudgetCalculator.formatCurrency(item.subtotal, presupuesto.moneda),
      item.descuento_aplicado > 0
        ? BudgetCalculator.formatCurrency(item.descuento_aplicado, presupuesto.moneda)
        : '-',
      BudgetCalculator.formatCurrency(
        item.subtotal - item.descuento_aplicado,
        presupuesto.moneda
      ),
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
        fontStyle: 'bold',
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
      margin: {
        bottom: 50, // Zona de seguridad para footer
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (solicitudAprobada) {
      doc.setFillColor(...primaryColor);
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.rect(20, yPosition, pageWidth - 40, 25, 'S');

      yPosition += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('✓ DESCUENTO APROBADO', 25, yPosition);

      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const valorAprobado = solicitudAprobada.valor_aprobado || 0;
      const descuentoText =
        solicitudAprobada.tipo === 'PORCENTAJE'
          ? `${valorAprobado}%`
          : BudgetCalculator.formatCurrency(valorAprobado, presupuesto.moneda);

      doc.text(`Tipo: ${solicitudAprobada.tipo} | Valor: ${descuentoText}`, 25, yPosition);

      yPosition += 4;
      doc.text(
        `Aprobado: ${new Date(solicitudAprobada.applied_at || '').toLocaleDateString()}`,
        25,
        yPosition
      );

      if (solicitudAprobada.comentario_admin) {
        yPosition += 4;
        doc.text(`Obs: ${solicitudAprobada.comentario_admin}`, 25, yPosition);
      }

      yPosition += 8;
    }

    const summaryStartY = yPosition;
    const summaryX = pageWidth - 75;

    doc.setFillColor(248, 250, 252);
    doc.rect(summaryX - 5, summaryStartY - 5, 75, 35, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    const totalConDescuento = presupuesto.total_neto + presupuesto.total_impuestos;
    // SUB TOTAL debe ser la suma de todos los items ANTES de descuentos (total_bruto)
    const subtotalConDescuento = presupuesto.total_bruto || presupuesto.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;

    // SUB TOTAL
    doc.text('SUB TOTAL', summaryX, summaryStartY);
    doc.text(
      BudgetCalculator.formatCurrency(subtotalConDescuento, presupuesto.moneda),
      pageWidth - 25,
      summaryStartY,
      { align: 'right' }
    );

    let currentYPos = summaryStartY + 5;

    // DESCUENTO (solo si hay descuento)
    if (presupuesto.total_descuento > 0) {
      doc.text('DESCUENTO', summaryX, currentYPos);
      doc.text(
        BudgetCalculator.formatCurrency(presupuesto.total_descuento, presupuesto.moneda),
        pageWidth - 25,
        currentYPos,
        { align: 'right' }
      );
      currentYPos += 5;
    }

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(summaryX, currentYPos, pageWidth - 20, currentYPos);
    currentYPos += 7;

    // TOTAL GS.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL GS.', summaryX, currentYPos);
    doc.text(
      BudgetCalculator.formatCurrency(totalConDescuento, presupuesto.moneda),
      pageWidth - 25,
      currentYPos,
      { align: 'right' }
    );

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const monedaTexto = presupuesto.moneda === 'USD' ? 'Dólares Americanos' : 'Guaraníes';
    doc.text(`Moneda: ${monedaTexto}`, summaryX, summaryStartY + 30);

    // No se agrega firma ni nombre en presupuesto administrativo

    const footerY = pageHeight - 25;
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);

    if (config.pie_pagina) {
      const lines = doc.splitTextToSize(config.pie_pagina, pageWidth - 40);
      doc.text(lines, pageWidth / 2, footerY, { align: 'center' });
    }

    doc.setFontSize(6);
    doc.text(
      `Documento generado el ${new Date().toLocaleString('es-PY')}`,
      pageWidth / 2,
      footerY + 10,
      { align: 'center' }
    );

    return doc;
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

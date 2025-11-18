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
    // ---- CONFIG ----
    const LINE_HEIGHT = 4;          // interlineado general
    const SEPARATOR_GAP = 6;        // espacio antes de la línea separadora

    // ---- LOGO (izquierda, mantener aspecto) ----
    const MAX_W = 85;          // límite de ancho
    const TARGET_H = 28;       // altura deseada (más alto)
    const LIFT_UP = 4;         // mover un poco hacia arriba

    let logoY = yTop - LIFT_UP;
    let scaledW = 60;
    let scaledH = 20;
    try {
      const logoBase64 = await this.loadImageAsBase64('/hdm-logo.png');

      // cargar dimensiones reales desde el DataURL para respetar el aspecto
      const tmpImg: HTMLImageElement = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('No se pudo leer dimensiones del logo'));
        i.src = logoBase64;
      });

      const natW = tmpImg.width || 1;
      const natH = tmpImg.height || 1;
      const aspect = natW / natH;

      // escalar por altura objetivo y luego limitar por ancho máximo (sin deformar)
      scaledH = TARGET_H;
      scaledW = TARGET_H * aspect;
      if (scaledW > MAX_W) {
        scaledW = MAX_W;
        scaledH = MAX_W / aspect;
      }

      doc.addImage(logoBase64, 'PNG', leftMargin, logoY, scaledW, scaledH);
    } catch (e) {
      console.error('No se pudo cargar el logo:', e);
    }

    // ---- BLOQUE CONTACTO (derecha, totalmente alineado a la derecha) ----
    const contactX = pageWidth - rightMargin;
    let cy = logoY + 1; // arranca a nivel del logo
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Dirección: Profesor Almada C/21 de setiembre', contactX, cy, { align: 'right' });
    cy += LINE_HEIGHT;
    doc.text('Luque - Paraguay', contactX, cy, { align: 'right' });
    cy += LINE_HEIGHT;
    doc.text('Email: hmino@hdm.com.py', contactX, cy, { align: 'right' });
    cy += LINE_HEIGHT;
    doc.text('Cel: +595981795669', contactX, cy, { align: 'right' });
    cy += LINE_HEIGHT;
    doc.text('RUC: 80122639-2', contactX, cy, { align: 'right' });
    const contactBottom = cy;

    // ---- BLOQUE DE SERVICIOS (debajo del logo; usa la altura real escalada) ----
    const UNDER_LOGO_GAP = 8;   // separación segura
    let sy = logoY + scaledH + UNDER_LOGO_GAP; // asegura que no pise el logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const servicesLines = [
      'Sistemas eléctricos de potencia – Obras civiles – Metalúrgica',
      'Domótica – Electrónica de Potencia – Media Tensión 23kV',
      'Mediciones Eléctricas – Gestoría ANDE – Asesoría Energética'
    ];
    for (const line of servicesLines) {
      doc.text(line, leftMargin + 2, sy);
      sy += LINE_HEIGHT;
    }
    const servicesBottom = sy;

    // ---- BLOQUE TÍTULO/CÓDIGO (centro, debajo de servicios) ----
    const centerX = (pageWidth - rightMargin + leftMargin) / 2;
    let ty = servicesBottom + 2; // pequeño margen
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', centerX, ty, { align: 'center' });
    ty += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${presupuesto.codigo}`, centerX, ty, { align: 'center' });

    // ---- SEPARADOR (debajo del mayor elemento) ----
    const maxBottom = Math.max(contactBottom, ty);
    const sepY = maxBottom + SEPARATOR_GAP;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, sepY, pageWidth - rightMargin, sepY);

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
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text('Total Bruto:', summaryX, summaryStartY);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_bruto, presupuesto.moneda),
      pageWidth - 25,
      summaryStartY,
      { align: 'right' }
    );

    if (presupuesto.total_descuento > 0) {
      doc.text('Descuento:', summaryX, summaryStartY + 5);
      doc.setTextColor(220, 38, 38);
      doc.text(
        `- ${BudgetCalculator.formatCurrency(presupuesto.total_descuento, presupuesto.moneda)}`,
        pageWidth - 25,
        summaryStartY + 5,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.text('Subtotal:', summaryX, summaryStartY + 10);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_neto, presupuesto.moneda),
      pageWidth - 25,
      summaryStartY + 10,
      { align: 'right' }
    );

    doc.text(`IVA (${presupuesto.tasa_impuesto}%):`, summaryX, summaryStartY + 15);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_impuestos, presupuesto.moneda),
      pageWidth - 25,
      summaryStartY + 15,
      { align: 'right' }
    );

    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(summaryX, summaryStartY + 18, pageWidth - 20, summaryStartY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL:', summaryX, summaryStartY + 25);
    doc.text(
      BudgetCalculator.formatCurrency(
        presupuesto.total_neto + presupuesto.total_impuestos,
        presupuesto.moneda
      ),
      pageWidth - 25,
      summaryStartY + 25,
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

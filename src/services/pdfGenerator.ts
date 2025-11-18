import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, SolicitudDescuento } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

const LOGO_WIDTH_MM = 50;
const LOGO_HEIGHT_MM = 13;

export class PDFGenerator {
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

  private static async renderHeader(
    doc: jsPDF,
    pageWidth: number,
    leftMargin: number,
    rightMargin: number,
    yTop: number,
    presupuesto: Presupuesto
  ): Promise<number> {
    // ---- CONFIG ----
    const LOGO_W = 85;              // ancho del logo
    const LOGO_H = 22;              // alto proporcionado al ancho
    const UNDER_LOGO_GAP = 8;       // espacio entre logo y textos inferiores
    const LINE_HEIGHT = 4;          // interlineado general
    const SEPARATOR_GAP = 6;        // espacio antes de la línea separadora

    // ---- LOGO (izquierda) ----
    const logoTop = yTop;  // ancla superior del encabezado
    try {
      const logoBase64 = await this.loadImageAsBase64('/hdm-logo.png');
      doc.addImage(logoBase64, 'PNG', leftMargin, logoTop, LOGO_W, LOGO_H);
    } catch (e) {
      console.error('No se pudo cargar el logo:', e);
    }

    // ---- BLOQUE CONTACTO (derecha, totalmente alineado a la derecha) ----
    const contactX = pageWidth - rightMargin;
    let cy = logoTop + 1; // arranca a nivel del logo
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

    // ---- BLOQUE DE SERVICIOS (debajo del logo; en bold y sin superposición) ----
    let sy = logoTop + LOGO_H + UNDER_LOGO_GAP; // asegura que no pise el logo
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Renderizar encabezado
    let yPosition = await PDFGenerator.renderHeader(
      doc, pageWidth, 20, 20, 20 + 12, presupuesto
    );

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Cliente', 20, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${presupuesto.cliente_nombre}`, 20, yPosition);
    yPosition += 5;
    if (presupuesto.cliente_email) {
      doc.text(`Email: ${presupuesto.cliente_email}`, 20, yPosition);
      yPosition += 5;
    }
    if (presupuesto.cliente_telefono) {
      doc.text(`Teléfono: ${presupuesto.cliente_telefono}`, 20, yPosition);
      yPosition += 5;
    }

    yPosition += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información del Vendedor', 20, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vendedor: ${presupuesto.vendedor?.full_name || 'N/A'}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Email: ${presupuesto.vendedor?.email || 'N/A'}`, 20, yPosition);
    yPosition += 10;

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
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
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
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    if (solicitudAprobada) {
      doc.setFillColor(219, 234, 254);
      doc.rect(20, yPosition, pageWidth - 40, 30, 'F');

      yPosition += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216);
      doc.text('Descuento Aprobado', 25, yPosition);

      yPosition += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const estadoText =
        solicitudAprobada.estado === 'APROBADO_MODIFICADO'
          ? 'APROBADO CON MODIFICACIÓN'
          : 'APROBADO';
      doc.text(`Estado: ${estadoText}`, 25, yPosition);

      yPosition += 4;
      doc.text(`Tipo: ${solicitudAprobada.tipo}`, 25, yPosition);

      yPosition += 4;
      const valorAprobado = solicitudAprobada.valor_aprobado || 0;
      if (solicitudAprobada.tipo === 'PORCENTAJE') {
        doc.text(`Descuento: ${valorAprobado}%`, 25, yPosition);
      } else {
        doc.text(
          `Descuento: ${BudgetCalculator.formatCurrency(
            valorAprobado,
            presupuesto.moneda
          )}`,
          25,
          yPosition
        );
      }

      yPosition += 4;
      doc.text(
        `Aprobado el: ${new Date(
          solicitudAprobada.applied_at || ''
        ).toLocaleDateString()}`,
        25,
        yPosition
      );

      if (solicitudAprobada.comentario_admin) {
        yPosition += 4;
        doc.text(`Observaciones: ${solicitudAprobada.comentario_admin}`, 25, yPosition);
      }

      yPosition += 10;
    }

    const summaryStartY = yPosition;
    const summaryX = pageWidth - 70;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text('Total Bruto:', summaryX, summaryStartY);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_bruto, presupuesto.moneda),
      summaryX + 50,
      summaryStartY,
      { align: 'right' }
    );

    if (presupuesto.total_descuento > 0) {
      doc.text('Descuento:', summaryX, summaryStartY + 5);
      doc.setTextColor(220, 38, 38);
      doc.text(
        `- ${BudgetCalculator.formatCurrency(
          presupuesto.total_descuento,
          presupuesto.moneda
        )}`,
        summaryX + 50,
        summaryStartY + 5,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.text('Total Neto:', summaryX, summaryStartY + 10);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_neto, presupuesto.moneda),
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
      BudgetCalculator.formatCurrency(
        presupuesto.total_impuestos,
        presupuesto.moneda
      ),
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
      BudgetCalculator.formatCurrency(
        presupuesto.total_neto + presupuesto.total_impuestos,
        presupuesto.moneda
      ),
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

    const footerY = doc.internal.pageSize.getHeight() - 20;
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

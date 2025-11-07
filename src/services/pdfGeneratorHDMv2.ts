import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, User } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

export class HDMPDFGeneratorV2 {
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
    vendedor?: User
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const topMargin = 15;
    let yPosition = topMargin;

    // Watermark - "PRESUPUESTO" en diagonal
    this.addWatermark(doc, pageWidth, pageHeight);

    // Logo
    try {
      const logoBase64 = await this.loadImageAsBase64('/hdm-logo.png');
      doc.addImage(logoBase64, 'PNG', leftMargin, yPosition, 50, 15);
    } catch (error) {
      console.error('Error loading logo:', error);
    }

    // Información de contacto (derecha)
    const contactX = pageWidth - rightMargin;
    let contactY = yPosition;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Direccion: Profesor Almada C/21 de', contactX, contactY, { align: 'right' });
    contactY += 4;
    doc.text('setiembre', contactX, contactY, { align: 'right' });
    contactY += 4;
    doc.text('Luque - Paraguay', contactX, contactY, { align: 'right' });
    contactY += 4;
    doc.text('Email: hmino@hdm.com.py', contactX, contactY, { align: 'right' });
    contactY += 4;
    doc.text('Cel: +595981795669', contactX, contactY, { align: 'right' });
    contactY += 4;
    doc.text('Ruc: 80122639-2', contactX, contactY, { align: 'right' });

    yPosition = 35;

    // Servicios (debajo del logo)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistemas eléctricos de potencia - Obras civiles - Metalúrgica', leftMargin, yPosition);
    yPosition += 3.5;
    doc.text('Domotica - Electrónica de Potencia - Media Tensión 23kV', leftMargin, yPosition);
    yPosition += 3.5;
    doc.text('Mediciones Eléctricas - Gestoria ANDE - Asesoria Energética', leftMargin, yPosition);

    // Logo Mecarpa (si existe)
    yPosition += 6;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('MECARPA', leftMargin + 5, yPosition);

    yPosition = 55;

    // Título "Presupuesto #"
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Presupuesto #: ${presupuesto.codigo}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition = 70;

    // Información del cliente
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text('Fecha:', leftMargin, yPosition);
    doc.text(new Date(presupuesto.created_at).toLocaleDateString('es-PY'), leftMargin + 30, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Señores:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.cliente_nombre.toUpperCase(), leftMargin + 30, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Referencia de', leftMargin, yPosition);
    yPosition += 5;
    doc.text('presupuesto:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.concepto || 'N/A', leftMargin + 30, yPosition);
    yPosition += 8;

    // Texto introductorio
    doc.setFont('helvetica', 'normal');
    const introText = 'Tengo el agrado de dirigirme a Ud. A fin de presentar la oferta económica por el trabajo de referencia a ser realizado.';
    const splitIntro = doc.splitTextToSize(introText, pageWidth - leftMargin - rightMargin);
    doc.text(splitIntro, leftMargin, yPosition);
    yPosition += splitIntro.length * 5 + 3;

    // "Trabajos a ser Realizados:"
    doc.setFont('helvetica', 'bold');
    doc.text('Trabajos a ser Realizados:', leftMargin, yPosition);
    yPosition += 8;

    // Tabla de items
    const tableData = presupuesto.items?.map((item, index) => [
      (index + 1).toString(),
      item.descripcion,
      item.cantidad.toFixed(2),
      item.unidad_medida || 'UNID',
      BudgetCalculator.formatNumber(item.precio_unitario),
      BudgetCalculator.formatNumber(item.total || (item.cantidad * item.precio_unitario))
    ]) || [];

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Item|Grp', 'Descripción', 'Cantidad', 'Unidad', 'P.Unitario', 'Sub Total']],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 15, halign: 'left' },
        2: { cellWidth: 65, halign: 'left' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: leftMargin, right: rightMargin },
      didDrawPage: (data) => {
        // Agregar watermark en cada página
        this.addWatermark(doc, pageWidth, pageHeight);
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;

    // Total
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const totalText = `TOTAL Gs.: ${BudgetCalculator.formatNumber(presupuesto.total_neto + presupuesto.total_impuestos)}`;
    doc.text(totalText, pageWidth - rightMargin, yPosition, { align: 'right' });
    yPosition += 8;

    // Forma de pago
    doc.setFont('helvetica', 'bold');
    doc.text('Forma de pago:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.condicion_pago || 'CONTADO', leftMargin + 35, yPosition);
    yPosition += 8;

    // Observaciones
    if (presupuesto.observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observación(es):', leftMargin, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      const obsText = doc.splitTextToSize(presupuesto.observaciones, pageWidth - leftMargin - rightMargin);
      doc.text(obsText, leftMargin, yPosition);
      yPosition += obsText.length * 5;
    }

    yPosition += 3;

    // Nota de IVA
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('* Los precios incluyen IVA.', leftMargin, yPosition);
    yPosition += 8;

    // Texto de cierre
    doc.setFontSize(9);
    doc.text('Estamos a su disposición ante cualquier consulta.', leftMargin, yPosition);

    // Firma (para admin y administrativo)
    if (vendedor && (vendedor.role === 'admin' || vendedor.role === 'administrativo')) {
      yPosition = pageHeight - 40;

      // Si hay firma, agregarla
      if (vendedor.signature_url) {
        try {
          const signatureBase64 = await this.loadImageAsBase64(vendedor.signature_url);
          doc.addImage(signatureBase64, 'PNG', pageWidth - rightMargin - 60, yPosition, 50, 20);
        } catch (error) {
          console.error('Error loading signature:', error);
        }
      }

      yPosition += 25;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('...........................', pageWidth - rightMargin - 30, yPosition, { align: 'center' });
      yPosition += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Ing. Hernan Miño', pageWidth - rightMargin - 30, yPosition, { align: 'center' });
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.text('Cat. A - 7822', pageWidth - rightMargin - 30, yPosition, { align: 'center' });
    } else if (vendedor?.signature_url) {
      // Para vendedores, mostrar su propia firma
      yPosition = pageHeight - 35;
      try {
        const signatureBase64 = await this.loadImageAsBase64(vendedor.signature_url);
        doc.addImage(signatureBase64, 'PNG', pageWidth - rightMargin - 60, yPosition, 50, 20);
      } catch (error) {
        console.error('Error loading signature:', error);
      }
      yPosition += 25;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(vendedor.full_name, pageWidth - rightMargin - 30, yPosition, { align: 'center' });
    }

    // Footer
    const footerY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('HDM Ingeniería S.A.', leftMargin, footerY);
    doc.text('Presupuesto', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Página 1 de 1', pageWidth - rightMargin, footerY, { align: 'right' });

    return doc;
  }

  static async downloadPresupuestoPDF(presupuesto: Presupuesto, vendedor?: User): Promise<void> {
    const doc = await this.generatePresupuestoPDF(presupuesto, vendedor);
    doc.save(`Presupuesto_${presupuesto.codigo}_${presupuesto.cliente_nombre}.pdf`);
  }

  static async previewPresupuestoPDF(presupuesto: Presupuesto, vendedor?: User): Promise<void> {
    try {
      console.log('🔍 Starting PDF preview generation...');
      const doc = await this.generatePresupuestoPDF(presupuesto, vendedor);
      console.log('✅ PDF document generated successfully');

      const pdfBlob = doc.output('blob');
      console.log('✅ PDF blob created, size:', pdfBlob.size, 'bytes');

      const pdfUrl = URL.createObjectURL(pdfBlob);
      console.log('✅ PDF URL created:', pdfUrl);

      const newWindow = window.open(pdfUrl, '_blank');
      if (!newWindow) {
        console.error('❌ Popup blocked! Trying alternative method...');
        // Alternative: download if popup is blocked
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `presupuesto_${presupuesto.codigo}.pdf`;
        link.click();
        alert('El navegador bloqueó la ventana emergente. El PDF se descargará automáticamente.');
      } else {
        console.log('✅ PDF opened in new window');
      }
    } catch (error) {
      console.error('❌ Error generating PDF preview:', error);
      alert('Error al generar la vista previa del PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      throw error;
    }
  }

  private static addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(100);
    doc.setFont('helvetica', 'bold');

    // Rotar y centrar el texto "PRESUPUESTO"
    const text = 'PRESUPUESTO';
    doc.text(text, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });

    doc.restoreGraphicsState();
  }
}

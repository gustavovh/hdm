import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, PresupuestoImagen } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

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
    imagenes: PresupuestoImagen[] = []
  ): Promise<jsPDF> {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 15;
    const rightMargin = 15;
    const topMargin = 15;
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
    doc.text('Domotica - Electrónica de Potencia - Media Tensión 23kV', leftMargin, yPosition);
    yPosition += 3;
    doc.text('Mediciones Eléctricas - Gesteria ANDE - Asesoria Energética', leftMargin, yPosition);

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
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = topMargin;
    } else {
      yPosition += 20;
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('_______________________', pageWidth - rightMargin - 45, yPosition);
    yPosition += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Ing. Hernan Miño', pageWidth - rightMargin - 42, yPosition);
    yPosition += 4;
    doc.text('Cat. A - 7822', pageWidth - rightMargin - 42, yPosition);

    return doc;
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

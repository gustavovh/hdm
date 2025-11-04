import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

export class HDMPDFGenerator {
  static generatePresupuestoPDF(presupuesto: Presupuesto): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 16, 46);
    doc.text('HDM', 20, yPosition);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Ingeniería S.A.', 20, yPosition + 8);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistemas eléctricos de potencia - Obras civiles - Metalúrgica', 20, yPosition + 14);
    doc.text('Domotica - Electrónica de Potencia - Media Tensión 23kV', 20, yPosition + 17);
    doc.text('Mediciones Eléctricas - Gesteria ANDE - Asesoria Energética', 20, yPosition + 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Direccion: Profesor Almada C/21 de', pageWidth - 20, yPosition, { align: 'right' });
    doc.text('setiembre', pageWidth - 20, yPosition + 3, { align: 'right' });
    doc.text('Luque - Paraguay', pageWidth - 20, yPosition + 6, { align: 'right' });
    doc.text('Email: hmino@hdm.com.py', pageWidth - 20, yPosition + 9, { align: 'right' });
    doc.text('Cel: +595981795669', pageWidth - 20, yPosition + 12, { align: 'right' });
    doc.text('Ruc: 80122639-2', pageWidth - 20, yPosition + 15, { align: 'right' });

    yPosition = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Presupuesto #: ${presupuesto.codigo}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition = 65;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text('Fecha:', 20, yPosition);
    doc.text(new Date(presupuesto.created_at).toLocaleDateString('es-PY'), 50, yPosition);

    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Señores:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.cliente_nombre.toUpperCase(), 50, yPosition);

    if (presupuesto.cliente_ruc) {
      yPosition += 5;
      doc.text('RUC:', 50, yPosition);
      doc.text(presupuesto.cliente_ruc, 65, yPosition);
    }

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Referencia de', 20, yPosition);
    doc.text('presupuesto:', 20, yPosition + 4);
    doc.setFont('helvetica', 'normal');
    const concepto = presupuesto.concepto || 'PRESUPUESTO DE SERVICIOS';
    const conceptoLines = doc.splitTextToSize(concepto.toUpperCase(), 130);
    doc.text(conceptoLines, 50, yPosition);

    yPosition += (conceptoLines.length * 4) + 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Tengo el agrado de dirigirme a Ud. A fin de presentar la oferta económica por el trabajo de', 20, yPosition);
    yPosition += 4;
    doc.text('referencia a ser realizado.', 20, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Trabajos a ser Realizados:', 20, yPosition);

    yPosition += 8;

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
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 70 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      styles: {
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 2;

    const currencySymbol = presupuesto.moneda === 'USD' ? '' : 'Gs.:';
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth - 51, yPosition, 51, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL ${currencySymbol}`, pageWidth - 50, yPosition + 5);
    doc.text(
      BudgetCalculator.formatCurrency(presupuesto.total_neto, presupuesto.moneda).replace('$', '').replace('₲', '').trim(),
      pageWidth - 22,
      yPosition + 5,
      { align: 'right' }
    );

    yPosition += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Forma de pago:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    const diasPago = presupuesto.dias_validez || 30;
    doc.text(`${diasPago}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 5;
    doc.text('DIAS', pageWidth - 20, yPosition, { align: 'right' });

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Observación(es):', 20, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');

    const observaciones = [
      'EL PRESUPUESTO CONTEMPLA 2 HORAS DE IZAJE, PASADO EL TIEMPO',
      'ESTABLECIDO, SE COBRARA UN ADICIONAL DE 192.500 POR HORA. EL',
      'PRESUPUESTO NO INCLUYE EL DESMONTAJE Y MONTAJE DE BARANDAS',
    ];

    observaciones.forEach(obs => {
      doc.text(obs, 20, yPosition);
      yPosition += 4;
    });

    yPosition += 2;
    doc.setFont('helvetica', 'normal');
    doc.text('* Los precios incluyen IVA.', 20, yPosition);

    yPosition += 8;
    doc.text('Estamos a su disposición ante cualquier consulta.', 20, yPosition);

    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'bold');
    doc.saveGraphicsState();
    doc.text('PROYECTO', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.restoreGraphicsState();

    const footerY = pageHeight - 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('_______________________', pageWidth - 60, footerY);
    yPosition = footerY + 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Ing. Hernan Miño', pageWidth - 55, yPosition);
    doc.text('Cat. A - 7822', pageWidth - 55, yPosition + 4);

    return doc;
  }

  static downloadPresupuestoPDF(presupuesto: Presupuesto): void {
    const doc = this.generatePresupuestoPDF(presupuesto);
    doc.save(`presupuesto-${presupuesto.codigo}.pdf`);
  }

  static previewPresupuestoPDF(presupuesto: Presupuesto): void {
    const doc = this.generatePresupuestoPDF(presupuesto);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  static getPDFBlob(presupuesto: Presupuesto): Blob {
    const doc = this.generatePresupuestoPDF(presupuesto);
    return doc.output('blob');
  }
}

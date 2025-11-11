import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto } from '../types/database.types';

export async function generateHDMStandardPDF(presupuesto: Presupuesto): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  addWatermark(doc, pageWidth, pageHeight);

  let yPosition = margin;

  yPosition = addHeader(doc, margin, yPosition, pageWidth, presupuesto);

  yPosition = addPresupuestoNumber(doc, pageWidth, yPosition, presupuesto);

  yPosition += 8;

  yPosition = addClientInfo(doc, margin, yPosition, presupuesto);

  yPosition += 5;

  yPosition = addIntroText(doc, margin, yPosition, pageWidth);

  yPosition += 3;

  yPosition = addTrabajosTitle(doc, margin, yPosition);

  yPosition += 2;

  yPosition = await addItemsTable(doc, margin, yPosition, pageWidth, presupuesto);

  yPosition += 5;

  yPosition = addFormaPago(doc, margin, yPosition, presupuesto);

  yPosition += 5;

  addObservaciones(doc, margin, yPosition, pageWidth, presupuesto);

  return doc.output('blob');
}

function addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(80);
  doc.setFont('helvetica', 'bold');

  const text = 'PRESUPUESTO';
  const textWidth = doc.getTextWidth(text);
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  doc.text(text, centerX, centerY, {
    align: 'center',
    angle: 45,
  });

  doc.restoreGraphicsState();
}

function addHeader(doc: jsPDF, margin: number, yPosition: number, pageWidth: number, presupuesto: Presupuesto): number {
  const logoWidth = 80;
  const logoHeight = 45;

  try {
    const logoPath = '/hdm-logo.png';
    doc.addImage(logoPath, 'PNG', margin, yPosition, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Logo no disponible');
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('HDM', margin + logoWidth + 5, yPosition + 8);

  doc.setFontSize(14);
  doc.text('Ingeniería S.A.', margin + logoWidth + 5, yPosition + 15);

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  const servicesLines = [
    'Sistemas eléctricos de potencia - Obras civiles - Metalúrgica',
    'Domótica - Electrónica de Potencia - Media Tensión 23kV',
    'Mediciones Eléctricas - Gestoría ANDE - Asesoría Energética'
  ];

  let serviceY = yPosition + 22;
  servicesLines.forEach(line => {
    doc.text(line, margin, serviceY);
    serviceY += 3.5;
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const contactLines = [
    'Dirección: Profesor Almada C/21 de',
    '              setiembre',
    '              Luque - Paraguay',
    '',
    'Email: hmino@hdm.com.py',
    'Cel: +595981795669',
    'Ruc: 80122639-2'
  ];

  let contactY = yPosition;
  contactLines.forEach(line => {
    doc.text(line, pageWidth - margin, contactY, { align: 'right' });
    contactY += 4;
  });

  return yPosition + logoHeight + 5;
}

function addPresupuestoNumber(doc: jsPDF, pageWidth: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  const label = 'Presupuesto #:';
  doc.text(label, pageWidth - 20, yPosition, { align: 'right' });

  const labelWidth = doc.getTextWidth(label);
  doc.setFont('times', 'normal');
  doc.text(` ${presupuesto.codigo}`, pageWidth - 20 - labelWidth, yPosition, { align: 'left' });

  return yPosition + 5;
}

function addClientInfo(doc: jsPDF, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);

  doc.text('Fecha:', margin, yPosition);
  doc.setFont('times', 'normal');
  const fecha = new Date(presupuesto.created_at).toLocaleDateString('es-PY');
  doc.text(fecha, margin + 20, yPosition);

  yPosition += 6;

  doc.setFont('times', 'bold');
  doc.text('Señores:', margin, yPosition);
  doc.setFont('times', 'normal');
  const clienteNombre = presupuesto.cliente_nombre.toUpperCase();
  const clienteLines = doc.splitTextToSize(clienteNombre, 150);
  doc.text(clienteLines, margin + 20, yPosition);
  yPosition += (clienteLines.length * 5);

  yPosition += 1;

  doc.setFont('times', 'bold');
  doc.text('Referencia de presupuesto:', margin, yPosition);
  doc.setFont('times', 'normal');
  const concepto = (presupuesto.concepto || 'PRESUPUESTO DE SERVICIOS').toUpperCase();
  const conceptoLines = doc.splitTextToSize(concepto, 130);
  doc.text(conceptoLines, margin + 55, yPosition);
  yPosition += (conceptoLines.length * 5);

  return yPosition;
}

function addIntroText(doc: jsPDF, margin: number, yPosition: number, pageWidth: number): number {
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const introText = 'Tengo el agrado de dirigirme a Ud. a fin de presentar la oferta económica por el trabajo de referencia a ser realizado.';
  const lines = doc.splitTextToSize(introText, pageWidth - (margin * 2));
  doc.text(lines, margin, yPosition);
  return yPosition + (lines.length * 5);
}

function addTrabajosTitle(doc: jsPDF, margin: number, yPosition: number): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Trabajos a ser Realizados:', margin, yPosition);
  return yPosition + 2;
}

async function addItemsTable(doc: jsPDF, margin: number, yPosition: number, pageWidth: number, presupuesto: Presupuesto): Promise<number> {
  const tableData = presupuesto.items?.map((item, index) => [
    (index + 1).toString(),
    (index + 1).toString(),
    item.descripcion.toUpperCase(),
    formatNumber(item.cantidad),
    item.unidad || 'UNID',
    formatCurrency(item.precio_unitario),
    formatCurrency(item.subtotal)
  ]) || [];

  autoTable(doc, {
    startY: yPosition,
    head: [[
      '#',
      'Item/Grp',
      'Descripción',
      'Cantidad',
      'Unidad',
      'P.Unitario',
      'Sub Total'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 10,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 15 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  const totalBruto = presupuesto.total_neto;

  autoTable(doc, {
    startY: finalY,
    body: [[
      '',
      '',
      '',
      '',
      '',
      'TOTAL Gs.:',
      formatCurrency(totalBruto)
    ]],
    theme: 'plain',
    styles: {
      font: 'times',
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 15 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', cellWidth: 25 },
    },
    margin: { left: margin, right: margin },
  });

  return (doc as any).lastAutoTable.finalY;
}

function addFormaPago(doc: jsPDF, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Forma de pago:', margin, yPosition);

  const formaPago = presupuesto.observaciones?.match(/forma de pago:?\s*([^\n]+)/i)?.[1] || '30 DIAS';
  doc.text(formaPago.toUpperCase(), margin + 35, yPosition);

  return yPosition;
}

function addObservaciones(doc: jsPDF, margin: number, yPosition: number, pageWidth: number, presupuesto: Presupuesto) {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Observación(es):', margin, yPosition);
  yPosition += 5;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  const observaciones = presupuesto.observaciones ||
    'EL ALCANCE DEL TRABAJO INCLUYE LA CONEXION DE TODOS LOS COMPONENTES, MEDICION Y MONITOREO DEL FUNCIONAMIENTO UNA VEZ REALIZADA LA INSTALACION.';

  const obsLines = doc.splitTextToSize(observaciones.toUpperCase(), pageWidth - (margin * 2));
  doc.text(obsLines, margin, yPosition);
  yPosition += (obsLines.length * 5) + 3;

  doc.setFont('times', 'normal');
  doc.text('* Los precios incluyen IVA.', margin, yPosition);
  yPosition += 5;

  doc.text('Estamos a su disposición ante cualquier consulta.', margin, yPosition);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

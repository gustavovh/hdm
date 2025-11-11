import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto } from '../types/database.types';
import { supabase } from '../lib/supabase';

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

  const vendedorSignature = await loadVendedorSignature(presupuesto.vendedor_id);

  let yPosition = margin;

  yPosition = await addHeader(doc, margin, yPosition, pageWidth);

  yPosition += 5;

  const presupuestoNumberY = yPosition;
  yPosition = addPresupuestoNumber(doc, pageWidth, margin, yPosition, presupuesto);

  yPosition += 10;

  yPosition = addClientInfo(doc, margin, yPosition, presupuesto);

  yPosition += 8;

  yPosition = addIntroText(doc, margin, yPosition, pageWidth);

  yPosition += 8;

  yPosition = addTrabajosTitle(doc, margin, yPosition);

  yPosition += 5;

  yPosition = await addItemsTable(doc, margin, yPosition, pageWidth, presupuesto);

  yPosition += 10;

  yPosition = addFormaPago(doc, margin, yPosition, presupuesto);

  yPosition += 8;

  yPosition = addObservaciones(doc, margin, yPosition, pageWidth, presupuesto);

  yPosition += 15;

  addSignature(doc, yPosition, pageWidth, vendedorSignature, presupuesto);

  return doc.output('blob');
}

function addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.setFont('times', 'bold');
  doc.setFontSize(70);
  doc.setTextColor(120, 120, 120);

  const text = 'PRESUPUESTO';
  const angle = 45;
  const angleRad = (angle * Math.PI) / 180;

  const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);

  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  const offsetX = (diagonal / 2) * Math.cos(angleRad);
  const offsetY = (diagonal / 2) * Math.sin(angleRad);

  const startX = centerX - offsetX * 0.3;
  const startY = centerY + offsetY * 0.3;

  doc.text(text, startX, startY, {
    angle: angle,
    align: 'center',
    baseline: 'middle',
  });

  doc.restoreGraphicsState();
}

async function loadVendedorSignature(vendedorId: string): Promise<string | null> {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('signature_url')
      .eq('id', vendedorId)
      .single();

    if (userData?.signature_url) {
      const { data } = await supabase.storage
        .from('signatures')
        .createSignedUrl(userData.signature_url, 60);

      return data?.signedUrl || null;
    }
    return null;
  } catch (error) {
    console.warn('Error cargando firma del vendedor:', error);
    return null;
  }
}


async function addHeader(doc: jsPDF, margin: number, yPosition: number, pageWidth: number): Promise<number> {
  const logoHeight = 35;
  const logoWidth = 60;

  try {
    const response = await fetch('/hdm-logo.png');
    const blob = await response.blob();
    const reader = new FileReader();

    await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const logoData = reader.result as string;
    doc.addImage(logoData, 'PNG', margin, yPosition, logoWidth, logoHeight, undefined, 'FAST');
  } catch (error) {
    console.warn('Logo no disponible', error);
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const servicesLines = [
    'Sistemas eléctricos de potencia - Obras civiles - Metalúrgica',
    'Domótica - Electrónica de Potencia - Media Tensión 23kV',
    'Mediciones Eléctricas - Gestoría ANDE - Asesoría Energética'
  ];

  let serviceY = yPosition + logoHeight + 3;
  servicesLines.forEach(line => {
    doc.text(line, margin, serviceY);
    serviceY += 5;
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(12);

  const rightMargin = pageWidth - margin;
  let contactY = yPosition + 5;

  doc.text('Dirección: Profesor Almada C/21 de', rightMargin, contactY, { align: 'right' });
  contactY += 6;
  doc.text('              setiembre', rightMargin, contactY, { align: 'right' });
  contactY += 6;
  doc.text('              Luque - Paraguay', rightMargin, contactY, { align: 'right' });
  contactY += 8;

  doc.text('Email: hmino@hdm.com.py', rightMargin, contactY, { align: 'right' });
  contactY += 6;
  doc.text('Cel: +595981795669', rightMargin, contactY, { align: 'right' });
  contactY += 6;
  doc.text('Ruc: 80122639-2', rightMargin, contactY, { align: 'right' });

  return Math.max(serviceY, contactY) + 5;
}

function formatPresupuestoCode(codigo: string): string {
  const parts = codigo.split('-');
  if (parts.length === 3) {
    const part1 = parts[0].padStart(3, '0');
    const part2 = parts[1].padStart(3, '0');
    const part3 = parts[2].padStart(8, '0');
    return `${part1}-${part2}-${part3}`;
  }
  return codigo;
}

function addPresupuestoNumber(doc: jsPDF, pageWidth: number, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(14);

  const rightMargin = pageWidth - margin;
  const formattedCode = formatPresupuestoCode(presupuesto.codigo);
  const text = `Presupuesto #: ${formattedCode}`;

  doc.text(text, rightMargin, yPosition, { align: 'right' });

  return yPosition;
}

function addClientInfo(doc: jsPDF, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(13);

  const labelWidth = 60;

  doc.text('Fecha:', margin, yPosition);
  doc.setFont('times', 'normal');
  const fecha = new Date(presupuesto.created_at).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(fecha, margin + labelWidth, yPosition);

  yPosition += 8;

  doc.setFont('times', 'bold');
  doc.text('Señores:', margin, yPosition);
  doc.setFont('times', 'normal');
  const clienteNombre = presupuesto.cliente_nombre.toUpperCase();
  const clienteLines = clienteNombre.split('\n');

  clienteLines.forEach((line, index) => {
    doc.text(line, margin + labelWidth, yPosition + (index * 7));
  });

  yPosition += (clienteLines.length * 7);

  yPosition += 2;

  doc.setFont('times', 'bold');
  const refLabel = 'Referencia de presupuesto:';
  doc.text(refLabel, margin, yPosition);

  doc.setFont('times', 'normal');
  const concepto = (presupuesto.concepto || 'PRESUPUESTO DE SERVICIOS').toUpperCase();
  const conceptoLines = concepto.split('\n');

  conceptoLines.forEach((line, index) => {
    doc.text(line, margin + labelWidth, yPosition + (index * 7));
  });

  yPosition += (conceptoLines.length * 7);

  return yPosition;
}

function addIntroText(doc: jsPDF, margin: number, yPosition: number, pageWidth: number): number {
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  const introText = 'Tengo el agrado de dirigirme a Ud. a fin de presentar la oferta económica por el trabajo de referencia a ser realizado.';
  const lines = doc.splitTextToSize(introText, pageWidth - (margin * 2));
  doc.text(lines, margin, yPosition);
  return yPosition + (lines.length * 7);
}

function addTrabajosTitle(doc: jsPDF, margin: number, yPosition: number): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('Trabajos a ser Realizados:', margin, yPosition);
  return yPosition;
}

async function addItemsTable(doc: jsPDF, margin: number, yPosition: number, pageWidth: number, presupuesto: Presupuesto): Promise<number> {
  const tableData = presupuesto.items?.map((item, index) => [
    (index + 1).toString(),
    item.item_grupo || (index + 1).toString(),
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
      'Item',
      'Descripción',
      'Cant.',
      'Unidad',
      'P.Unit.',
      'Sub Total'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'times',
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      minCellHeight: 8,
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', cellWidth: 27 },
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
      fontSize: 11,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 15 },
      2: { cellWidth: 70 },
      3: { cellWidth: 15 },
      4: { cellWidth: 18 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', cellWidth: 27 },
    },
    margin: { left: margin, right: margin },
  });

  return (doc as any).lastAutoTable.finalY;
}

function addFormaPago(doc: jsPDF, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(13);

  const labelText = 'Forma de pago:';
  doc.text(labelText, margin, yPosition);

  const formaPago = presupuesto.observaciones?.match(/forma de pago:?\s*([^\n]+)/i)?.[1] || '30 DIAS';
  doc.setFont('times', 'normal');
  doc.text(formaPago.toUpperCase(), margin + 45, yPosition);

  return yPosition;
}

function addObservaciones(doc: jsPDF, margin: number, yPosition: number, pageWidth: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('Observación(es):', margin, yPosition);
  yPosition += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(12);

  const observaciones = presupuesto.observaciones ||
    'PRUEBAS DE DESCRIPCION';

  const obsLines = doc.splitTextToSize(observaciones.toUpperCase(), pageWidth - (margin * 2));
  doc.text(obsLines, margin, yPosition);
  yPosition += (obsLines.length * 6) + 5;

  doc.setFont('times', 'normal');
  doc.text('* Los precios incluyen IVA.', margin, yPosition);
  yPosition += 6;

  doc.text('Estamos a su disposición ante cualquier consulta.', margin, yPosition);

  return yPosition;
}

function addSignature(doc: jsPDF, yPosition: number, pageWidth: number, signatureUrl: string | null, presupuesto: Presupuesto) {
  const margin = 20;
  const signatureY = yPosition;

  if (signatureUrl) {
    try {
      const signatureWidth = 40;
      const signatureHeight = 20;
      const signatureX = (pageWidth - signatureWidth) / 2;

      doc.addImage(signatureUrl, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
    } catch (error) {
      console.warn('Error añadiendo firma:', error);
    }
  }

  const vendedorName = presupuesto.vendedor?.full_name || 'HDM Ingeniería S.A.';

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  const nameWidth = doc.getTextWidth(vendedorName);
  const lineStartX = (pageWidth - nameWidth) / 2;
  const lineEndX = (pageWidth + nameWidth) / 2;

  doc.setLineWidth(0.5);
  doc.line(lineStartX, signatureY + 25, lineEndX, signatureY + 25);

  doc.text(vendedorName, pageWidth / 2, signatureY + 30, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('DEPARTAMENTO COMERCIAL', pageWidth / 2, signatureY + 36, { align: 'center' });
  doc.text('HDM INGENIERIA S.A.', pageWidth / 2, signatureY + 41, { align: 'center' });
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

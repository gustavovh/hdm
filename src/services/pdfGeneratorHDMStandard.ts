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

  const { signatureUrl, vendedorName } = await loadVendedorData(presupuesto.vendedor_id);

  let yPosition = margin;

  // Header returns Y final justo debajo del bloque de logo/contacto (sin padding extra)
  yPosition = await addHeader(doc, margin, yPosition, pageWidth);

  // Eliminado el +5 extra para "subir" el cuerpo del documento
  yPosition = addPresupuestoNumber(doc, pageWidth, margin, yPosition, presupuesto);

  // Reducimos espacios para aprovechar la página
  yPosition += 6;

  yPosition = addClientInfo(doc, margin, yPosition, presupuesto);

  yPosition += 6;

  yPosition = addIntroText(doc, margin, yPosition, pageWidth);

  yPosition += 6;

  yPosition = addTrabajosTitle(doc, margin, yPosition);

  yPosition += 4;

  yPosition = await addItemsTable(doc, margin, yPosition, pageWidth, presupuesto);

  yPosition += 8;

  yPosition = addFormaPago(doc, margin, yPosition, presupuesto);

  yPosition += 6;

  yPosition = addObservaciones(doc, margin, yPosition, pageWidth, presupuesto);

  // Ajuste para evitar que la firma pase a segunda página:
  const signatureHeight = 30; // reducido
  const bottomMargin = 20; // queremos dejar ~18-22mm de aire
  const bottomLimit = pageHeight - bottomMargin;

  if (yPosition + signatureHeight > bottomLimit) {
    // Si no cabe, intentamos reducir saltos: agregar nueva página solo si es imprescindible
    doc.addPage();
    yPosition = await addHeader(doc, margin, margin, pageWidth);
    yPosition += 4;
    addPresupuestoNumber(doc, pageWidth, margin, yPosition, presupuesto);
    yPosition += 10;
  }

  // Mantener la firma (si existe) — posicionada con menos altura para evitar overflow
  addSignature(doc, yPosition, pageWidth, signatureUrl, vendedorName, presupuesto);

  // Agregar páginas de ANEXO con imágenes si existen
  await addAnexoPages(doc, presupuesto.id, pageWidth, pageHeight, margin);

  // Marca de agua en todas las páginas (opacidad 0.12, ángulo ~ -30deg)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermark(doc, pageWidth, pageHeight);
  }

  return doc.output('blob');
}

function addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  const gstate = new (doc as any).GState({ opacity: 0.12 });
  doc.setGState(gstate);
  doc.setTextColor(120, 120, 120);

  const fontSize = 80;
  doc.setFontSize(fontSize);
  doc.setFont('times', 'bold');

  const text = 'PRESUPUESTO';

  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  // Ángulo aproximado -30 grados para el watermark (diagonal suave)
  doc.text(text, centerX, centerY, {
    align: 'center',
    angle: -30,
  });

  doc.restoreGraphicsState();
}

async function loadVendedorData(vendedorId: string): Promise<{ signatureUrl: string | null; vendedorName: string }> {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('signature_url, full_name')
      .eq('id', vendedorId)
      .maybeSingle();

    const vendedorName = userData?.full_name || '';
    let signatureUrl: string | null = null;

    if (userData?.signature_url) {
      if (userData.signature_url.startsWith('http')) {
        try {
          const response = await fetch(userData.signature_url);
          const blob = await response.blob();
          signatureUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error cargando firma desde URL:', error);
        }
      } else {
        try {
          const { data } = await supabase.storage
            .from('images')
            .createSignedUrl(userData.signature_url, 60);

          if (data?.signedUrl) {
            const response = await fetch(data.signedUrl);
            const blob = await response.blob();
            signatureUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          console.error('Error cargando firma desde storage:', error);
        }
      }
    }

    return { signatureUrl, vendedorName };
  } catch (error) {
    console.error('Error cargando datos del vendedor:', error);
    return { signatureUrl: null, vendedorName: '' };
  }
}

async function loadVendedorSignature(vendedorId: string): Promise<string | null> {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('signature_url')
      .eq('id', vendedorId)
      .single();

    if (userData?.signature_url) {
      if (userData.signature_url.startsWith('http')) {
        const response = await fetch(userData.signature_url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const { data } = await supabase.storage
        .from('images')
        .createSignedUrl(userData.signature_url, 60);

      if (data?.signedUrl) {
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    }
    return null;
  } catch (error) {
    console.warn('Error cargando firma del vendedor:', error);
    return null;
  }
}

async function addHeader(doc: jsPDF, margin: number, yPosition: number, pageWidth: number): Promise<number> {
  // Logo: 8cm x 4.7cm -> en mm: 80mm x 47mm (ajustamos para unidad mm) — pero mantenemos proporciones: usar 70x22 como antes aproximado
  const logoWidth = 70;
  const logoHeight = 22;

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

  // FUENTE y TAMAÑO UNIFICADOS para header/servicios
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const servicesLines = [
    'Sistemas eléctricos de potencia - Obras civiles - Metalúrgica',
    'Domótica - Electrónica de Potencia - Media Tensión 23kV',
    'Mediciones Eléctricas - Gestoría ANDE - Asesoría Energética'
  ];

  // colocar las 3 líneas a 3-4mm debajo del logo (logoHeight + 3)
  let serviceY = yPosition + logoHeight + 3;
  servicesLines.forEach(line => {
    doc.text(line, margin, serviceY);
    serviceY += 4.5; // line-height aproximado equivalente a 1.25 de 11pt
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(11);

  const rightMargin = pageWidth - margin;
  let contactY = yPosition + 3;

  // Bloque de contacto alineado a la derecha, todas las líneas terminan en el mismo eje derecho
  doc.text('Dirección: Profesor Almada C/21 de', rightMargin, contactY, { align: 'right' });
  contactY += 5;
  doc.text('              setiembre', rightMargin, contactY, { align: 'right' });
  contactY += 5;
  doc.text('              Luque - Paraguay', rightMargin, contactY, { align: 'right' });
  contactY += 6;

  doc.text('Email: hmino@hdm.com.py', rightMargin, contactY, { align: 'right' });
  contactY += 5;
  doc.text('Cel: +595981795669', rightMargin, contactY, { align: 'right' });
  contactY += 5;
  doc.text('Ruc: 80122639-2', rightMargin, contactY, { align: 'right' });

  // returnar Y sin padding extra para permitir que el número de presupuesto quede alineado con la última línea de servicios
  return Math.max(serviceY, contactY);
}

function formatPresupuestoCode(codigo: string): string {
  const match = codigo.match(/PRE-(\d+)/);
  if (match) {
    const numero = parseInt(match[1]);
    return `001-001-${numero.toString().padStart(8, '0')}`;
  }
  return codigo;
}

function addPresupuestoNumber(doc: jsPDF, pageWidth: number, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);

  const rightMargin = pageWidth - margin;
  const formattedCode = formatPresupuestoCode(presupuesto.codigo);
  const text = `Presupuesto #: ${formattedCode}`;

  // Alineado a la derecha; su borde derecho coincide con el bloque de contacto (misma coordenada rightMargin)
  doc.text(text, rightMargin, yPosition, { align: 'right' });

  return yPosition;
}

function addClientInfo(doc: jsPDF, margin: number, yPosition: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);

  const labelWidth = 60;

  doc.text('Fecha:', margin, yPosition);
  doc.setFont('times', 'normal');
  const fecha = new Date(presupuesto.created_at).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(fecha, margin + labelWidth, yPosition);

  yPosition += 6;

  doc.setFont('times', 'bold');
  doc.text('Señores:', margin, yPosition);
  doc.setFont('times', 'normal');
  const clienteNombre = presupuesto.cliente_nombre.toUpperCase();
  const clienteLines = clienteNombre.split('\n');

  clienteLines.forEach((line, index) => {
    doc.text(line, margin + labelWidth, yPosition + (index * 6));
  });

  yPosition += (clienteLines.length * 6);

  yPosition += 2;

  doc.setFont('times', 'bold');
  const refLabel = 'Referencia de presupuesto:';
  doc.text(refLabel, margin, yPosition);

  doc.setFont('times', 'normal');
  const concepto = (presupuesto.concepto || 'PRESUPUESTO DE SERVICIOS').toUpperCase();
  const conceptoLines = concepto.split('\n');

  conceptoLines.forEach((line, index) => {
    doc.text(line, margin + labelWidth, yPosition + (index * 6));
  });

  yPosition += (conceptoLines.length * 6);

  return yPosition;
}

function addIntroText(doc: jsPDF, margin: number, yPosition: number, pageWidth: number): number {
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const introText = 'Tengo el agrado de dirigirme a Ud. a fin de presentar la oferta económica por el trabajo de referencia a ser realizado.';
  const lines = doc.splitTextToSize(introText, pageWidth - (margin * 2));
  doc.text(lines, margin, yPosition);
  return yPosition + (lines.length * 6);
}

function addTrabajosTitle(doc: jsPDF, margin: number, yPosition: number): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
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

  // Unificar fuentes/tamaños en la tabla: Times, 11pt
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
      fontSize: 11,
      cellPadding: 2.5,
      lineWidth: 0.75,
      lineColor: [0, 0, 0],
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 11,
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8,
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      minCellHeight: 8,
      fontSize: 11,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'left', cellWidth: pageWidth - (margin * 2) - (10+15+15+18+25+27) }, // descripción ocupa el resto
      3: { halign: 'right', cellWidth: 15 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', cellWidth: 27 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: async (data) => {
      const currentPage = data.pageNumber;
      doc.setPage(currentPage);

      if (currentPage > 1) {
        const headerEndY = await addHeader(doc, margin, margin, pageWidth);
        addPresupuestoNumber(doc, pageWidth, margin, headerEndY + 2, presupuesto);
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  // Fila TOTAL: render manual con borde superior 1pt para enfatizar
  const totalBruto = presupuesto.total_neto;
  const tY = finalY + 4;

  // Dibujar linea superior de 1pt antes de la fila total
  doc.setLineWidth(1);
  const tableLeftX = margin;
  const tableRightX = pageWidth - margin;
  doc.line(tableLeftX, tY - 2, tableRightX, tY - 2);

  // Dibujar la fila total con celdas en sus posiciones (manteniendo alineaciones)
  // Reutilizamos autoTable para consistencia visual pero con theme plain
  autoTable(doc, {
    startY: tY,
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
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 15 },
      2: { cellWidth: pageWidth - (margin * 2) - (10+15+15+18+25+27) },
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
  doc.setFontSize(11);

  const labelText = 'Forma de pago:';
  doc.text(labelText, margin, yPosition);

  // mantener en la misma línea el valor, separación ~8mm desde la tabla (se usa 45 como offset)
  const formaPago = presupuesto.observaciones?.match(/forma de pago:?\s*([^\n]+)/i)?.[1] || '30 DIAS';
  doc.setFont('times', 'normal');
  doc.text(formaPago.toUpperCase(), margin + 45, yPosition);

  return yPosition;
}

function addObservaciones(doc: jsPDF, margin: number, yPosition: number, pageWidth: number, presupuesto: Presupuesto): number {
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('Observación(es):', margin, yPosition);
  yPosition += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);

  const observaciones = presupuesto.observaciones ||
    'PRUEBAS DE DESCRIPCION';

  const obsLines = doc.splitTextToSize(observaciones.toUpperCase(), pageWidth - (margin * 2));
  doc.text(obsLines, margin, yPosition);
  yPosition += (obsLines.length * 6) + 4;

  doc.setFont('times', 'normal');
  doc.text('* Los precios incluyen IVA.', margin, yPosition);
  yPosition += 5;

  doc.text('Estamos a su disposición ante cualquier consulta.', margin, yPosition);
  yPosition += 6;

  return yPosition;
}

function addSignature(doc: jsPDF, yPosition: number, pageWidth: number, signatureUrl: string | null, vendedorName: string, presupuesto: Presupuesto) {
  const margin = 20;
  const signatureY = yPosition + 6;
  const maxWidth = 60;

  const signatureX = pageWidth - margin - maxWidth;

  if (signatureUrl) {
    try {
      let imageType = 'PNG';
      if (signatureUrl.includes('data:image/jpeg') || signatureUrl.includes('data:image/jpg')) {
        imageType = 'JPEG';
      } else if (signatureUrl.includes('data:image/png')) {
        imageType = 'PNG';
      }

      const imgProps = doc.getImageProperties(signatureUrl);
      const imgRatio = imgProps.width / imgProps.height;

      let signatureWidth = maxWidth;
      let signatureHeight = maxWidth / imgRatio;
      const maxHeight = 25; // reducir altura para que no ocupe demasiado espacio

      if (signatureHeight > maxHeight) {
        signatureHeight = maxHeight;
        signatureWidth = maxHeight * imgRatio;
      }

      doc.addImage(signatureUrl, imageType, signatureX, signatureY, signatureWidth, signatureHeight);

      // Línea debajo de la firma
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(signatureX, signatureY + signatureHeight + 2, signatureX + signatureWidth, signatureY + signatureHeight + 2);

      // Detalles debajo (mínimos)
      let textY = signatureY + signatureHeight + 6;
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      if (vendedorName) {
        doc.text(vendedorName.toUpperCase(), signatureX + (signatureWidth / 2), textY, { align: 'center' });
        textY += 5;
      }
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text('DEPARTAMENTO COMERCIAL', signatureX + (signatureWidth / 2), textY, { align: 'center' });

    } catch (error) {
      console.error('Error añadiendo firma:', error);
      addSignatureDetails(doc, signatureX, signatureY, maxWidth, vendedorName);
    }
  } else {
    addSignatureDetails(doc, signatureX, signatureY, maxWidth, vendedorName);
  }
}

function addSignatureDetails(doc: jsPDF, x: number, y: number, width: number, vendedorName: string) {
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(x, y, x + width, y);

  let textY = y + 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  if (vendedorName) {
    doc.text(vendedorName.toUpperCase(), x + (width / 2), textY, { align: 'center' });
    textY += 5;
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('DEPARTAMENTO COMERCIAL', x + (width / 2), textY, { align: 'center' });
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

async function loadPresupuestoImages(presupuestoId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('presupuesto_imagenes')
      .select('url')
      .eq('presupuesto_id', presupuestoId)
      .order('orden', { ascending: true });

    if (error) throw error;

    const imageUrls: string[] = [];
    for (const img of data || []) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        imageUrls.push(base64);
      } catch (error) {
        console.warn('Error loading image:', error);
      }
    }

    return imageUrls;
  } catch (error) {
    console.error('Error loading presupuesto images:', error);
    return [];
  }
}

async function addAnexoPages(doc: jsPDF, presupuestoId: string, pageWidth: number, pageHeight: number, margin: number) {
  const images = await loadPresupuestoImages(presupuestoId);

  if (images.length === 0) return;

  for (let i = 0; i < images.length; i++) {
    doc.addPage();

    let yPosition = margin;

    yPosition = await addHeader(doc, margin, yPosition, pageWidth);
    yPosition += 8;

    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text('ANEXO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`Imagen ${i + 1} de ${images.length}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    try {
      const imgProps = doc.getImageProperties(images[i]);
      const imgRatio = imgProps.width / imgProps.height;

      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - yPosition - margin - 20;

      let imgWidth = maxWidth;
      let imgHeight = maxWidth / imgRatio;

      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight * imgRatio;
      }

      const imgX = (pageWidth - imgWidth) / 2;

      doc.addImage(images[i], 'JPEG', imgX, yPosition, imgWidth, imgHeight);
    } catch (error) {
      console.warn('Error adding image to PDF:', error);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text('Error al cargar la imagen', pageWidth / 2, yPosition, { align: 'center' });
    }
  }
}
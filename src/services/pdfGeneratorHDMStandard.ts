import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto } from '../types/database.types';
import { supabase } from '../lib/supabase';

const LOGO_WIDTH_MM = 50;
const LOGO_HEIGHT_MM = 13;

export async function generateHDMStandardPDF(presupuesto: Presupuesto): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  const { signatureUrl, vendedorName, isAdministrativo } = await loadVendedorData(presupuesto.vendedor_id);

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

  // Verificar si hay espacio suficiente para la firma
  // Espacio necesario para firma completa: 40mm es suficiente
  const signatureHeight = 40;
  const bottomMargin = 20; // Margen inferior aumentado
  const bottomLimit = pageHeight - bottomMargin;

  // Verificar si la firma cabe en la página actual
  if (yPosition + signatureHeight > bottomLimit) {
    // No hay espacio suficiente, crear nueva página
    doc.addPage();
    yPosition = await addHeader(doc, margin, margin, pageWidth);
    yPosition += 5;
    addPresupuestoNumber(doc, pageWidth, margin, yPosition, presupuesto);
    yPosition += 30;
  }

  // Agregar firma en la posición actual
  addSignature(doc, yPosition, pageWidth, signatureUrl, vendedorName, presupuesto, isAdministrativo);

  // Agregar páginas de ANEXO con imágenes si existen
  await addAnexoPages(doc, presupuesto.id, pageWidth, pageHeight, margin);

  // Agregar marca de agua en TODAS las páginas al final
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addWatermark(doc, pageWidth, pageHeight);
  }

  return doc.output('blob');
}

function addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.saveGraphicsState();
  const gstate = new (doc as any).GState({ opacity: 0.25 });
  doc.setGState(gstate);
  doc.setTextColor(100, 100, 100);

  const fontSize = 80;
  doc.setFontSize(fontSize);
  doc.setFont('times', 'bold');

  const text = 'PRESUPUESTO';
  const centerX = (pageWidth / 2) + 30;
  const watermarkY = pageHeight * 0.75;

  const angle = 45;

  doc.text(text, centerX, watermarkY, {
    align: 'center',
    baseline: 'middle',
    angle: angle
  });

  doc.restoreGraphicsState();
}


async function loadVendedorData(vendedorId: string): Promise<{ signatureUrl: string | null; vendedorName: string; isAdministrativo: boolean }> {
  try {
    console.log('Cargando datos del vendedor:', vendedorId);
    const { data: userData, error } = await supabase
      .from('users')
      .select('signature_url, full_name, role')
      .eq('id', vendedorId)
      .maybeSingle();

    console.log('Datos del usuario:', userData);
    console.log('Error al cargar usuario:', error);

    const vendedorName = userData?.full_name || '';
    console.log('Nombre del vendedor:', vendedorName);
    let signatureUrl: string | null = null;

    if (userData?.signature_url) {
      console.log('URL de firma encontrada:', userData.signature_url);
      // Si ya es una URL pública completa, usarla directamente
      if (userData.signature_url.startsWith('http')) {
        // Convertir la imagen a base64 para incluirla en el PDF
        try {
          const response = await fetch(userData.signature_url);
          const blob = await response.blob();
          signatureUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('Firma convertida a base64, longitud:', (reader.result as string).length);
              resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error cargando firma desde URL:', error);
        }
      } else {
        // Si es una ruta, buscar en el bucket 'images'
        try {
          const { data } = await supabase.storage
            .from('images')
            .createSignedUrl(userData.signature_url, 60);

          if (data?.signedUrl) {
            const response = await fetch(data.signedUrl);
            const blob = await response.blob();
            signatureUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                console.log('Firma del storage convertida a base64, longitud:', (reader.result as string).length);
                resolve(reader.result as string);
              };
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          console.error('Error cargando firma desde storage:', error);
        }
      }
    }

    const isAdministrativo = userData?.role === 'administrativo';
    console.log('Retornando datos - signatureUrl:', signatureUrl ? 'EXISTE' : 'NULL', 'vendedorName:', vendedorName, 'isAdministrativo:', isAdministrativo);
    return { signatureUrl, vendedorName, isAdministrativo };
  } catch (error) {
    console.error('Error cargando datos del vendedor:', error);
    return { signatureUrl: null, vendedorName: '', isAdministrativo: false };
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
      // Si ya es una URL pública completa, usarla directamente
      if (userData.signature_url.startsWith('http')) {
        // Convertir la imagen a base64 para incluirla en el PDF
        const response = await fetch(userData.signature_url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      // Si es una ruta, buscar en el bucket 'images'
      const { data } = await supabase.storage
        .from('images')
        .createSignedUrl(userData.signature_url, 60);

      if (data?.signedUrl) {
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
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
  const leftMargin = margin;
  const rightMargin = margin;
  const yTop = yPosition;
  
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
    const response = await fetch('/hdm-logo.png');
    const blob = await response.blob();
    const reader = new FileReader();

    await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const logoData = reader.result as string;

    // cargar dimensiones reales desde el DataURL para respetar el aspecto
    const tmpImg: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se pudo leer dimensiones del logo'));
      i.src = logoData;
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

    doc.addImage(logoData, 'PNG', leftMargin, logoY, scaledW, scaledH);
  } catch (error) {
    console.warn('Logo no disponible', error);
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

  // ---- SEPARADOR (debajo del mayor elemento) ----
  const maxBottom = Math.max(contactBottom, servicesBottom);
  const sepY = maxBottom + SEPARATOR_GAP;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(leftMargin, sepY, pageWidth - rightMargin, sepY);

  return sepY + 6;
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
    didDrawPage: async (data) => {
      const currentPage = data.pageNumber;
      doc.setPage(currentPage);

      // Si no es la primera página, agregar encabezado
      if (currentPage > 1) {
        const headerEndY = await addHeader(doc, margin, margin, pageWidth);
        addPresupuestoNumber(doc, pageWidth, margin, headerEndY + 5, presupuesto);
      }
      // NO agregar footer aquí, se agregará al final para todas las páginas
    },
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

function addSignature(doc: jsPDF, yPosition: number, pageWidth: number, signatureUrl: string | null, vendedorName: string, presupuesto: Presupuesto, isAdministrativo: boolean = false) {
  const margin = 20;
  const signatureY = yPosition + 10;
  const maxWidth = 60;

  // Posicionar en el margen derecho
  const signatureX = pageWidth - margin - maxWidth;

  if (signatureUrl) {
    try {
      console.log('Intentando agregar firma, URL length:', signatureUrl.length);

      const maxHeight = 30;

      // Detectar el tipo de imagen del data URL
      let imageType = 'PNG';
      if (signatureUrl.includes('data:image/jpeg') || signatureUrl.includes('data:image/jpg')) {
        imageType = 'JPEG';
      } else if (signatureUrl.includes('data:image/png')) {
        imageType = 'PNG';
      }

      // Obtener propiedades de la imagen desde jsPDF
      const imgProps = doc.getImageProperties(signatureUrl);
      console.log('Propiedades de imagen:', imgProps);

      const imgRatio = imgProps.width / imgProps.height;

      // Calcular dimensiones manteniendo aspect ratio
      let signatureWidth = maxWidth;
      let signatureHeight = maxWidth / imgRatio;

      // Si la altura calculada excede el máximo, ajustar por altura
      if (signatureHeight > maxHeight) {
        signatureHeight = maxHeight;
        signatureWidth = maxHeight * imgRatio;
      }

      console.log(`Agregando imagen: ${signatureWidth}x${signatureHeight} en (${signatureX}, ${signatureY})`);

      // Agregar imagen con proporciones correctas y tipo detectado
      doc.addImage(signatureUrl, imageType, signatureX, signatureY, signatureWidth, signatureHeight);

      // Línea debajo de la firma
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 0, 0);
      doc.line(signatureX, signatureY + signatureHeight + 2, signatureX + signatureWidth, signatureY + signatureHeight + 2);

      // Agregar detalles de la firma debajo
      let textY = signatureY + signatureHeight + 7;

      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Solo mostrar detalles si NO es administrativo
      if (!isAdministrativo) {
        // Nombre del vendedor (solo si existe)
        if (vendedorName) {
          doc.text(vendedorName.toUpperCase(), signatureX + (signatureWidth / 2), textY, { align: 'center' });
          textY += 5;
        }

        // Departamento
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.text('DEPARTAMENTO COMERCIAL', signatureX + (signatureWidth / 2), textY, { align: 'center' });
        textY += 5;

        // Empresa
        doc.text('HDM INGENIERIA S.A.', signatureX + (signatureWidth / 2), textY, { align: 'center' });
      }

      console.log('Firma agregada exitosamente');
    } catch (error) {
      console.error('Error añadiendo firma:', error);
      console.error('URL de firma (primeros 100 chars):', signatureUrl?.substring(0, 100));
      // Si hay error con la imagen, al menos mostrar los detalles
      addSignatureDetails(doc, signatureX, signatureY, maxWidth, vendedorName, isAdministrativo);
    }
  } else {
    console.log('No hay signatureUrl disponible');
    // Si no hay imagen de firma, mostrar solo los detalles
    addSignatureDetails(doc, signatureX, signatureY, maxWidth, vendedorName, isAdministrativo);
  }
}

function addSignatureDetails(doc: jsPDF, x: number, y: number, width: number, vendedorName: string, isAdministrativo: boolean = false) {
  // Solo mostrar detalles si NO es administrativo
  if (isAdministrativo) {
    return;
  }

  // Línea superior
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(x, y, x + width, y);

  let textY = y + 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Nombre del vendedor (solo si existe)
  if (vendedorName) {
    doc.text(vendedorName.toUpperCase(), x + (width / 2), textY, { align: 'center' });
    textY += 5;
  }

  // Departamento
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('DEPARTAMENTO COMERCIAL', x + (width / 2), textY, { align: 'center' });
  textY += 5;

  // Empresa
  doc.text('HDM INGENIERIA S.A.', x + (width / 2), textY, { align: 'center' });
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

    // Convertir URLs a base64 para incluir en el PDF
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

  // Agregar página para cada imagen
  for (let i = 0; i < images.length; i++) {
    doc.addPage();

    let yPosition = margin;

    // Agregar encabezado
    yPosition = await addHeader(doc, margin, yPosition, pageWidth);
    yPosition += 10;

    // Agregar título ANEXO
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text('ANEXO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Agregar número de anexo
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`Imagen ${i + 1} de ${images.length}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    try {
      // Calcular dimensiones de la imagen manteniendo aspect ratio
      const imgProps = doc.getImageProperties(images[i]);
      const imgRatio = imgProps.width / imgProps.height;

      // Área disponible para la imagen (reservar espacio para pie de página)
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - yPosition - margin - 20; // 20mm para el pie de página

      let imgWidth = maxWidth;
      let imgHeight = maxWidth / imgRatio;

      // Si la altura calculada excede el máximo, ajustar por altura
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight * imgRatio;
      }

      const imgX = (pageWidth - imgWidth) / 2;

      // Agregar imagen centrada
      doc.addImage(images[i], 'JPEG', imgX, yPosition, imgWidth, imgHeight);
    } catch (error) {
      console.warn('Error adding image to PDF:', error);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text('Error al cargar la imagen', pageWidth / 2, yPosition, { align: 'center' });
    }

    // NO agregar footer aquí, se agregará al final para todas las páginas
  }
}

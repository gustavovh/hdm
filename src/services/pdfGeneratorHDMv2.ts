import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, User } from '../types/database.types';

const DEFAULT_PDF_OPTIONS = {
  unit: 'mm' as const,
  format: 'a4' as const,
  orientation: 'portrait' as const,
  margins: { left: 20, right: 20, top: 20, bottom: 20 },
  footerEnabled: false,
  watermark: {
    enabled: true,
    text: 'PRESUPUESTO',
    rotationDeg: -30,
    fontSizePt: 80,
    opacity: 0.12
  },
  fonts: {
    body: { family: 'times', style: 'normal', size: 11 },
    bold: { family: 'times', style: 'bold', size: 11 }
  },
  table: {
    borderWidthPt: 0.75,
    headerFontStyle: 'bold' as const,
    columnWidthsMm: [8, 18, 90, 18, 16, 22, 22],
    align: ['center','center','left','right','center','right','right'] as const
  }
};

const formatGs = (n: number | string) =>
  (typeof n === 'number' ? n : Number(String(n).replace(/[^\d]/g,'')))
  .toLocaleString('es-PY');

export { DEFAULT_PDF_OPTIONS, formatGs };

export class HDMPDFGeneratorV2 {
  private static readonly VERSION = 'v2.9.1-Y1.3-X+20';

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

  private static async getAdminUser(): Promise<User | null> {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin user:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in getAdminUser:', error);
      return null;
    }
  }

  static async generatePresupuestoPDF(
    presupuesto: Presupuesto,
    vendedor?: User,
    options?: Partial<typeof DEFAULT_PDF_OPTIONS> & { margins?: Partial<typeof DEFAULT_PDF_OPTIONS.margins> }
  ): Promise<jsPDF> {
    console.log(`📄 HDMPDFGeneratorV2 ${this.VERSION} - Generating PDF...`);
    console.log('👤 Vendedor parameter received:', vendedor?.full_name || 'UNDEFINED');
    console.log('📋 Presupuesto vendedor_id:', presupuesto.vendedor_id);
    console.log('🔍 Presupuesto.vendedor:', presupuesto.vendedor?.full_name || 'NOT LOADED');

    const opts = { ...DEFAULT_PDF_OPTIONS, ...(options || {}) };
    opts.margins = { ...DEFAULT_PDF_OPTIONS.margins, ...(options?.margins || {}) };

    const doc = new jsPDF({
      unit: opts.unit,
      format: opts.format,
      orientation: opts.orientation,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = opts.margins.left;
    const rightMargin = opts.margins.right;
    const topMargin = opts.margins.top;
    let yPosition = topMargin;

    // Watermark - "PRESUPUESTO" en diagonal
    if (opts.watermark.enabled) {
      this.addWatermark(doc, pageWidth, pageHeight, opts);
    }

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

    yPosition = topMargin + 20;

    // Servicios (debajo del logo) - solo 3 líneas específicas
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistemas eléctricos de potencia - Obras civiles - Metalúrgica', leftMargin, yPosition);
    yPosition += 3.5;
    doc.text('Domótica - Electrónica de Potencia - Media Tensión 23kV', leftMargin, yPosition);
    yPosition += 3.5;
    doc.text('Mediciones Eléctricas - Gestoría ANDE - Asesoría Energética', leftMargin, yPosition);

    yPosition = 55;

    // Título "Presupuesto #" - alineado a la derecha con el bloque de contacto
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Presupuesto #: ${presupuesto.codigo}`, pageWidth - rightMargin, yPosition, { align: 'right' });

    yPosition = 70;

    // Información del cliente - diseño de dos columnas (28% label, 72% value)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const labelWidth = (pageWidth - leftMargin - rightMargin) * 0.28;
    const valueX = leftMargin + labelWidth;

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(presupuesto.created_at).toLocaleDateString('es-PY'), valueX, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Señores:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.cliente_nombre.toUpperCase(), valueX, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Referencia de', leftMargin, yPosition);
    yPosition += 4;
    doc.text('presupuesto:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    const conceptoLines = doc.splitTextToSize(presupuesto.concepto || 'N/A', pageWidth - valueX - rightMargin);
    doc.text(conceptoLines, valueX, yPosition - 4);
    yPosition += Math.max(4, conceptoLines.length * 4) + 4;

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
      '',  // Código (no disponible en el tipo)
      item.descripcion,
      item.cantidad.toFixed(2),
      'UNID',  // Unidad (no disponible en el tipo)
      formatGs(item.precio_unitario),
      formatGs(item.subtotal)
    ]) || [];

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Código', 'Descripción', 'Cantidad', 'Unidad', 'P.Unit.', 'Sub Total']],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: DEFAULT_PDF_OPTIONS.table.headerFontStyle,
        halign: 'center',
        valign: 'middle',
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[0], halign: 'center' },
        1: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[1], halign: 'center' },
        2: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[2], halign: 'left' },
        3: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[3], halign: 'right' },
        4: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[4], halign: 'center' },
        5: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[5], halign: 'right' },
        6: { cellWidth: DEFAULT_PDF_OPTIONS.table.columnWidthsMm[6], halign: 'right' },
      },
      margin: { left: leftMargin, right: rightMargin },
      didDrawPage: () => {
        // Agregar watermark en cada página
        if (opts.watermark.enabled) {
          this.addWatermark(doc, pageWidth, pageHeight, opts);
        }
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 5;

    // TOTAL row con borde superior
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    const totalRowY = yPosition;
    const totalLabelX = pageWidth - rightMargin - DEFAULT_PDF_OPTIONS.table.columnWidthsMm[6] - DEFAULT_PDF_OPTIONS.table.columnWidthsMm[5];
    const totalValueX = pageWidth - rightMargin - DEFAULT_PDF_OPTIONS.table.columnWidthsMm[6];
    
    // Línea superior del TOTAL
    doc.line(totalLabelX, totalRowY, pageWidth - rightMargin, totalRowY);
    
    yPosition += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL Gs.:', totalValueX - 2, yPosition, { align: 'right' });
    doc.text(formatGs(presupuesto.total_neto + presupuesto.total_impuestos), pageWidth - rightMargin - 2, yPosition, { align: 'right' });
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
    yPosition += 15; // 3 líneas de espacio

    // Firma del vendedor que creó el presupuesto - centrada en la página
    // Si el vendedor es administrativo, usa la firma del admin en su lugar
    let signingUser = vendedor;
    const isAdministrativoCreator = vendedor?.role === 'administrativo';
    if (isAdministrativoCreator) {
      console.log('👤 Usuario es administrativo, obteniendo firma del admin...');
      const adminUser = await this.getAdminUser();
      if (adminUser) {
        signingUser = adminUser;
        console.log('✅ Usando firma del admin:', adminUser.full_name);
      }
    }
    console.log('👤 Signing user:', signingUser?.full_name, 'Role:', signingUser?.role, 'Has signature:', !!signingUser?.signature_url);
    console.log('📝 Vendedor object passed:', vendedor ? 'YES' : 'NO');
    if (signingUser) {
      const centerX = pageWidth / 2;

      // Si hay firma, agregarla
      if (signingUser.signature_url) {
        try {
          const signatureBase64 = await this.loadImageAsBase64(signingUser.signature_url);
          const signatureWidth = 40;
          const signatureHeight = 25;
          doc.addImage(signatureBase64, 'PNG', centerX - (signatureWidth / 2), yPosition, signatureWidth, signatureHeight);
          yPosition += signatureHeight + 2;
        } catch (error) {
          console.error('Error loading signature:', error);
          yPosition += 8; // Espacio si no hay firma
        }
      } else {
        yPosition += 8; // Espacio si no hay firma
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('...........................', centerX, yPosition, { align: 'center' });
      yPosition += 4;

      // Si es administrativo, mostrar firma especial
      if (isAdministrativoCreator) {
        doc.setFont('helvetica', 'bold');
        doc.text('ING. HERNAN MIÑO', centerX, yPosition, { align: 'center' });
        yPosition += 4;
        doc.setFont('helvetica', 'normal');
        doc.text('CAT A - 7822', centerX, yPosition, { align: 'center' });
      } else {
        // Vendedor o admin normal
        doc.setFont('helvetica', 'bold');
        doc.text(signingUser.full_name || 'N/A', centerX, yPosition, { align: 'center' });
        yPosition += 4;
        doc.setFont('helvetica', 'normal');
        if (signingUser.phone) {
          doc.text(signingUser.phone, centerX, yPosition, { align: 'center' });
          yPosition += 4;
        }
        // Agregar nombre de la empresa
        doc.setFont('helvetica', 'bold');
        doc.text('HDM INGENIERIA S.A.', centerX, yPosition, { align: 'center' });
      }
    }

    // Footer opcional
    if (opts.footerEnabled) {
      const footerY = pageHeight - opts.margins.bottom;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('HDM Ingeniería S.A.', leftMargin, footerY);
      doc.text('Presupuesto', pageWidth / 2, footerY, { align: 'center' });
      doc.text('Página 1 de 1', pageWidth - rightMargin, footerY, { align: 'right' });
    }

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
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.warn('⚠️ Popup blocked! Downloading PDF instead...');
        // Alternative: download if popup is blocked
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `presupuesto_${presupuesto.codigo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.log('✅ PDF opened in new window');
      }
    } catch (error) {
      console.error('❌ Error generating PDF preview:', error);
      alert('Error al generar la vista previa del PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      throw error;
    }
  }

  private static addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number, opts: typeof DEFAULT_PDF_OPTIONS) {
    if (!opts.watermark.enabled) return;

    // Configurar opacidad y color
    doc.saveGraphicsState();
    const gstate = new doc.GState({ opacity: opts.watermark.opacity });
    doc.setGState(gstate);
    doc.setTextColor(180, 180, 180);

    doc.setFontSize(opts.watermark.fontSizePt);
    doc.setFont('helvetica', 'bold');

    const text = opts.watermark.text;

    // Centro de la página
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    // Dibujar el texto rotado (convertir grados a radianes para cálculo si es necesario)
    doc.text(text, centerX, centerY, {
      align: 'center',
      angle: opts.watermark.rotationDeg
    });

    doc.restoreGraphicsState();
  }
}

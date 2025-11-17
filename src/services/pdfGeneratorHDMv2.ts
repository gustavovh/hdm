import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, User } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

export const DEFAULT_PDF_OPTIONS = {
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
  (typeof n === 'number' ? n : Number(String(n).replace(/[^\d]/g, '')))
    .toLocaleString('es-PY');

export class HDMPDFGeneratorV2 {
  private static readonly VERSION = 'v2.9.1-Y1.3-X+20';

  private static formatNumber(value: number): string {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

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

  static addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number, opts: typeof DEFAULT_PDF_OPTIONS) {
    if (!opts.watermark?.enabled) return;

    // Try save/restore if available
    try { (doc as any).saveGraphicsState?.(); } catch {}

    // Try to set GState (opacity) if available
    try {
      // @ts-ignore - some jsPDF versions expose GState/ setGState
      const gstate = new (doc as any).GState({ opacity: opts.watermark.opacity });
      // @ts-ignore
      (doc as any).setGState(gstate);
    } catch (e) {
      // Fallback: use a light gray color approximating opacity
      const grayVal = Math.round(255 * (1 - (opts.watermark.opacity ?? 0.12)));
      doc.setTextColor(grayVal, grayVal, grayVal);
    }

    const text = opts.watermark.text || 'PRESUPUESTO';
    doc.setFontSize(opts.watermark.fontSizePt || 80);
    doc.setFont('helvetica', 'bold');

    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    doc.text(text, centerX, centerY, {
      align: 'center',
      angle: opts.watermark.rotationDeg ?? -30
    });

    try { (doc as any).restoreGraphicsState?.(); } catch {}
  }

  static async generatePresupuestoPDF(
    presupuesto: Presupuesto,
    vendedor?: User,
    options?: Partial<typeof DEFAULT_PDF_OPTIONS> & { margins?: Partial<typeof DEFAULT_PDF_OPTIONS.margins> }
  ): Promise<jsPDF> {
    console.log(`📄 HDMPDFGeneratorV2 ${this.VERSION} - Generating PDF...`);

    const opts = { ...DEFAULT_PDF_OPTIONS, ...(options || {}) } as typeof DEFAULT_PDF_OPTIONS;
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
    const bottomMargin = opts.margins.bottom;
    let yPosition = topMargin;

    // Watermark on the first page (autoTable will also call in didDrawPage)
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

    // Services block (exactly 3 lines)
    yPosition += 18;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistemas eléctricos de potencia - Obras civiles - Metalúrgica', leftMargin, yPosition);
    yPosition += 3.8;
    doc.text('Domótica - Electrónica de Potencia - Media Tensión 23kV', leftMargin, yPosition);
    yPosition += 3.8;
    doc.text('Mediciones Eléctricas - Gestoría ANDE - Asesoría Energética', leftMargin, yPosition);

    // Contact block on the right
    const contactX = pageWidth - rightMargin;
    let contactY = topMargin;
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

    // Title
    yPosition = Math.max(yPosition + 12, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Presupuesto #: ${presupuesto.codigo}`, (pageWidth - rightMargin + leftMargin) / 2, yPosition, { align: 'center' });

    yPosition += 15;

    // Metadata block
    const metaLabelWidth = Math.floor((pageWidth - leftMargin - rightMargin) * 0.28);
    const metaValueX = leftMargin + metaLabelWidth + 6;
    let metaY = yPosition;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text('Fecha:', leftMargin, metaY);
    doc.text(new Date(presupuesto.created_at).toLocaleDateString('es-PY'), metaValueX, metaY);
    metaY += 3.2;

    doc.setFont('helvetica', 'bold');
    doc.text('Señores:', leftMargin, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.cliente_nombre.toUpperCase(), metaValueX, metaY);
    metaY += 3.8;

    doc.setFont('helvetica', 'bold');
    doc.text('Referencia de', leftMargin, metaY);
    doc.text('presupuesto:', leftMargin, metaY + 3.2);
    doc.setFont('helvetica', 'normal');
    const concepto = presupuesto.concepto || 'N/A';
    const conceptoLines = doc.splitTextToSize(concepto.toUpperCase(), pageWidth - leftMargin - rightMargin - metaLabelWidth - 10);
    doc.text(conceptoLines, metaValueX, metaY);
    metaY += Math.max(8, conceptoLines.length * 4) + 2;

    yPosition = metaY + 6;

    // Intro text
    const introText = 'Tengo el agrado de dirigirme a Ud. A fin de presentar la oferta económica por el trabajo de referencia a ser realizado.';
    const splitIntro = doc.splitTextToSize(introText, pageWidth - leftMargin - rightMargin);
    doc.setFont('helvetica', 'normal');
    doc.text(splitIntro, leftMargin, yPosition);
    yPosition += splitIntro.length * 5 + 3;

    // Title trabajos
    doc.setFont('helvetica', 'bold');
    doc.text('Trabajos a ser Realizados:', leftMargin, yPosition);
    yPosition += 6;

    // Table
    const tableData = presupuesto.items?.map((item, index) => [
      (index + 1).toString(),
      item.grupo || '',
      item.descripcion,
      item.cantidad.toFixed(2),
      item.unidad_medida || 'UNID',
      formatGs(item.precio_unitario),
      formatGs(item.total || (item.cantidad * item.precio_unitario))
    ]) || [];

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Item|Grp', 'Descripción', 'Cantidad', 'Unidad', 'P.Unitario', 'Sub Total']],
      body: tableData,
      theme: 'plain',
      margin: { left: leftMargin, right: rightMargin },
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
        lineWidth: DEFAULT_PDF_OPTIONS.table.borderWidthPt,
        halign: 'center',
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'left', cellWidth: 90 },
        3: { halign: 'right', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'right', cellWidth: 22 },
      },
      didDrawPage: () => {
        if (opts.watermark.enabled) this.addWatermark(doc, pageWidth, pageHeight, opts);
      },
    });

    yPosition = (doc as any).lastAutoTable?.finalY || yPosition + 8;

    // TOTAL row with top border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(leftMargin, yPosition + 2, pageWidth - rightMargin, yPosition + 2);
    doc.setLineWidth(0.3);

    const totalLabelX = pageWidth - rightMargin - 22 - 2;
    const totalAmountX = pageWidth - rightMargin;
    const totalY = yPosition + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL Gs.:', totalLabelX, totalY, { align: 'right' });
    doc.text(formatGs(presupuesto.total_neto + presupuesto.total_impuestos), totalAmountX, totalY, { align: 'right' });

    yPosition = totalY + 10;

    // Forma de pago / Observaciones
    doc.setFont('helvetica', 'bold');
    doc.text('Forma de pago:', leftMargin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(presupuesto.condicion_pago || 'CONTADO', leftMargin + 35, yPosition);
    yPosition += 8;

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

    // Nota IVA
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('* Los precios incluyen IVA.', leftMargin, yPosition);
    yPosition += 8;

    // Cierre
    doc.setFontSize(9);
    doc.text('Estamos a su disposición ante cualquier consulta.', leftMargin, yPosition);
    yPosition += 15;

    // Firma
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
    if (signingUser) {
      const centerX = pageWidth / 2;

      if (signingUser.signature_url) {
        try {
          const signatureBase64 = await this.loadImageAsBase64(signingUser.signature_url);
          const signatureWidth = 40;
          const signatureHeight = 25;
          doc.addImage(signatureBase64, 'PNG', centerX - (signatureWidth / 2), yPosition, signatureWidth, signatureHeight);
          yPosition += signatureHeight + 2;
        } catch (error) {
          console.error('Error loading signature:', error);
          yPosition += 8;
        }
      } else {
        yPosition += 8;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('...........................', centerX, yPosition, { align: 'center' });
      yPosition += 4;

      if (isAdministrativoCreator) {
        doc.setFont('helvetica', 'bold');
        doc.text('ING. HERNAN MIÑO', centerX, yPosition, { align: 'center' });
        yPosition += 4;
        doc.setFont('helvetica', 'normal');
        doc.text('CAT A - 7822', centerX, yPosition, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text(signingUser.full_name || 'N/A', centerX, yPosition, { align: 'center' });
        yPosition += 4;
        doc.setFont('helvetica', 'normal');
        if (signingUser.phone) {
          doc.text(signingUser.phone, centerX, yPosition, { align: 'center' });
          yPosition += 4;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('HDM INGENIERIA S.A.', centerX, yPosition, { align: 'center' });
      }
    }

    // Footer (solo si se activa)
    if (opts.footerEnabled) {
      const footerY = pageHeight - bottomMargin;
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
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, User } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

const LOGO_WIDTH_MM = 50;
const LOGO_HEIGHT_MM = 13;

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
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  private static async loadImageAsBase64WithSize(url: string): Promise<{ dataUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
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

    // --- Layout constants (A4 in mm) ---
    const leftColumnX = leftMargin;
    const contactX = pageWidth - rightMargin;
    const headerTopY = yTop - 12;   // sube un poquito el header
    const lineGap = 4;              // interlineado de 4mm

    // Ancho deseado del logo/servicios y límite por espacio disponible
    const desiredLogoWidth = 120; // <— si queda chico, podremos subir a 130
    const maxAllowed = contactX - leftColumnX - 10; // dejar 10mm de gap con la columna derecha
    const leftColumnWidth = Math.min(desiredLogoWidth, maxAllowed);

    // --- RIGHT column (100% alineado a derecha) ---
    let rightY = headerTopY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Dirección: Profesor Almada C/21 de setiembre', contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text('Luque - Paraguay',                                  contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text(`Email: hmino@hdm.com.py`,                           contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text(`Cel: +595981795669`,                                contactX, rightY, { align: 'right' }); rightY += lineGap;
    doc.text(`RUC: 80122639-2`,                                   contactX, rightY, { align: 'right' });

    // --- LEFT column: LOGO (misma ANCHURA que servicios, SIN deformar) ---
    let currentY = headerTopY;
    try {
      const logo = await this.loadImageAsBase64WithSize('/hdm-logo.png');
      const aspect = logo.height / logo.width;
      const logoW = leftColumnWidth;           // ancho fijo
      const logoH = logoW * aspect;            // alto proporcional
      doc.addImage(logo.dataUrl, 'PNG', leftColumnX, currentY, logoW, logoH);
      currentY += logoH + 6;                   // espacio debajo del logo
    } catch (e) {
      console.error('Logo error:', e);
      currentY += 12; // fallback spacing
    }

    // --- LEFT column: BLOQUE "servicios" (negrita, wrap al MISMO ancho del logo) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    const servicesLines = [
      'Sistemas eléctricos de potencia – Obras civiles – Metalúrgica',
      'Domótica – Electrónica de Potencia – Media Tensión 23kV',
      'Mediciones Eléctricas – Gestoría ANDE – Asesoría Energética',
    ];

    const wrapped: string[] = [];
    for (const line of servicesLines) {
      const parts = doc.splitTextToSize(line, leftColumnWidth);
      wrapped.push(...parts);
    }

    wrapped.forEach((ln, i) => {
      doc.text(ln, leftColumnX, currentY + i * lineGap);
    });

    const servicesBottomY = wrapped.length ? currentY + (wrapped.length - 1) * lineGap : currentY;
    const sepY = servicesBottomY + 8; // separador después del bloque

    // --- Línea separadora fina de todo el header ---
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, sepY, pageWidth - rightMargin, sepY);

    // Devolver la siguiente Y disponible
    return sepY + 6;
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
    vendedor?: User
  ): Promise<jsPDF> {
    console.log(`📄 HDMPDFGeneratorV2 ${this.VERSION} - Generating PDF...`);
    console.log('👤 Vendedor parameter received:', vendedor?.full_name || 'UNDEFINED');
    console.log('📋 Presupuesto vendedor_id:', presupuesto.vendedor_id);
    console.log('🔍 Presupuesto.vendedor:', presupuesto.vendedor?.full_name || 'NOT LOADED');

    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const topMargin = 15;

    // Watermark - "PRESUPUESTO" en diagonal
    this.addWatermark(doc, pageWidth, pageHeight);

    // Renderizar encabezado
    let yPosition = await HDMPDFGeneratorV2.renderHeader(
      doc, pageWidth, leftMargin, rightMargin, topMargin, presupuesto
    );

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
      this.formatNumber(item.precio_unitario),
      this.formatNumber(item.total || (item.cantidad * item.precio_unitario))
    ]) || [];

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Descripción', 'Cantidad', 'Unidad', 'P.Unitario', 'Sub Total']],
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
        1: { cellWidth: 80, halign: 'left' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
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
    const totalText = `TOTAL Gs.: ${this.formatNumber(presupuesto.total_neto + presupuesto.total_impuestos)}`;
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

  private static addWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
    console.log('💧 Adding watermark v2.9 - OFFSET 1.3 + RIGHT SHIFT');

    // Configurar opacidad y color
    doc.saveGraphicsState();
    const gstate = new doc.GState({ opacity: 0.1 });
    doc.setGState(gstate);
    doc.setTextColor(120, 120, 120);

    // Tamaño reducido para mejor centrado
    const fontSize = 80;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');

    const text = 'PRESUPUESTO';

    // Centro de la página
    const baseCenterX = pageWidth / 2;
    const baseCenterY = pageHeight / 2;

    // Medir dimensiones del texto
    const textWidth = doc.getTextWidth(text);
    const textHeightMM = fontSize * 0.352778; // Convertir puntos a mm

    console.log('📏 Text - Width:', textWidth, 'mm, Height:', textHeightMM, 'mm');
    console.log('📍 Base center:', baseCenterX, baseCenterY);

    // Ajustar posición vertical con offset 1.3
    const adjustedY = baseCenterY + (textHeightMM * 1.3);

    // Ajustar posición horizontal: mover hacia la derecha para dar más margen izquierdo
    const adjustedX = baseCenterX + 35; // +35mm hacia la derecha

    console.log('🎯 Drawing at - X:', adjustedX, 'Y:', adjustedY, '(Y offset:', textHeightMM * 1.3, 'mm, X shift: +35mm)');

    // Dibujar el texto rotado
    doc.text(text, adjustedX, adjustedY, {
      align: 'center',
      angle: 45
    });

    console.log('✅ Watermark rendered (80pt font, Y:1.3, X:+20mm)');

    doc.restoreGraphicsState();
  }
}

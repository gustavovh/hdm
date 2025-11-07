import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presupuesto, User } from '../types/database.types';
import { BudgetCalculator } from './budgetCalculator';

export class HDMPDFGeneratorV2 {
  private static readonly VERSION = 'v2.2.0-TESTING';

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
    // SIEMPRE usa el vendedor que creó el presupuesto, nunca el admin cuando ve el PDF
    const signingUser = vendedor;
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
      doc.setFont('helvetica', 'bold');
      doc.text(signingUser.full_name || 'N/A', centerX, yPosition, { align: 'center' });
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      if (signingUser.phone) {
        doc.text(signingUser.phone, centerX, yPosition, { align: 'center' });
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
    console.log('💧 Adding watermark v2.3 - Size 120pt CENTERED');
    doc.saveGraphicsState();

    // Configurar opacidad y color
    const gstate = new doc.GState({ opacity: 0.1 });
    doc.setGState(gstate);
    doc.setTextColor(120, 120, 120);

    // Tamaño grande para abarcar bien la diagonal
    doc.setFontSize(120);
    doc.setFont('helvetica', 'bold');

    // Centro exacto de la página
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    const text = 'PRESUPUESTO';

    // Medir el ancho del texto
    const textWidth = doc.getTextWidth(text);
    console.log('📏 Text width:', textWidth, 'Page center:', centerX, centerY);

    // Dibujar el texto rotado y centrado
    doc.text(text, centerX, centerY, {
      align: 'center',
      angle: 45
    });

    doc.restoreGraphicsState();
  }
}

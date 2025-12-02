import { Presupuesto } from '../types/database.types';

interface ExportData {
  presupuestos: Presupuesto[];
  totalMonto: number;
  totalPresentados: number;
  totalAceptados: number;
  totalFacturados: number;
  montoFacturado: number;
  filterInfo: string;
}

export const exportService = {
  exportToTXT(data: ExportData): void {
    let content = '='.repeat(80) + '\n';
    content += 'REPORTE DE PRESUPUESTOS\n';
    content += '='.repeat(80) + '\n\n';

    content += `Filtro aplicado: ${data.filterInfo}\n`;
    content += `Fecha de generación: ${new Date().toLocaleString('es-PY')}\n\n`;

    content += '-'.repeat(80) + '\n';
    content += 'RESUMEN GENERAL\n';
    content += '-'.repeat(80) + '\n';
    content += `Total de presupuestos: ${data.presupuestos.length}\n`;
    content += `Monto total: ${this.formatCurrency(data.totalMonto)}\n`;
    content += `Presentados: ${data.totalPresentados}\n`;
    content += `Aceptados: ${data.totalAceptados}\n`;
    content += `Facturados: ${data.totalFacturados}\n`;
    content += `Monto facturado: ${this.formatCurrency(data.montoFacturado)}\n\n`;

    content += '-'.repeat(80) + '\n';
    content += 'DETALLE DE PRESUPUESTOS\n';
    content += '-'.repeat(80) + '\n\n';

    data.presupuestos.forEach((p, index) => {
      const montoTotal = p.total_neto + p.total_impuestos;

      content += `${index + 1}. ${p.codigo}\n`;
      content += `   Cliente: ${p.cliente_nombre}\n`;
      if (p.concepto) content += `   Concepto: ${p.concepto}\n`;
      if (p.cliente_documento) content += `   Documento: ${p.cliente_documento}\n`;
      content += `   Estado: ${p.estado}\n`;
      content += `   Monto: ${this.formatCurrency(montoTotal)} ${p.moneda}\n`;
      content += `   Vendedor: ${p.vendedor?.full_name || 'N/A'}\n`;
      content += `   Fecha: ${new Date(p.created_at).toLocaleDateString('es-PY')}\n`;
      content += '\n';
    });

    content += '='.repeat(80) + '\n';
    content += 'FIN DEL REPORTE\n';
    content += '='.repeat(80) + '\n';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuestos_${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToXLS(data: ExportData): void {
    let content = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">\n';
    content += '<head>\n';
    content += '<meta charset="UTF-8">\n';
    content += '<xml>\n';
    content += '<x:ExcelWorkbook>\n';
    content += '<x:ExcelWorksheets>\n';
    content += '<x:ExcelWorksheet>\n';
    content += '<x:Name>Presupuestos</x:Name>\n';
    content += '<x:WorksheetOptions>\n';
    content += '<x:Print>\n';
    content += '<x:ValidPrinterInfo/>\n';
    content += '</x:Print>\n';
    content += '</x:WorksheetOptions>\n';
    content += '</x:ExcelWorksheet>\n';
    content += '</x:ExcelWorksheets>\n';
    content += '</x:ExcelWorkbook>\n';
    content += '</xml>\n';
    content += '</head>\n';
    content += '<body>\n';

    content += '<h2>REPORTE DE PRESUPUESTOS</h2>\n';
    content += `<p><strong>Filtro aplicado:</strong> ${data.filterInfo}</p>\n`;
    content += `<p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-PY')}</p>\n`;

    content += '<h3>RESUMEN GENERAL</h3>\n';
    content += '<table border="1" cellpadding="5" cellspacing="0">\n';
    content += '<tr><td><strong>Total de presupuestos</strong></td><td>' + data.presupuestos.length + '</td></tr>\n';
    content += '<tr><td><strong>Monto total</strong></td><td>' + this.formatCurrency(data.totalMonto) + '</td></tr>\n';
    content += '<tr><td><strong>Presentados</strong></td><td>' + data.totalPresentados + '</td></tr>\n';
    content += '<tr><td><strong>Aceptados</strong></td><td>' + data.totalAceptados + '</td></tr>\n';
    content += '<tr><td><strong>Facturados</strong></td><td>' + data.totalFacturados + '</td></tr>\n';
    content += '<tr><td><strong>Monto facturado</strong></td><td>' + this.formatCurrency(data.montoFacturado) + '</td></tr>\n';
    content += '</table>\n';

    content += '<h3>DETALLE DE PRESUPUESTOS</h3>\n';
    content += '<table border="1" cellpadding="5" cellspacing="0">\n';
    content += '<thead>\n';
    content += '<tr style="background-color: #4B5563; color: white; font-weight: bold;">\n';
    content += '<th>N°</th>\n';
    content += '<th>Código</th>\n';
    content += '<th>Cliente</th>\n';
    content += '<th>Concepto</th>\n';
    content += '<th>Documento</th>\n';
    content += '<th>Estado</th>\n';
    content += '<th>Monto</th>\n';
    content += '<th>Moneda</th>\n';
    content += '<th>Vendedor</th>\n';
    content += '<th>Email Vendedor</th>\n';
    content += '<th>Fecha</th>\n';
    content += '</tr>\n';
    content += '</thead>\n';
    content += '<tbody>\n';

    data.presupuestos.forEach((p, index) => {
      const montoTotal = p.total_neto + p.total_impuestos;
      const rowColor = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';

      content += `<tr style="background-color: ${rowColor};">\n`;
      content += `<td>${index + 1}</td>\n`;
      content += `<td>${this.escapeHTML(p.codigo)}</td>\n`;
      content += `<td>${this.escapeHTML(p.cliente_nombre)}</td>\n`;
      content += `<td>${this.escapeHTML(p.concepto || '-')}</td>\n`;
      content += `<td>${this.escapeHTML(p.cliente_documento || '-')}</td>\n`;
      content += `<td>${this.escapeHTML(p.estado)}</td>\n`;
      content += `<td style="text-align: right;">${this.formatCurrency(montoTotal)}</td>\n`;
      content += `<td>${p.moneda}</td>\n`;
      content += `<td>${this.escapeHTML(p.vendedor?.full_name || '-')}</td>\n`;
      content += `<td>${this.escapeHTML(p.vendedor?.email || '-')}</td>\n`;
      content += `<td>${new Date(p.created_at).toLocaleDateString('es-PY')}</td>\n`;
      content += '</tr>\n';
    });

    content += '</tbody>\n';
    content += '</table>\n';
    content += '</body>\n';
    content += '</html>\n';

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuestos_${new Date().getTime()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

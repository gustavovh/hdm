import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Search, Download, RefreshCw, FileText, Calendar } from 'lucide-react';
import { BudgetCalculator } from '../../services/budgetCalculator';

interface FacturaData {
  id: string;
  codigo: string;
  concepto: string;
  cliente_nombre: string;
  vendedor_nombre: string;
  estado: string;
  total_neto: number;
  moneda: 'PYG' | 'USD';
  factura_numero: string | null;
  factura_timbrado: string | null;
  factura_fecha: string | null;
  factura_observacion: string | null;
  numero_factura: string | null;
  monto_factura: number | null;
  condicion_pago: string | null;
  medio_pago: string | null;
  enlace_comprobante: string | null;
  created_at: string;
}

export function FacturacionView() {
  const [facturas, setFacturas] = useState<FacturaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFacturas, setFilteredFacturas] = useState<FacturaData[]>([]);

  useEffect(() => {
    loadFacturas();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = facturas.filter(f =>
        f.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.factura_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.numero_factura?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.vendedor_nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFacturas(filtered);
    } else {
      setFilteredFacturas(facturas);
    }
  }, [searchTerm, facturas]);

  const loadFacturas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('presupuestos')
        .select(`
          id,
          codigo,
          concepto,
          cliente_nombre,
          estado,
          total_neto,
          moneda,
          factura_numero,
          factura_timbrado,
          factura_fecha,
          factura_observacion,
          numero_factura,
          monto_factura,
          condicion_pago,
          medio_pago,
          enlace_comprobante,
          created_at,
          vendedor:users!presupuestos_vendedor_id_fkey(nombre_completo)
        `)
        .or('estado.eq.FACTURADO,factura_numero.not.is.null,numero_factura.not.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Facturas cargadas:', data?.length || 0);

      const formattedData: FacturaData[] = (data || []).map(item => ({
        ...item,
        vendedor_nombre: (item.vendedor as any)?.nombre_completo || 'Sin asignar',
      }));

      setFacturas(formattedData);
      setFilteredFacturas(formattedData);
    } catch (error) {
      console.error('Error loading facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Código',
      'Concepto',
      'Cliente',
      'Vendedor',
      'Estado',
      'Monto Total',
      'Moneda',
      'Factura Número',
      'Timbrado',
      'Fecha Factura',
      'Número Factura',
      'Monto Factura',
      'Condición Pago',
      'Medio Pago',
      'Observación',
      'Link Comprobante',
      'Fecha Creación'
    ];

    const rows = filteredFacturas.map(f => [
      f.codigo,
      f.concepto,
      f.cliente_nombre,
      f.vendedor_nombre,
      f.estado,
      f.total_neto,
      f.moneda,
      f.factura_numero || '',
      f.factura_timbrado || '',
      f.factura_fecha || '',
      f.numero_factura || '',
      f.monto_factura || '',
      f.condicion_pago || '',
      f.medio_pago || '',
      f.factura_observacion || '',
      f.enlace_comprobante || '',
      new Date(f.created_at).toLocaleDateString('es-PY')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facturas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Datos de Facturación</h2>
            <p className="text-gray-600 mt-1">
              {filteredFacturas.length} factura(s) registrada(s)
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadFacturas} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={exportToCSV} variant="primary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por código, cliente, factura, vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredFacturas.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay facturas registradas
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Las facturas aparecerán aquí cuando se registren'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura N°
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timbrado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condición
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medio Pago
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFacturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {factura.codigo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{factura.cliente_nombre}</div>
                      <div className="text-sm text-gray-500">{factura.concepto}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{factura.vendedor_nombre}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {BudgetCalculator.formatCurrency(factura.total_neto, factura.moneda)}
                      </div>
                      {factura.monto_factura && factura.monto_factura !== factura.total_neto && (
                        <div className="text-xs text-gray-500">
                          Fact: {BudgetCalculator.formatCurrency(factura.monto_factura, factura.moneda)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {factura.factura_numero || factura.numero_factura || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {factura.factura_timbrado || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        {factura.factura_fecha ? (
                          <>
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {new Date(factura.factura_fecha).toLocaleDateString('es-PY')}
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {factura.condicion_pago || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {factura.medio_pago || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredFacturas.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Total Facturado PYG</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {BudgetCalculator.formatCurrency(
                    filteredFacturas
                      .filter(f => f.moneda === 'PYG')
                      .reduce((sum, f) => sum + f.total_neto, 0),
                    'PYG'
                  )}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">Total Facturado USD</div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {BudgetCalculator.formatCurrency(
                    filteredFacturas
                      .filter(f => f.moneda === 'USD')
                      .reduce((sum, f) => sum + f.total_neto, 0),
                    'USD'
                  )}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">Facturas Procesadas</div>
                <div className="text-2xl font-bold text-purple-900 mt-1">
                  {filteredFacturas.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

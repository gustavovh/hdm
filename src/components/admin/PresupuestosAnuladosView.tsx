import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { XCircle, Calendar, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PresupuestoAnulado {
  id: string;
  codigo: string;
  cliente_nombre: string;
  concepto: string;
  total_neto: number;
  total_impuestos: number;
  estado: string;
  created_at: string;
  updated_at: string;
  vendedor_nombre: string;
  vendedor_email: string;
}

export function PresupuestosAnuladosView() {
  const [presupuestos, setPresupuestos] = useState<PresupuestoAnulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadPresupuestosAnulados();
  }, []);

  const loadPresupuestosAnulados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('presupuestos')
        .select(`
          id,
          codigo,
          cliente_nombre,
          concepto,
          total_neto,
          total_impuestos,
          estado,
          created_at,
          updated_at,
          vendedor:users!presupuestos_vendedor_id_fkey(
            full_name,
            email
          )
        `)
        .eq('estado', 'ANULADO')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mappedData = data.map((p: any) => ({
        ...p,
        vendedor_nombre: p.vendedor?.full_name || 'Desconocido',
        vendedor_email: p.vendedor?.email || '',
      }));

      setPresupuestos(mappedData);
    } catch (error) {
      console.error('Error cargando presupuestos anulados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando presupuestos anulados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Presupuestos Anulados
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {presupuestos.length} presupuestos anulados en total
                </p>
              </div>
            </div>
          </div>
        </div>

        {presupuestos.length === 0 ? (
          <div className="p-12 text-center">
            <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay presupuestos anulados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {presupuestos.map((presupuesto) => (
              <div key={presupuesto.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-6 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === presupuesto.id ? null : presupuesto.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {presupuesto.codigo}
                        </h3>
                        <Badge variant="danger">ANULADO</Badge>
                      </div>
                      <p className="text-gray-700 font-medium mb-2">
                        {presupuesto.cliente_nombre}
                      </p>
                      {presupuesto.concepto && (
                        <p className="text-sm text-gray-600 mb-3">
                          {presupuesto.concepto}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{presupuesto.vendedor_nombre}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Anulado: {formatDate(presupuesto.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(presupuesto.total_neto + presupuesto.total_impuestos)}
                        </p>
                      </div>
                      {expandedId === presupuesto.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedId === presupuesto.id && (
                  <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Información del Presupuesto
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fecha de creación:</span>
                            <span className="text-gray-900 font-medium">
                              {formatDate(presupuesto.created_at)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fecha de anulación:</span>
                            <span className="text-gray-900 font-medium">
                              {formatDate(presupuesto.updated_at)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Neto:</span>
                            <span className="text-gray-900 font-medium">
                              {formatCurrency(presupuesto.total_neto)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Impuestos:</span>
                            <span className="text-gray-900 font-medium">
                              {formatCurrency(presupuesto.total_impuestos)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Información del Vendedor
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nombre:</span>
                            <span className="text-gray-900 font-medium">
                              {presupuesto.vendedor_nombre}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="text-gray-900 font-medium">
                              {presupuesto.vendedor_email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

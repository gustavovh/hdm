import { useState, useEffect } from 'react';
import { ReportsService, DashboardStats } from '../../services/reportsService';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
  X,
} from 'lucide-react';

interface VendedorPresupuesto {
  id: string;
  codigo: string;
  cliente_nombre: string;
  estado: string;
  total_neto: number;
  total_impuestos: number;
  created_at: string;
  concepto: string;
}

export function ReportsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<{ id: string; nombre: string } | null>(null);
  const [vendedorPresupuestos, setVendedorPresupuestos] = useState<VendedorPresupuesto[]>([]);
  const [loadingPresupuestos, setLoadingPresupuestos] = useState(false);

  const loadStats = async (customFrom?: string, customTo?: string) => {
    setLoading(true);

    const from = customFrom !== undefined ? customFrom : dateFrom;
    const to = customTo !== undefined ? customTo : dateTo;

    console.log('🔄 Loading stats with:', {
      period,
      from,
      to,
      hasCustomDates: !!(from && to),
      useCustomDate
    });

    try {
      let data;

      if (from && to) {
        console.log('✅ Using custom dates:', from, 'to', to);
        data = await ReportsService.getDashboardStats(period, from, to);
      } else {
        console.log('📅 Using period:', period);
        data = await ReportsService.getDashboardStats(period);
      }

      setStats(data);
      console.log('✅ Stats loaded successfully:', {
        presupuestos: data.presupuestos.total,
        monto_total: data.monto_total.total,
        top_vendedores: data.top_vendedores.length,
        tasas_conversion: data.tasas_conversion
      });
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentageColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const loadVendedorPresupuestos = async (vendedorId: string, vendedorNombre: string) => {
    setLoadingPresupuestos(true);
    setSelectedVendedor({ id: vendedorId, nombre: vendedorNombre });

    try {
      let startDateStr: string;
      let endDateStr: string | undefined;

      if (dateFrom && dateTo) {
        startDateStr = new Date(dateFrom).toISOString();
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        endDateStr = endDate.toISOString();
      } else {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDateStr = startDate.toISOString();
      }

      let query = supabase
        .from('presupuestos')
        .select('id, codigo, cliente_nombre, estado, total_neto, total_impuestos, created_at, concepto')
        .eq('vendedor_id', vendedorId)
        .in('estado', ['FACTURADO', 'ACEPTADO', 'EN_EJECUCION'])
        .gte('created_at', startDateStr)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (endDateStr) {
        query = query.lte('created_at', endDateStr);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVendedorPresupuestos(data || []);
    } catch (error) {
      console.error('Error cargando presupuestos del vendedor:', error);
      setVendedorPresupuestos([]);
    } finally {
      setLoadingPresupuestos(false);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'FACTURADO':
        return 'emerald';
      case 'ACEPTADO':
        return 'green';
      case 'EN_EJECUCION':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (estado: string) => {
    switch (estado) {
      case 'FACTURADO':
        return 'Facturado';
      case 'ACEPTADO':
        return 'Aceptado';
      case 'EN_EJECUCION':
        return 'En Ejecución';
      default:
        return estado;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Reportes y Estadísticas
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Análisis de desempeño y métricas clave
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => { setPeriod('7d'); setUseCustomDate(false); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              period === '7d' && !useCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => { setPeriod('30d'); setUseCustomDate(false); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              period === '30d' && !useCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            30 días
          </button>
          <button
            onClick={() => { setPeriod('90d'); setUseCustomDate(false); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              period === '90d' && !useCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            90 días
          </button>
          <div className="h-8 w-px bg-gray-300 mx-2"></div>
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${useCustomDate ? 'text-blue-600' : 'text-gray-600'}`} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setUseCustomDate(true); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                useCustomDate ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              placeholder="Desde"
            />
            <span className="text-gray-600">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setUseCustomDate(true); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                useCustomDate ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              placeholder="Hasta"
            />
            <button
              onClick={() => {
                console.log('Botón Actualizar clicked', { dateFrom, dateTo, useCustomDate });
                loadStats(dateFrom, dateTo);
              }}
              disabled={loading}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                loading
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            {useCustomDate && (
              <button
                onClick={() => {
                  setUseCustomDate(false);
                  setDateFrom('');
                  setDateTo('');
                  setTimeout(() => loadStats('', ''), 100);
                }}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                title="Limpiar fechas personalizadas"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            {stats.presupuestos.change !== 0 && (
              <span className={`flex items-center text-sm font-medium ${getPercentageColor(stats.presupuestos.change)}`}>
                {stats.presupuestos.change > 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(stats.presupuestos.change)}%
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Presupuestos
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.presupuestos.total}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Creados en el período
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            {stats.monto_total.change !== 0 && (
              <span className={`flex items-center text-sm font-medium ${getPercentageColor(stats.monto_total.change)}`}>
                {stats.monto_total.change > 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(stats.monto_total.change)}%
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Monto Total
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.monto_total.total)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            En presupuestos cerrados
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Solicitudes de Descuento
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.solicitudes_descuento.total}
          </p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="flex items-center text-yellow-600">
              <Clock className="w-3 h-3 mr-1" />
              {stats.solicitudes_descuento.pendientes} pendientes
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Vendedores Activos
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.vendedores_activos}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Con actividad en el período
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasa de Conversión
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Presentados → Aceptados
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.tasas_conversion.presentado_aceptado}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(stats.tasas_conversion.presentado_aceptado, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Aceptados → Facturados
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.tasas_conversion.aceptado_facturado}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(stats.tasas_conversion.aceptado_facturado, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Descuentos Aprobados
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.tasas_conversion.descuentos_aprobados}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(stats.tasas_conversion.descuentos_aprobados, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Vendedores
          </h3>
          <div className="space-y-3">
            {stats.top_vendedores.slice(0, 5).map((vendedor, index) => (
              <button
                key={vendedor.id}
                onClick={() => loadVendedorPresupuestos(vendedor.id, vendedor.nombre)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                    #{index + 1}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {vendedor.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {vendedor.presupuestos} presupuestos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(vendedor.monto_total)}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estado de Presupuestos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-900">Clonado</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">
              {stats.presupuestos_por_estado?.clonado || 0}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Presentado</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {stats.presupuestos_por_estado?.presentado || 0}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">Aceptado</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {stats.presupuestos_por_estado?.aceptado || 0}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-emerald-900">Facturado</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">
              {stats.presupuestos_por_estado?.facturado || 0}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-900">Anulado</span>
            </div>
            <p className="text-2xl font-bold text-red-900">
              {stats.presupuestos_por_estado?.anulado || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de presupuestos del vendedor */}
      <Modal
        isOpen={!!selectedVendedor}
        onClose={() => {
          setSelectedVendedor(null);
          setVendedorPresupuestos([]);
        }}
        title={`Presupuestos de ${selectedVendedor?.nombre || ''}`}
      >
        <div className="space-y-4">
          {loadingPresupuestos ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">Cargando presupuestos...</p>
            </div>
          ) : vendedorPresupuestos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No hay presupuestos en este período</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de presupuestos</p>
                    <p className="text-2xl font-bold text-gray-900">{vendedorPresupuestos.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monto total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        vendedorPresupuestos.reduce(
                          (sum, p) => sum + p.total_neto + p.total_impuestos,
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Concepto
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendedorPresupuestos.map((presupuesto) => (
                      <tr key={presupuesto.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {presupuesto.codigo}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {presupuesto.cliente_nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {presupuesto.concepto || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Badge color={getStatusColor(presupuesto.estado)}>
                            {getStatusLabel(presupuesto.estado)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(presupuesto.total_neto + presupuesto.total_impuestos)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">
                          {new Date(presupuesto.created_at).toLocaleDateString('es-PY')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

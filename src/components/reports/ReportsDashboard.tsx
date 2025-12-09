import { useState, useEffect } from 'react';
import { ReportsService, DashboardStats } from '../../services/reportsService';
import { Badge } from '../ui/Badge';
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
} from 'lucide-react';

export function ReportsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);

  const loadStats = async (customFrom?: string, customTo?: string) => {
    setLoading(true);
    console.log('Loading stats with:', {
      period,
      customFrom: customFrom || dateFrom,
      customTo: customTo || dateTo,
      useCustomDate
    });
    try {
      let data;
      const from = customFrom !== undefined ? customFrom : dateFrom;
      const to = customTo !== undefined ? customTo : dateTo;

      if (useCustomDate && from && to) {
        console.log('Using custom dates:', from, to);
        data = await ReportsService.getDashboardStats(period, from, to);
      } else {
        console.log('Using period:', period);
        data = await ReportsService.getDashboardStats(period);
      }
      setStats(data);
      console.log('Stats loaded successfully');
    } catch (error) {
      console.error('Error loading stats:', error);
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
                    width: `${stats.tasas_conversion.presentado_aceptado}%`,
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
                    width: `${stats.tasas_conversion.aceptado_facturado}%`,
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
                    width: `${stats.tasas_conversion.descuentos_aprobados}%`,
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
              <div
                key={vendedor.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                    #{index + 1}
                  </div>
                  <div>
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
              </div>
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
    </div>
  );
}

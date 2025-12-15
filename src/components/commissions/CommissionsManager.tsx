import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Calendar, Download, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { CommissionsService, CommissionCalculation } from '../../services/commissionsService';
import { salesTargetsService } from '../../services/salesTargetsService';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface VendedorStats {
  vendedor: User;
  totalVentas: number;
  totalComisiones: number;
  porcentajeObjetivo: number;
  objetivo: number;
  calculation?: CommissionCalculation;
}

export function CommissionsManager() {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [vendedoresStats, setVendedoresStats] = useState<VendedorStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [totalStats, setTotalStats] = useState({
    totalVentas: 0,
    totalComisiones: 0,
    vendedoresActivos: 0,
  });

  useEffect(() => {
    loadCommissionsData();
  }, [selectedMonth, selectedYear, useCustomDates, dateFrom, dateTo]);

  const loadCommissionsData = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;
      let periodLabel: string;

      if (useCustomDates && dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = `Desde ${new Date(dateFrom).toLocaleDateString('es-PY')} hasta ${new Date(dateTo).toLocaleDateString('es-PY')}`;
        console.log('🔄 Cargando comisiones para rango personalizado:', { desde: dateFrom, hasta: dateTo });
      } else {
        startDate = new Date(selectedYear, selectedMonth - 1, 1);
        endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        periodLabel = `${months[selectedMonth - 1]} ${selectedYear}`;
        console.log('🔄 Cargando comisiones para:', { mes: selectedMonth, año: selectedYear });
      }

      const { data: vendedores } = await supabase
        .from('users')
        .select('*')
        .in('role', ['vendedor', 'administrativo'])
        .eq('active', true);

      if (!vendedores) {
        setVendedoresStats([]);
        return;
      }

      console.log('👥 Vendedores encontrados:', vendedores.length, 'roles:', vendedores.map(v => `${v.full_name} (${v.role})`));

      const stats: VendedorStats[] = [];
      let totalVentasSum = 0;
      let totalComisionesSum = 0;
      let vendedoresConVentas = 0;

      for (const vendedor of vendedores) {
        const { data: presupuestos, error: presupuestosError } = await supabase
          .from('presupuestos')
          .select('id, codigo, total_neto, total_impuestos, total_comisiones, tasa_comision, moneda, fecha_aceptacion, estado')
          .eq('vendedor_id', vendedor.id)
          .in('estado', ['ACEPTADO', 'EN_EJECUCION', 'FACTURADO'])
          .not('fecha_aceptacion', 'is', null)
          .gte('fecha_aceptacion', startDate.toISOString().split('T')[0])
          .lte('fecha_aceptacion', endDate.toISOString().split('T')[0])
          .is('deleted_at', null);

        if (presupuestosError) {
          console.error('❌ Error consultando presupuestos:', presupuestosError);
        }

        console.log(`📊 ${vendedor.full_name} (${vendedor.role}):`, {
          presupuestos: presupuestos?.length || 0,
          codigos: presupuestos?.map(p => p.codigo),
          estados: presupuestos?.map(p => p.estado),
          comisiones: presupuestos?.map(p => p.total_comisiones),
        });

        const totalVentas = presupuestos?.reduce(
          (sum, p) => sum + parseFloat(p.total_neto as any) + parseFloat(p.total_impuestos as any),
          0
        ) || 0;

        const totalComisiones = presupuestos?.reduce(
          (sum, p) => sum + (parseFloat(p.total_comisiones as any) || 0),
          0
        ) || 0;

        const objetivo = await salesTargetsService.getCurrentTargetForUser(vendedor.id);
        const objetivoMonto = objetivo?.objetivo || 0;

        const porcentajeObjetivo = objetivoMonto > 0
          ? Math.round((totalVentas / objetivoMonto) * 100)
          : 0;

        const { data: calculations } = await supabase
          .from('commission_calculations')
          .select('*')
          .eq('vendedor_id', vendedor.id)
          .eq('periodo_anio', selectedYear)
          .eq('periodo_mes', selectedMonth)
          .maybeSingle();

        stats.push({
          vendedor,
          totalVentas,
          totalComisiones,
          porcentajeObjetivo,
          objetivo: objetivoMonto,
          calculation: calculations || undefined,
        });

        totalVentasSum += totalVentas;
        totalComisionesSum += totalComisiones;
        if (totalVentas > 0) vendedoresConVentas++;
      }

      stats.sort((a, b) => b.totalVentas - a.totalVentas);

      setVendedoresStats(stats);
      setPeriodLabel(periodLabel);
      setTotalStats({
        totalVentas: totalVentasSum,
        totalComisiones: totalComisionesSum,
        vendedoresActivos: vendedoresConVentas,
      });
    } catch (error) {
      console.error('Error loading commissions:', error);
      alert('Error al cargar las comisiones');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Vendedor', 'Email', 'Ventas', 'Objetivo', 'Avance %', 'Comisión'],
      ...vendedoresStats.map(stat => [
        stat.vendedor.full_name,
        stat.vendedor.email,
        stat.totalVentas.toString(),
        stat.objetivo.toString(),
        stat.porcentajeObjetivo.toString(),
        stat.totalComisiones.toString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    let filename: string;
    if (useCustomDates && dateFrom && dateTo) {
      filename = `comisiones_${dateFrom}_a_${dateTo}.csv`;
    } else {
      filename = `comisiones_${months[selectedMonth - 1]}_${selectedYear}.csv`;
    }

    link.download = filename;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Comisiones
        </h1>
        <p className="text-gray-600">
          Visualiza el total de comisiones asignadas por vendedor. Las comisiones se asignan individualmente en cada presupuesto.
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomDates}
              onChange={(e) => setUseCustomDates(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Usar rango de fechas personalizado</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          {useCustomDates ? (
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Desde:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Hasta:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={loadCommissionsData}
              variant="outline"
              disabled={loading || (useCustomDates && (!dateFrom || !dateTo))}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              onClick={handleExportReport}
              disabled={loading || vendedoresStats.length === 0}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Ventas Totales</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalStats.totalVentas)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {periodLabel || `En ${months[selectedMonth - 1]} ${selectedYear}`}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Comisiones Totales</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalStats.totalComisiones)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {((totalStats.totalComisiones / totalStats.totalVentas) * 100 || 0).toFixed(1)}% del total de ventas
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">Vendedores Activos</h3>
          <p className="text-2xl font-bold text-gray-900">
            {totalStats.vendedoresActivos}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Con ventas en el período
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Comisiones por Vendedor
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-500">Cargando comisiones...</p>
          </div>
        ) : vendedoresStats.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay datos de comisiones para este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ventas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Objetivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Avance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Comisión Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendedoresStats.map((stat) => (
                  <tr key={stat.vendedor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {stat.vendedor.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stat.vendedor.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(stat.totalVentas)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {formatCurrency(stat.objetivo)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${getProgressColor(stat.porcentajeObjetivo)} transition-all`}
                              style={{ width: `${Math.min(stat.porcentajeObjetivo, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 min-w-[45px]">
                            {stat.porcentajeObjetivo}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(stat.totalComisiones)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Suma de comisiones asignadas
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

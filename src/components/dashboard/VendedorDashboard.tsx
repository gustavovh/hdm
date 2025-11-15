import { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PresupuestoService } from '../../services/api';
import { CommissionsService } from '../../services/commissionsService';
import { salesTargetsService } from '../../services/salesTargetsService';
import { Presupuesto, SalesTarget } from '../../types/database.types';

interface DashboardStats {
  total: number;
  clonado: number;
  presentado: number;
  aceptado: number;
  facturado: number;
  anulado: number;
  montoTotal: number;
  montoClonado: number;
  montoPresentado: number;
  montoAceptado: number;
  montoFacturado: number;
  tasaAceptacion: number;
  montoPromedio: number;
}

export function VendedorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    clonado: 0,
    presentado: 0,
    aceptado: 0,
    facturado: 0,
    anulado: 0,
    montoTotal: 0,
    montoClonado: 0,
    montoPresentado: 0,
    montoAceptado: 0,
    montoFacturado: 0,
    tasaAceptacion: 0,
    montoPromedio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [presupuestosPendientes, setPresupuestosPendientes] = useState<Presupuesto[]>([]);
  const [comisiones, setComisiones] = useState({ estimadas: 0, objetivo: 0, avance: 0 });
  const [currentTarget, setCurrentTarget] = useState<SalesTarget | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const presupuestos = await PresupuestoService.getAll();
      const misPresupuestos = presupuestos.filter(p => p.vendedor_id === user.id && !p.deleted_at);

      const estadisticas = misPresupuestos.reduce((acc, p) => {
        const montoTotal = p.total_neto + p.total_impuestos + p.total_comisiones;

        acc.total++;
        acc.montoTotal += montoTotal;

        switch (p.estado) {
          case 'CLONADO':
            acc.clonado++;
            acc.montoClonado += montoTotal;
            break;
          case 'PRESENTADO':
            acc.presentado++;
            acc.montoPresentado += montoTotal;
            break;
          case 'ACEPTADO':
            acc.aceptado++;
            acc.montoAceptado += montoTotal;
            break;
          case 'FACTURADO':
            acc.facturado++;
            acc.montoFacturado += montoTotal;
            break;
          case 'ANULADO':
            acc.anulado++;
            break;
        }

        return acc;
      }, {
        total: 0,
        clonado: 0,
        presentado: 0,
        aceptado: 0,
        facturado: 0,
        anulado: 0,
        montoTotal: 0,
        montoClonado: 0,
        montoPresentado: 0,
        montoAceptado: 0,
        montoFacturado: 0,
        tasaAceptacion: 0,
        montoPromedio: 0,
      });

      const totalNoAnulados = estadisticas.presentado + estadisticas.aceptado + estadisticas.facturado;
      estadisticas.tasaAceptacion = totalNoAnulados > 0
        ? ((estadisticas.aceptado + estadisticas.facturado) / totalNoAnulados) * 100
        : 0;

      estadisticas.montoPromedio = estadisticas.total > 0
        ? estadisticas.montoTotal / estadisticas.total
        : 0;

      setStats(estadisticas);

      const pendientes = misPresupuestos.filter(
        p => p.estado === 'PRESENTADO' || p.estado === 'ACEPTADO'
      ).slice(0, 5);
      setPresupuestosPendientes(pendientes);

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      try {
        const comisionData = await CommissionsService.calculateMonthlyCommission(
          user.id,
          currentMonth,
          currentYear
        );
        setComisiones({
          estimadas: comisionData.comision_total || 0,
          objetivo: comisionData.objetivo || 0,
          avance: comisionData.porcentaje_cumplimiento || 0,
        });
      } catch (error) {
        console.error('Error cargando comisiones:', error);
      }

      try {
        const target = await salesTargetsService.getCurrentTargetForUser(user.id);
        setCurrentTarget(target);
      } catch (error) {
        console.error('Error cargando objetivo:', error);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {user?.full_name}!
        </h1>
        {currentTarget ? (
          <div className="mt-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <p className="text-lg text-gray-700">
              Tu objetivo este mes: <span className="font-semibold text-blue-600">{formatCurrency(currentTarget.objetivo)} PYG</span>
            </p>
          </div>
        ) : (
          <p className="text-gray-600 mt-2">
            Vista general de tu actividad y rendimiento
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Total Presupuestos</h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.montoTotal)} PYG
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.presentado}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Presentados</h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.montoPresentado)} PYG
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.aceptado}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Aceptados</h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.montoAceptado)} PYG
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">{stats.facturado}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Facturados</h3>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(stats.montoFacturado)} PYG
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{formatPercent(stats.tasaAceptacion)}</span>
          </div>
          <h3 className="text-lg font-semibold">Tasa de Aceptación</h3>
          <p className="text-sm opacity-90 mt-1">
            Presupuestos aceptados vs presentados
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-10 h-10 opacity-80" />
            <span className="text-2xl font-bold">{formatCurrency(stats.montoPromedio)}</span>
          </div>
          <h3 className="text-lg font-semibold">Monto Promedio</h3>
          <p className="text-sm opacity-90 mt-1">
            Por presupuesto (PYG)
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Target className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{formatPercent(comisiones.avance)}</span>
          </div>
          <h3 className="text-lg font-semibold">Avance vs Objetivo</h3>
          <p className="text-sm opacity-90 mt-1">
            Comisiones est.: {formatCurrency(comisiones.estimadas)} PYG
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Presupuestos Pendientes de Seguimiento
          </h2>
        </div>

        {presupuestosPendientes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">¡No tienes presupuestos pendientes de seguimiento!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {presupuestosPendientes.map((presupuesto) => (
              <div
                key={presupuesto.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{presupuesto.cliente_nombre}</p>
                  {presupuesto.concepto && (
                    <p className="text-sm text-gray-600">{presupuesto.concepto}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {presupuesto.estado === 'PRESENTADO' ? 'Esperando respuesta del cliente' : 'Listo para facturar'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatCurrency(presupuesto.total_neto + presupuesto.total_impuestos)} PYG
                  </p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded mt-1 ${
                    presupuesto.estado === 'PRESENTADO'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {presupuesto.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

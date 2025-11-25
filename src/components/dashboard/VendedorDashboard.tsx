import { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Clock,
  Target,
  Award,
  Eye,
  Download,
  Copy,
  RotateCw,
  Receipt,
  Trash2,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PresupuestoService } from '../../services/api';
import { CommissionsService } from '../../services/commissionsService';
import { salesTargetsService } from '../../services/salesTargetsService';
import { Presupuesto, SalesTarget } from '../../types/database.types';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { CambiarEstadoModal } from '../presupuestos/CambiarEstadoModal';
import { FacturacionModal } from '../presupuestos/FacturacionModal';
import { generateHDMStandardPDF } from '../../services/pdfGeneratorHDMStandard';

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

interface VendedorDashboardProps {
  onSelectPresupuesto?: (id: string) => void;
}

export function VendedorDashboard({ onSelectPresupuesto }: VendedorDashboardProps = {}) {
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
  const [allPresupuestos, setAllPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoSearch, setPresupuestoSearch] = useState('');
  const [presupuestoStatusFilter, setPresupuestoStatusFilter] = useState<string>('all');
  const [showCambiarEstado, setShowCambiarEstado] = useState(false);
  const [selectedPresupuestoForEstado, setSelectedPresupuestoForEstado] = useState<Presupuesto | null>(null);
  const [showFacturacion, setShowFacturacion] = useState(false);
  const [selectedPresupuestoForFacturacion, setSelectedPresupuestoForFacturacion] = useState<Presupuesto | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'presupuestos'>('overview');

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
      setAllPresupuestos(misPresupuestos);

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

  const handleDeletePresupuesto = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) return;

    try {
      const { error } = await supabase
        .from('presupuestos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setAllPresupuestos(prev => prev.filter(p => p.id !== id));
      alert('Presupuesto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting presupuesto:', error);
      alert('Error al eliminar el presupuesto');
    }
  };

  const handleClonePresupuesto = async (presupuesto: Presupuesto) => {
    if (!confirm(`¿Deseas clonar el presupuesto ${presupuesto.codigo}? Se creará un nuevo presupuesto en estado CLONADO que podrás editar.`)) return;

    try {
      const newPresupuestoData = {
        cliente_nombre: presupuesto.cliente_nombre,
        cliente_email: presupuesto.cliente_email,
        cliente_telefono: presupuesto.cliente_telefono,
        cliente_documento: presupuesto.cliente_documento,
        vendedor_id: presupuesto.vendedor_id,
        moneda: presupuesto.moneda,
        tipo_cambio: presupuesto.tipo_cambio,
        total_bruto: presupuesto.total_bruto,
        total_descuento: presupuesto.total_descuento,
        total_neto: presupuesto.total_neto,
        total_impuestos: presupuesto.total_impuestos,
        total_comisiones: presupuesto.total_comisiones,
        tasa_impuesto: presupuesto.tasa_impuesto,
        tasa_comision: presupuesto.tasa_comision,
        estado: 'CLONADO' as const,
        observaciones: `Clonado de ${presupuesto.codigo}${presupuesto.observaciones ? ' - ' + presupuesto.observaciones : ''}`,
        concepto: presupuesto.concepto,
        condicion_pago: presupuesto.condicion_pago,
        medio_pago: presupuesto.medio_pago,
        image_urls: presupuesto.image_urls,
      };

      const { data: newPresupuesto, error } = await supabase
        .from('presupuestos')
        .insert(newPresupuestoData)
        .select()
        .single();

      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from('presupuesto_items')
        .select('*')
        .eq('presupuesto_id', presupuesto.id);

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
      } else if (items && items.length > 0) {
        const newItems = items.map(item => ({
          presupuesto_id: newPresupuesto.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          descuento_aplicado: item.descuento_aplicado,
          orden: item.orden,
        }));

        const { error: insertItemsError } = await supabase
          .from('presupuesto_items')
          .insert(newItems);

        if (insertItemsError) {
          console.error('Error cloning items:', insertItemsError);
        }
      }

      alert(`Presupuesto clonado exitosamente: ${newPresupuesto.codigo}`);
      loadDashboardData();
    } catch (error: any) {
      console.error('Error cloning presupuesto:', error);
      alert(`Error al clonar el presupuesto: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleDownloadPresupuesto = async (presupuesto: Presupuesto) => {
    try {
      // Cargar el presupuesto completo con items
      const presupuestoCompleto = await PresupuestoService.getById(presupuesto.id);
      if (!presupuestoCompleto) {
        alert('No se pudo cargar el presupuesto');
        return;
      }

      const blob = await generateHDMStandardPDF(presupuestoCompleto);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Presupuesto_${presupuesto.codigo}_${presupuesto.cliente_nombre?.replace(/\s+/g, '_') || 'cliente'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error downloading presupuesto:', error);
      alert('Error al descargar el presupuesto');
    }
  };

  const getStatusColor = (status: Presupuesto['estado']): 'green' | 'yellow' | 'red' | 'blue' | 'gray' => {
    const colors: Record<Presupuesto['estado'], 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
      CLONADO: 'gray',
      ABIERTO: 'gray',
      PRESENTADO: 'blue',
      ACEPTADO: 'blue',
      EN_EJECUCION: 'yellow',
      FACTURADO: 'green',
      RECHAZADO: 'red',
      CANCELADO: 'red',
      ANULADO: 'red',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status: Presupuesto['estado']) => {
    const labels = {
      CLONADO: 'Clonado',
      ABIERTO: 'Abierto',
      PRESENTADO: 'Presentado',
      ACEPTADO: 'Aprobado',
      EN_EJECUCION: 'En Ejecución',
      FACTURADO: 'Facturado',
      RECHAZADO: 'Rechazado',
      CANCELADO: 'Cancelado',
      ANULADO: 'Anulado',
    };
    return labels[status] || status;
  };

  const formatDateWithTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getDaysElapsed = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredPresupuestos = allPresupuestos.filter((p) => {
    const matchesSearch =
      p.cliente_nombre.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.codigo.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.cliente_documento?.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.concepto?.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.nombre_fantasia?.toLowerCase().includes(presupuestoSearch.toLowerCase());
    const matchesStatus = presupuestoStatusFilter === 'all' || p.estado === presupuestoStatusFilter;
    return matchesSearch && matchesStatus && !p.deleted_at;
  });

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {user?.full_name}!
          </h1>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Resumen
            </button>
            <button
              onClick={() => setActiveTab('presupuestos')}
              className={`${
                activeTab === 'presupuestos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Mis Presupuestos
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {currentTarget ? (
            <div className="mb-6 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Target className="w-5 h-5 text-blue-600" />
              <p className="text-lg text-gray-700">
                Tu objetivo este mes: <span className="font-semibold text-blue-600">{formatCurrency(currentTarget.objetivo)} PYG</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-600 mb-6">
              Vista general de tu actividad y rendimiento
            </p>
          )}

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
        </>
      )}

      {activeTab === 'presupuestos' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Mis Presupuestos</h2>
              <p className="text-gray-600 mt-1">{filteredPresupuestos.length} presupuesto(s) encontrado(s)</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-4 mb-6">
            <div className="flex gap-4">
              <Input
                placeholder="Buscar por código, cliente, documento o referencia..."
                value={presupuestoSearch}
                onChange={(e) => setPresupuestoSearch(e.target.value)}
                className="flex-1"
                icon={<Search className="w-4 h-4" />}
              />
              <select
                value={presupuestoStatusFilter}
                onChange={(e) => setPresupuestoStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              >
                <option value="all">Todos los estados</option>
                <option value="ABIERTO">Abierto</option>
                <option value="PRESENTADO">Presentado</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="FACTURADO">Facturado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-4">Cargando presupuestos...</p>
            </div>
          ) : filteredPresupuestos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron presupuestos</h3>
              <p className="text-gray-600">Intenta cambiar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre Fantasía
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referencia
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días Trans.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider relative" style={{ width: '220px', minWidth: '220px', overflow: 'visible' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPresupuestos.map((presupuesto) => (
                    <tr
                      key={presupuesto.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onSelectPresupuesto && onSelectPresupuesto(presupuesto.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {presupuesto.codigo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {presupuesto.cliente_nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {presupuesto.nombre_fantasia || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {presupuesto.concepto || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatDateWithTime(presupuesto.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${
                          getDaysElapsed(presupuesto.created_at) > 30
                            ? 'bg-red-100 text-red-800'
                            : getDaysElapsed(presupuesto.created_at) > 15
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {getDaysElapsed(presupuesto.created_at)} días
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(presupuesto.total_neto + presupuesto.total_impuestos + presupuesto.total_comisiones)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge color={getStatusColor(presupuesto.estado)}>
                          {getStatusLabel(presupuesto.estado)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-center relative" style={{ width: '220px', minWidth: '220px', overflow: 'visible' }}>
                        {/* TODO: Remove bg-white from buttons if not needed after visual verification */}
                        <div className="flex gap-1 justify-end flex-nowrap z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPresupuesto(presupuesto);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors z-30 bg-white"
                            title="Descargar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClonePresupuesto(presupuesto);
                            }}
                            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors z-30 bg-white"
                            title="Clonar presupuesto"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPresupuestoForEstado(presupuesto);
                              setShowCambiarEstado(true);
                            }}
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors z-30 bg-white"
                            title="Cambiar estado"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPresupuestoForFacturacion(presupuesto);
                              setShowFacturacion(true);
                            }}
                            className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors z-30 bg-white"
                            title="Datos de facturación"
                          >
                            <Receipt className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showCambiarEstado && selectedPresupuestoForEstado && (
        <CambiarEstadoModal
          isOpen={showCambiarEstado}
          onClose={() => {
            setShowCambiarEstado(false);
            setSelectedPresupuestoForEstado(null);
          }}
          presupuestoId={selectedPresupuestoForEstado.id}
          presupuestoCodigo={selectedPresupuestoForEstado.codigo}
          estadoActual={selectedPresupuestoForEstado.estado}
          onEstadoCambiado={loadDashboardData}
        />
      )}

      {showFacturacion && selectedPresupuestoForFacturacion && (
        <FacturacionModal
          isOpen={showFacturacion}
          onClose={() => {
            setShowFacturacion(false);
            setSelectedPresupuestoForFacturacion(null);
          }}
          presupuesto={selectedPresupuestoForFacturacion}
          onSuccess={loadDashboardData}
        />
      )}
    </div>
  );
}

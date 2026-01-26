import { useState, useEffect } from 'react';
import { SolicitudDescuento, Presupuesto, User, SalesTarget } from '../../types/database.types';
import { DiscountRequestService, PresupuestoService } from '../../services/api';
import { userService } from '../../services/userService';
import { salesTargetsService } from '../../services/salesTargetsService';
import { FilterOptions, PaginationOptions } from '../../types/api.types';
import { DiscountRequestList } from '../discount/DiscountRequestList';
import { ApprovalModal } from './ApprovalModal';
import { SalesTargetsManager } from './SalesTargetsManager';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { exportService } from '../../services/exportService';
import { Filter, RefreshCw, FileText, Trash2, Search, Target, TrendingUp, DollarSign, Users, Download, Calendar, Eye, RotateCw, Receipt, Copy } from 'lucide-react';
import { CambiarEstadoModal } from '../presupuestos/CambiarEstadoModal';
import { FacturacionModal } from '../presupuestos/FacturacionModal';
import { generateHDMStandardPDF } from '../../services/pdfGeneratorHDMStandard';
import { FacturacionView } from './FacturacionView';
import { SolicitudesEstadoManager } from './SolicitudesEstadoManager';

interface GeneralStats {
  totalPresupuestos: number;
  totalMonto: number;
  totalPresentados: number;
  totalAceptados: number;
  totalEnEjecucion: number;
  totalFacturados: number;
  montoFacturado: number;
  montoEnEjecucion: number;
  tasaConversion: number;
  montoPromedio: number;
}

interface AdminDashboardProps {
  onSelectPresupuesto?: (id: string) => void;
  onCreatePresupuesto?: () => void;
}

export function AdminDashboard({ onSelectPresupuesto, onCreatePresupuesto }: AdminDashboardProps) {
  const { user, isAdmin, isAdministrativo } = useAuth();
  const [requests, setRequests] = useState<SolicitudDescuento[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SolicitudDescuento | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({ estado: ['PENDIENTE'] });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'presupuestos' | 'targets' | 'indicators' | 'facturacion' | 'solicitudes_estado'>('indicators');
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestosLoading, setPresupuestosLoading] = useState(false);
  const [presupuestoSearch, setPresupuestoSearch] = useState('');
  const [presupuestoStatusFilter, setPresupuestoStatusFilter] = useState<string>('all');
  const [vendedores, setVendedores] = useState<User[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');
  const [filterType, setFilterType] = useState<'month' | 'range'>('month');
  const [dateFilter, setDateFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [dateRangeFilter, setDateRangeFilter] = useState({
    from: '',
    to: '',
  });
  const [generalStats, setGeneralStats] = useState<GeneralStats>({
    totalPresupuestos: 0,
    totalMonto: 0,
    totalPresentados: 0,
    totalAceptados: 0,
    totalEnEjecucion: 0,
    totalFacturados: 0,
    montoFacturado: 0,
    montoEnEjecucion: 0,
    tasaConversion: 0,
    montoPromedio: 0,
  });
  const [currentTarget, setCurrentTarget] = useState<SalesTarget | null>(null);
  const [showCambiarEstado, setShowCambiarEstado] = useState(false);
  const [selectedPresupuestoForEstado, setSelectedPresupuestoForEstado] = useState<Presupuesto | null>(null);
  const [showFacturacion, setShowFacturacion] = useState(false);
  const [selectedPresupuestoForFacturacion, setSelectedPresupuestoForFacturacion] = useState<Presupuesto | null>(null);

  useEffect(() => {
    loadVendedores();
    if (isAdministrativo && user) {
      loadCurrentTarget();
    }
  }, [isAdministrativo, user]);

  useEffect(() => {
    loadRequests();
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'presupuestos') {
      loadPresupuestos();
    } else if (activeTab === 'indicators') {
      loadPresupuestos();
    }
  }, [activeTab, dateFilter, dateRangeFilter, selectedVendedor, filterType]);

  const loadVendedores = async () => {
    try {
      const data = await userService.getVendedores();
      setVendedores(data.filter(v => v.active));
    } catch (error) {
      console.error('Error loading vendedores:', error);
    }
  };

  const loadCurrentTarget = async () => {
    if (!user) return;
    try {
      const target = await salesTargetsService.getCurrentTargetForUser(user.id);
      setCurrentTarget(target);
    } catch (error) {
      console.error('Error cargando objetivo:', error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const pagination: PaginationOptions = {
        page: 1,
        limit: 50,
        order_by: 'created_at',
        order_direction: 'desc',
      };

      const response = await DiscountRequestService.list(filters, pagination);
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPresupuestos = async () => {
    setPresupuestosLoading(true);
    try {
      const data = await PresupuestoService.getAll();
      setPresupuestos(data || []);
      calculateGeneralStats(data || []);
    } catch (error) {
      console.error('Error loading presupuestos:', error);
      setPresupuestos([]);
    } finally {
      setPresupuestosLoading(false);
    }
  };

  const calculateGeneralStats = (allPresupuestos: Presupuesto[]) => {
    const filteredData = allPresupuestos.filter(p => {
      const createdDate = new Date(p.created_at);

      let matchesDate = false;
      if (filterType === 'month') {
        matchesDate =
          createdDate.getMonth() + 1 === dateFilter.month &&
          createdDate.getFullYear() === dateFilter.year;
      } else {
        let from = dateRangeFilter.from ? new Date(dateRangeFilter.from) : null;
        let to = dateRangeFilter.to ? new Date(dateRangeFilter.to) : null;

        if (from) {
          from.setHours(0, 0, 0, 0);
        }
        if (to) {
          to.setHours(23, 59, 59, 999);
        }

        if (from && to) {
          matchesDate = createdDate >= from && createdDate <= to;
        } else if (from) {
          matchesDate = createdDate >= from;
        } else if (to) {
          matchesDate = createdDate <= to;
        } else {
          matchesDate = true;
        }
      }

      const matchesVendedor = selectedVendedor === 'all' || p.vendedor_id === selectedVendedor;
      const notClonado = isAdmin ? p.estado !== 'CLONADO' : true;
      return matchesDate && matchesVendedor && notClonado && !p.deleted_at;
    });

    const stats = filteredData.reduce((acc, p) => {
      const montoTotal = p.total_neto + p.total_impuestos;
      acc.totalPresupuestos++;
      acc.totalMonto += montoTotal;

      if (p.estado === 'PRESENTADO') acc.totalPresentados++;
      if (p.estado === 'ACEPTADO') {
        acc.totalAceptados++;
        acc.montoEnEjecucion += montoTotal;
        acc.totalEnEjecucion++;
      }
      if (p.estado === 'EN_EJECUCION') {
        acc.montoEnEjecucion += montoTotal;
        acc.totalEnEjecucion++;
      }
      if (p.estado === 'FACTURADO') {
        acc.totalFacturados++;
        acc.montoFacturado += montoTotal;
        acc.montoEnEjecucion += montoTotal;
        acc.totalEnEjecucion++;
      }

      return acc;
    }, {
      totalPresupuestos: 0,
      totalMonto: 0,
      totalPresentados: 0,
      totalAceptados: 0,
      totalEnEjecucion: 0,
      totalFacturados: 0,
      montoFacturado: 0,
      montoEnEjecucion: 0,
    });

    const tasaConversion = stats.totalPresentados > 0
      ? ((stats.totalAceptados / stats.totalPresentados) * 100)
      : 0;

    const montoPromedio = stats.totalFacturados > 0
      ? stats.montoFacturado / stats.totalFacturados
      : 0;

    setGeneralStats({
      ...stats,
      tasaConversion,
      montoPromedio,
    });
  };

  const handleDeletePresupuesto = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) return;

    try {
      const { error } = await supabase
        .from('presupuestos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setPresupuestos(prev => prev.filter(p => p.id !== id));

      calculateGeneralStats(presupuestos.filter(p => p.id !== id));

      alert('Presupuesto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting presupuesto:', error);
      alert('Error al eliminar el presupuesto');
    }
  };

  const handleClonePresupuesto = async (presupuesto: Presupuesto) => {
    if (!confirm(`¿Deseas clonar el presupuesto ${presupuesto.codigo}? Se creará un nuevo presupuesto en estado CLONADO que podrás editar.`)) return;

    try {
      const observacionesLimpias = presupuesto.observaciones
        ? presupuesto.observaciones.replace(/CLONADO DE [^\-]+ - /gi, '').trim()
        : '';

      const newPresupuestoData = {
        cliente_nombre: presupuesto.cliente_nombre,
        cliente_email: presupuesto.cliente_email,
        cliente_telefono: presupuesto.cliente_telefono,
        cliente_documento: presupuesto.cliente_documento,
        nombre_fantasia: presupuesto.nombre_fantasia,
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
        observaciones: observacionesLimpias || null,
        concepto: presupuesto.concepto,
        condicion_pago: presupuesto.condicion_pago,
        medio_pago: presupuesto.medio_pago,
        image_urls: presupuesto.image_urls,
        duracion_obra: presupuesto.duracion_obra,
        porcentaje_anticipo: presupuesto.porcentaje_anticipo,
        plazo_entrega: presupuesto.plazo_entrega,
      };

      const { data: newPresupuesto, error } = await supabase
        .from('presupuestos')
        .insert(newPresupuestoData)
        .select()
        .single();

      if (error) {
        console.error('Clone error details:', error);
        throw error;
      }

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

      alert(`Presupuesto clonado exitosamente: ${newPresupuesto.codigo}\n\nAhora puedes editarlo haciendo clic en el ícono de ojo.`);
      loadPresupuestos();

      if (onSelectPresupuesto) {
        onSelectPresupuesto(newPresupuesto.id);
      }
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

      // Generate filename: Presupuesto [codigo] - [concepto]
      const sanitize = (text: string) => text.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').replace(/\s+/g, ' ').trim();
      const concepto = presupuesto.concepto ? sanitize(presupuesto.concepto) : 'Sin concepto';
      link.download = `Presupuesto ${presupuesto.codigo} - ${concepto}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error downloading presupuesto:', error);
      alert('Error al descargar el presupuesto');
    }
  };

  const handleApprove = async (id: string, comentario?: string) => {
    if (!user) return;
    await DiscountRequestService.approve(id, user.id, comentario);
    await loadRequests();
  };

  const handleApproveWithModification = async (
    id: string,
    valorAprobado: number,
    comentario?: string
  ) => {
    if (!user) return;
    await DiscountRequestService.approveWithModification(id, user.id, valorAprobado, comentario);
    await loadRequests();
  };

  const handleReject = async (id: string, comentario: string) => {
    if (!user) return;
    await DiscountRequestService.reject(id, user.id, comentario);
    await loadRequests();
  };

  const filteredRequests = (requests || []).filter((request) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      request.presupuesto?.codigo.toLowerCase().includes(search) ||
      request.presupuesto?.cliente_nombre.toLowerCase().includes(search) ||
      request.vendedor?.full_name.toLowerCase().includes(search)
    );
  });

  const pendingCount = requests.filter((r) => r.estado === 'PENDIENTE').length;

  const filteredPresupuestos = (presupuestos || []).filter((p) => {
    const matchesSearch =
      p.cliente_nombre.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.codigo.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.cliente_documento?.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.vendedor?.full_name?.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.vendedor?.email?.toLowerCase().includes(presupuestoSearch.toLowerCase()) ||
      p.nombre_fantasia?.toLowerCase().includes(presupuestoSearch.toLowerCase());
    const matchesStatus = presupuestoStatusFilter === 'all' || p.estado === presupuestoStatusFilter;
    const matchesVendedor = selectedVendedor === 'all' || p.vendedor_id === selectedVendedor;
    const notClonado = isAdmin ? p.estado !== 'CLONADO' : true;
    return matchesSearch && matchesStatus && matchesVendedor && notClonado && !p.deleted_at;
  });

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateWithTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  const getDaysElapsed = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getFilterInfo = () => {
    let info = '';

    if (filterType === 'month') {
      const monthName = new Date(2000, dateFilter.month - 1).toLocaleString('es', { month: 'long' });
      info = `${monthName} ${dateFilter.year}`;
    } else {
      if (dateRangeFilter.from && dateRangeFilter.to) {
        info = `Desde ${new Date(dateRangeFilter.from).toLocaleDateString('es-PY')} hasta ${new Date(dateRangeFilter.to).toLocaleDateString('es-PY')}`;
      } else if (dateRangeFilter.from) {
        info = `Desde ${new Date(dateRangeFilter.from).toLocaleDateString('es-PY')}`;
      } else if (dateRangeFilter.to) {
        info = `Hasta ${new Date(dateRangeFilter.to).toLocaleDateString('es-PY')}`;
      } else {
        info = 'Todas las fechas';
      }
    }

    if (selectedVendedor !== 'all') {
      const vendedor = vendedores.find(v => v.id === selectedVendedor);
      if (vendedor) {
        info += ` - Vendedor: ${vendedor.full_name}`;
      }
    } else {
      info += ' - Todos los vendedores';
    }

    return info;
  };

  const getFilteredPresupuestosForExport = () => {
    return presupuestos.filter(p => {
      const createdDate = new Date(p.created_at);

      let matchesDate = false;
      if (filterType === 'month') {
        matchesDate =
          createdDate.getMonth() + 1 === dateFilter.month &&
          createdDate.getFullYear() === dateFilter.year;
      } else {
        let from = dateRangeFilter.from ? new Date(dateRangeFilter.from) : null;
        let to = dateRangeFilter.to ? new Date(dateRangeFilter.to) : null;

        if (from) {
          from.setHours(0, 0, 0, 0);
        }
        if (to) {
          to.setHours(23, 59, 59, 999);
        }

        if (from && to) {
          matchesDate = createdDate >= from && createdDate <= to;
        } else if (from) {
          matchesDate = createdDate >= from;
        } else if (to) {
          matchesDate = createdDate <= to;
        } else {
          matchesDate = true;
        }
      }

      const matchesVendedor = selectedVendedor === 'all' || p.vendedor_id === selectedVendedor;
      const notClonado = isAdmin ? p.estado !== 'CLONADO' : true;
      return matchesDate && matchesVendedor && notClonado && !p.deleted_at;
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const formatCurrencySimple = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getGreeting()}, {user?.full_name}!
            </h1>
            {isAdmin ? (
              <p className="text-gray-600 mt-2">
                Tu objetivo: Supervisar las operaciones y aprobar solicitudes de descuento
              </p>
            ) : isAdministrativo && currentTarget ? (
              <div className="mt-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <p className="text-lg text-gray-700">
                  Tu objetivo este mes: <span className="font-semibold text-blue-600">{formatCurrencySimple(currentTarget.objetivo)} PYG</span>
                </p>
              </div>
            ) : isAdministrativo ? (
              <p className="text-gray-600 mt-2">
                Vista general de tu actividad y rendimiento
              </p>
            ) : null}
          </div>
          {isAdministrativo && onCreatePresupuesto && (
            <Button onClick={onCreatePresupuesto}>
              Nuevo Presupuesto
            </Button>
          )}
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('indicators')}
              className={`${
                activeTab === 'indicators'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Indicadores Generales
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Solicitudes de Descuento
              {pendingCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('presupuestos')}
              className={`${
                activeTab === 'presupuestos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Presupuestos por Vendedor
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('targets')}
                className={`${
                  activeTab === 'targets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Objetivos de Ventas
              </button>
            )}
            <button
              onClick={() => setActiveTab('facturacion')}
              className={`${
                activeTab === 'facturacion'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <Receipt className="w-4 h-4 inline-block mr-2" />
              Datos de Facturación
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('solicitudes_estado')}
                className={`${
                  activeTab === 'solicitudes_estado'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                <RotateCw className="w-4 h-4 inline-block mr-2" />
                Solicitudes de Estado
              </button>
            )}
          </nav>
        </div>

        {activeTab === 'indicators' && (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="month"
                    checked={filterType === 'month'}
                    onChange={(e) => setFilterType(e.target.value as 'month')}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Por Mes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="range"
                    checked={filterType === 'range'}
                    onChange={(e) => setFilterType(e.target.value as 'range')}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Rango de Fechas</span>
                </label>
              </div>

              <div className="flex gap-4 items-end">
                {filterType === 'month' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                      <select
                        value={dateFilter.month}
                        onChange={(e) => setDateFilter({ ...dateFilter, month: parseInt(e.target.value) })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                      <Input
                        type="number"
                        value={dateFilter.year}
                        onChange={(e) => setDateFilter({ ...dateFilter, year: parseInt(e.target.value) })}
                        min={2020}
                        max={2100}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Desde
                      </label>
                      <Input
                        type="date"
                        value={dateRangeFilter.from}
                        onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, from: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Hasta
                      </label>
                      <Input
                        type="date"
                        value={dateRangeFilter.to}
                        onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, to: e.target.value })}
                      />
                    </div>
                  </>
                )}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                  <select
                    value={selectedVendedor}
                    onChange={(e) => setSelectedVendedor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los vendedores</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={loadPresupuestos} variant="ghost" disabled={presupuestosLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${presupuestosLoading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-gray-900">{generalStats.totalPresupuestos}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Total Presupuestos</h3>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(generalStats.totalMonto)}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                  <span className="text-2xl font-bold text-gray-900">{generalStats.totalPresentados}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Presentados</h3>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold text-gray-900">{generalStats.totalEnEjecucion}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600">En Ejecución</h3>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(generalStats.montoEnEjecucion)}</p>
                <p className="text-xs text-gray-400 mt-1">Incluye Aceptados, En Ejecución y Facturados</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                  <span className="text-2xl font-bold text-gray-900">{generalStats.totalFacturados}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600">Facturados</h3>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(generalStats.montoFacturado)}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                  <span className="text-2xl font-bold">{generalStats.tasaConversion.toFixed(1)}%</span>
                </div>
                <h3 className="text-sm font-semibold">Tasa de Conversión</h3>
                <p className="text-xs opacity-90 mt-1">Presentados → Aceptados</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 opacity-80" />
                  <span className="text-xl font-bold">{formatCurrencySimple(generalStats.montoPromedio)}</span>
                </div>
                <h3 className="text-sm font-semibold">Monto Promedio</h3>
                <p className="text-xs opacity-90 mt-1">Por presupuesto facturado</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 opacity-80" />
                  <span className="text-3xl font-bold">{vendedores.length}</span>
                </div>
                <h3 className="text-lg font-semibold">Vendedores Activos</h3>
                <p className="text-sm opacity-90 mt-1">Total de vendedores en el sistema</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Listado de Presupuestos</h3>
              <p className="text-sm text-gray-600 mb-4">
                {getFilteredPresupuestosForExport().length} presupuesto(s) en el período seleccionado
              </p>

              {getFilteredPresupuestosForExport().length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay presupuestos en este período</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Código
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Vendedor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredPresupuestosForExport().map((presupuesto) => (
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
                            {presupuesto.vendedor?.full_name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {new Date(presupuesto.created_at).toLocaleDateString('es-PY')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(presupuesto.total_neto + presupuesto.total_impuestos)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <Badge color={getStatusColor(presupuesto.estado)}>
                              {getStatusLabel(presupuesto.estado)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-1 justify-center flex-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPresupuesto && onSelectPresupuesto(presupuesto.id);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPresupuesto(presupuesto);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Descargar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClonePresupuesto(presupuesto);
                                }}
                                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                                title="Clonar presupuesto"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPresupuestoForEstado(presupuesto);
                                  setShowCambiarEstado(true);
                                }}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Cambiar estado"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPresupuestoForFacturacion(presupuesto);
                                  setShowFacturacion(true);
                                }}
                                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                                title="Datos de facturación"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePresupuesto(presupuesto.id);
                                }}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exportar Datos</h3>
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    const filterInfo = getFilterInfo();
                    const filteredData = getFilteredPresupuestosForExport();
                    exportService.exportToTXT({
                      presupuestos: filteredData,
                      totalMonto: generalStats.totalMonto,
                      totalPresentados: generalStats.totalPresentados,
                      totalAceptados: generalStats.totalAceptados,
                      totalFacturados: generalStats.totalFacturados,
                      montoFacturado: generalStats.montoFacturado,
                      filterInfo,
                    });
                  }}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar a TXT
                </Button>
                <Button
                  onClick={() => {
                    const filterInfo = getFilterInfo();
                    const filteredData = getFilteredPresupuestosForExport();
                    exportService.exportToXLS({
                      presupuestos: filteredData,
                      totalMonto: generalStats.totalMonto,
                      totalPresentados: generalStats.totalPresentados,
                      totalAceptados: generalStats.totalAceptados,
                      totalFacturados: generalStats.totalFacturados,
                      montoFacturado: generalStats.montoFacturado,
                      filterInfo,
                    });
                  }}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'requests' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Aprobación de Descuentos</h2>
                <p className="text-gray-600 mt-1">
                  {pendingCount > 0 ? (
                    <span className="font-medium text-orange-600">
                      {pendingCount} solicitudes pendientes de aprobación
                    </span>
                  ) : (
                    'No hay solicitudes pendientes'
                  )}
                </p>
              </div>
              <Button onClick={loadRequests} variant="ghost" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Buscar por código, cliente o vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <Select
                    label="Estado"
                    value={Array.isArray(filters.estado) ? 'multiple' : filters.estado || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters({
                        ...filters,
                        estado: value === 'all' ? undefined : [value as any],
                      });
                    }}
                    options={[
                      { value: 'all', label: 'Todos los estados' },
                      { value: 'PENDIENTE', label: 'Pendiente' },
                      { value: 'APROBADO', label: 'Aprobado' },
                      { value: 'RECHAZADO', label: 'Rechazado' },
                      { value: 'APROBADO_MODIFICADO', label: 'Aprobado Modificado' },
                    ]}
                  />

                  <Input
                    type="date"
                    label="Desde"
                    value={filters.fecha_desde || ''}
                    onChange={(e) => setFilters({ ...filters, fecha_desde: e.target.value })}
                  />

                  <Input
                    type="date"
                    label="Hasta"
                    value={filters.fecha_hasta || ''}
                    onChange={(e) => setFilters({ ...filters, fecha_hasta: e.target.value })}
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-600 mt-4">Cargando solicitudes...</p>
              </div>
            ) : (
              <DiscountRequestList
                requests={filteredRequests}
                onView={isAdmin ? setSelectedRequest : undefined}
                isAdmin={isAdmin}
                isAdministrativo={isAdministrativo}
              />
            )}
          </>
        )}

        {activeTab === 'presupuestos' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Presupuestos por Vendedor</h2>
                <p className="text-gray-600 mt-1">{filteredPresupuestos.length} presupuesto(s) encontrado(s)</p>
              </div>
              <Button onClick={loadPresupuestos} variant="ghost" disabled={presupuestosLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${presupuestosLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 space-y-4 mb-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Buscar por código, cliente, documento o vendedor..."
                  value={presupuestoSearch}
                  onChange={(e) => setPresupuestoSearch(e.target.value)}
                  className="flex-1"
                  icon={<Search className="w-4 h-4" />}
                />
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los vendedores</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.full_name}
                    </option>
                  ))}
                </select>
                <Select
                  value={presupuestoStatusFilter}
                  onChange={(e) => setPresupuestoStatusFilter(e.target.value)}
                  className="w-48"
                >
                  <option value="all">Todos los estados</option>
                  <option value="CLONADO">Clonado</option>
                  <option value="ABIERTO">Abierto</option>
                  <option value="PRESENTADO">Presentado</option>
                  <option value="ACEPTADO">Aceptado</option>
                  <option value="EN_EJECUCION">En Ejecución</option>
                  <option value="FACTURADO">Facturado</option>
                  <option value="RECHAZADO">Rechazado</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="ANULADO">Anulado</option>
                </Select>
              </div>
            </div>

            {presupuestosLoading ? (
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Scroll bar superior visible */}
                <div className="bg-gray-50 p-2 border-b border-gray-200">
                  <div
                    className="overflow-x-auto"
                    style={{
                      overflowY: 'hidden',
                      height: '20px',
                      background: 'linear-gradient(to right, #e5e7eb 0%, #e5e7eb 100%)',
                      borderRadius: '4px'
                    }}
                    onScroll={(e) => {
                      const target = e.target as HTMLDivElement;
                      const tableContainer = target.parentElement?.parentElement?.querySelector('.table-scroll-container') as HTMLDivElement;
                      if (tableContainer) {
                        tableContainer.scrollLeft = target.scrollLeft;
                      }
                    }}
                  >
                    <div style={{ height: '1px', width: '1600px' }}></div>
                  </div>
                </div>

                {/* Tabla con scroll */}
                <div
                  className="overflow-x-auto table-scroll-container"
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement;
                    const topScroll = target.parentElement?.querySelector('.overflow-x-auto') as HTMLDivElement;
                    if (topScroll && topScroll !== target) {
                      topScroll.scrollLeft = target.scrollLeft;
                    }
                  }}
                >
                <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1600px' }}>
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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px', minWidth: '280px' }}>
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
                        <td className="px-4 py-3 text-sm text-gray-900" style={{ minWidth: '200px' }}>
                          {presupuesto.cliente_nombre}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700" style={{ minWidth: '150px' }}>
                          {presupuesto.nombre_fantasia || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700" style={{ minWidth: '250px' }}>
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
                          {formatCurrency(presupuesto.total_neto + presupuesto.total_impuestos)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Badge color={getStatusColor(presupuesto.estado)}>
                            {getStatusLabel(presupuesto.estado)}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 text-center" style={{ width: '280px', minWidth: '280px' }}>
                          <div className="flex gap-1 justify-center flex-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPresupuesto && onSelectPresupuesto(presupuesto.id);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPresupuesto(presupuesto);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Descargar PDF"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClonePresupuesto(presupuesto);
                              }}
                              className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
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
                              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
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
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                              title="Datos de facturación"
                            >
                              <Receipt className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePresupuesto(presupuesto.id);
                              }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'targets' && <SalesTargetsManager />}

        {activeTab === 'facturacion' && <FacturacionView />}

        {activeTab === 'solicitudes_estado' && <SolicitudesEstadoManager />}
      </div>

      {isAdmin && (
        <ApprovalModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          onApprove={handleApprove}
          onApproveWithModification={handleApproveWithModification}
          onReject={handleReject}
        />
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
          onEstadoCambiado={loadPresupuestos}
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
          onSuccess={loadPresupuestos}
        />
      )}
    </div>
  );
}

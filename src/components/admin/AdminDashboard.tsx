import { useState, useEffect } from 'react';
import { SolicitudDescuento, Presupuesto } from '../../types/database.types';
import { DiscountRequestService, PresupuestoService } from '../../services/api';
import { FilterOptions, PaginationOptions } from '../../types/api.types';
import { DiscountRequestList } from '../discount/DiscountRequestList';
import { ApprovalModal } from './ApprovalModal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Filter, RefreshCw, FileText, Trash2, Search } from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SolicitudDescuento[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SolicitudDescuento | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    estado: ['PENDIENTE'],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'presupuestos'>('requests');
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestosLoading, setPresupuestosLoading] = useState(false);
  const [presupuestoSearch, setPresupuestoSearch] = useState('');
  const [presupuestoStatusFilter, setPresupuestoStatusFilter] = useState<string>('all');

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

  useEffect(() => {
    loadRequests();
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'presupuestos') {
      loadPresupuestos();
    }
  }, [activeTab]);

  const loadPresupuestos = async () => {
    setPresupuestosLoading(true);
    try {
      const data = await PresupuestoService.getAll();
      setPresupuestos(data || []);
    } catch (error) {
      console.error('Error loading presupuestos:', error);
      setPresupuestos([]);
    } finally {
      setPresupuestosLoading(false);
    }
  };

  const handleDeletePresupuesto = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPresupuestos();
      alert('Presupuesto eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting presupuesto:', error);
      alert('Error al eliminar el presupuesto');
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

    await DiscountRequestService.approveWithModification(
      id,
      user.id,
      valorAprobado,
      comentario
    );
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
      p.cliente_documento?.toLowerCase().includes(presupuestoSearch.toLowerCase());
    const matchesStatus = presupuestoStatusFilter === 'all' || p.estado === presupuestoStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Presupuesto['estado']) => {
    const colors = {
      BORRADOR: 'gray',
      PRESENTADO: 'blue',
      ACEPTADO: 'green',
      FACTURADO: 'purple',
      ANULADO: 'red',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status: Presupuesto['estado']) => {
    const labels = {
      BORRADOR: 'Borrador',
      PRESENTADO: 'Presentado',
      ACEPTADO: 'Aceptado',
      FACTURADO: 'Facturado',
      ANULADO: 'Anulado',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: currency === 'PYG' ? 'PYG' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Panel de Administración
        </h1>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
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
              Gestión de Presupuestos
            </button>
          </nav>
        </div>

        {activeTab === 'requests' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Aprobación de Descuentos
                </h2>
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
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
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
                onChange={(e) =>
                  setFilters({ ...filters, fecha_desde: e.target.value })
                }
              />

              <Input
                type="date"
                label="Hasta"
                value={filters.fecha_hasta || ''}
                onChange={(e) =>
                  setFilters({ ...filters, fecha_hasta: e.target.value })
                }
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
            onView={setSelectedRequest}
            isAdmin
          />
        )}
      </>
    )}

        {activeTab === 'presupuestos' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Todos los Presupuestos
                </h2>
                <p className="text-gray-600 mt-1">
                  {filteredPresupuestos.length} presupuesto(s) encontrado(s)
                </p>
              </div>
              <Button onClick={loadPresupuestos} variant="ghost" disabled={presupuestosLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${presupuestosLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 space-y-4 mb-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Buscar por código, cliente o documento..."
                  value={presupuestoSearch}
                  onChange={(e) => setPresupuestoSearch(e.target.value)}
                  className="flex-1"
                  icon={<Search className="w-4 h-4" />}
                />
                <Select
                  value={presupuestoStatusFilter}
                  onChange={(e) => setPresupuestoStatusFilter(e.target.value)}
                  className="w-48"
                >
                  <option value="all">Todos los estados</option>
                  <option value="BORRADOR">Borrador</option>
                  <option value="PRESENTADO">Presentado</option>
                  <option value="ACEPTADO">Aceptado</option>
                  <option value="FACTURADO">Facturado</option>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron presupuestos
                </h3>
                <p className="text-gray-600">
                  Intenta cambiar los filtros de búsqueda
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPresupuestos.map((presupuesto) => (
                  <div
                    key={presupuesto.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {presupuesto.codigo}
                          </h3>
                          <Badge color={getStatusColor(presupuesto.estado)}>
                            {getStatusLabel(presupuesto.estado)}
                          </Badge>
                        </div>
                        <p className="text-base font-medium text-gray-800 mb-1">
                          Cliente: {presupuesto.cliente_nombre}
                        </p>
                        {presupuesto.concepto && (
                          <p className="text-sm text-gray-700 mb-1">
                            Concepto: {presupuesto.concepto}
                          </p>
                        )}
                        {presupuesto.cliente_documento && (
                          <p className="text-sm text-gray-600 mb-1">
                            Documento: {presupuesto.cliente_documento}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Creado: {new Date(presupuesto.created_at).toLocaleDateString('es-PY')} -
                          Vendedor ID: {presupuesto.vendedor_id?.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(
                              presupuesto.total_neto + presupuesto.total_impuestos + presupuesto.total_comisiones,
                              presupuesto.moneda
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Neto: {formatCurrency(presupuesto.total_neto, presupuesto.moneda)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePresupuesto(presupuesto.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ApprovalModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onApprove={handleApprove}
        onApproveWithModification={handleApproveWithModification}
        onReject={handleReject}
      />
    </div>
  );
}

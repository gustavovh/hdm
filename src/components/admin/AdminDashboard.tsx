import { useState, useEffect } from 'react';
import { SolicitudDescuento } from '../../types/database.types';
import { DiscountRequestService } from '../../services/api';
import { FilterOptions, PaginationOptions } from '../../types/api.types';
import { DiscountRequestList } from '../discount/DiscountRequestList';
import { ApprovalModal } from './ApprovalModal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { Filter, RefreshCw } from 'lucide-react';

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
      setRequests(response.data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filters]);

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

  const filteredRequests = requests.filter((request) => {
    if (!searchTerm) return true;

    const search = searchTerm.toLowerCase();
    return (
      request.presupuesto?.codigo.toLowerCase().includes(search) ||
      request.presupuesto?.cliente_nombre.toLowerCase().includes(search) ||
      request.vendedor?.full_name.toLowerCase().includes(search)
    );
  });

  const pendingCount = requests.filter((r) => r.estado === 'PENDIENTE').length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Aprobación de Descuentos
            </h1>
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

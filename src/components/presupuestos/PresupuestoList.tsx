import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Presupuesto } from '../../types/database.types';
import { PresupuestoService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface PresupuestoListProps {
  onSelectPresupuesto: (id: string) => void;
  onCreateNew: () => void;
}

export function PresupuestoList({ onSelectPresupuesto, onCreateNew }: PresupuestoListProps) {
  const { user, isAdmin } = useAuth();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPresupuestos();
  }, []);

  const handleClone = async (e: React.MouseEvent, presupuestoId: string) => {
    e.stopPropagation();
    if (!user) return;

    if (!confirm('¿Deseas clonar este presupuesto? Se creará una copia en estado Borrador.')) {
      return;
    }

    try {
      await PresupuestoService.clone(presupuestoId, user.id);
      await loadPresupuestos();
      alert('Presupuesto clonado exitosamente');
    } catch (error) {
      console.error('Error clonando presupuesto:', error);
      alert('Error al clonar el presupuesto');
    }
  };

  const loadPresupuestos = async () => {
    try {
      setLoading(true);
      const data = await PresupuestoService.getAll();
      setPresupuestos(data || []);
    } catch (error) {
      console.error('Error loading presupuestos:', error);
      setPresupuestos([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Presupuesto['estado']) => {
    const colors: Record<string, string> = {
      BORRADOR: 'gray',
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
    const labels: Record<string, string> = {
      BORRADOR: 'Borrador',
      ABIERTO: 'Abierto',
      PRESENTADO: 'Presentado',
      ACEPTADO: 'Aceptado',
      EN_EJECUCION: 'En Ejecución',
      FACTURADO: 'Facturado',
      RECHAZADO: 'Rechazado',
      CANCELADO: 'Cancelado',
      ANULADO: 'Anulado',
    };
    return labels[status] || status;
  };

  const filteredPresupuestos = (presupuestos || []).filter((p) => {
    const matchesSearch =
      p.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_documento?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: currency === 'PYG' ? 'PYG' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mis Presupuestos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona tus presupuestos y solicitudes de descuento
            </p>
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Presupuesto
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ABIERTO">Abierto</option>
              <option value="PRESENTADO">Presentado</option>
              <option value="ACEPTADO">Aceptado</option>
              <option value="EN_EJECUCION">En Ejecución</option>
              <option value="FACTURADO">Facturado</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="CANCELADO">Cancelado</option>
              {isAdmin && <option value="ANULADO">Anulado</option>}
            </Select>
          </div>
        </div>
      </div>

      {filteredPresupuestos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron presupuestos'
              : 'Aún no tienes presupuestos'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Intenta cambiar los filtros de búsqueda'
              : 'Crea tu primer presupuesto para comenzar'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Presupuesto
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPresupuestos.map((presupuesto) => (
            <div
              key={presupuesto.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectPresupuesto(presupuesto.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {presupuesto.cliente_nombre}
                    </h3>
                    <Badge color={getStatusColor(presupuesto.estado)}>
                      {getStatusLabel(presupuesto.estado)}
                    </Badge>
                  </div>
                  {presupuesto.concepto && (
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {presupuesto.concepto}
                    </p>
                  )}
                  {presupuesto.cliente_documento && (
                    <p className="text-sm text-gray-600 mb-2">
                      Documento: {presupuesto.cliente_documento}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {presupuesto.observaciones || 'Sin observaciones'}
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
                    <p className="text-xs text-gray-500">
                      Creado: {new Date(presupuesto.created_at).toLocaleDateString('es-PY')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleClone(e, presupuesto.id)}
                    title="Clonar presupuesto"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Clonar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

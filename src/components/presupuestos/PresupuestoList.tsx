import { useState, useEffect } from 'react';
import { FileText, Plus, Search, RefreshCw, Download, Copy, RotateCw, Receipt, Eye, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Presupuesto } from '../../types/database.types';
import { PresupuestoService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CambiarEstadoModal } from './CambiarEstadoModal';
import { FacturacionModal } from './FacturacionModal';
import { generateHDMStandardPDF } from '../../services/pdfGeneratorHDMStandard';

interface PresupuestoListProps {
  onSelectPresupuesto: (id: string) => void;
  onCreateNew: () => void;
}

export function PresupuestoList({ onSelectPresupuesto, onCreateNew }: PresupuestoListProps) {
  const { user, isAdmin, isAdministrativo } = useAuth();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [showCambiarEstado, setShowCambiarEstado] = useState(false);
  const [selectedPresupuestoForEstado, setSelectedPresupuestoForEstado] = useState<Presupuesto | null>(null);
  const [showFacturacion, setShowFacturacion] = useState(false);
  const [selectedPresupuestoForFacturacion, setSelectedPresupuestoForFacturacion] = useState<Presupuesto | null>(null);

  useEffect(() => {
    loadPresupuestos();
  }, []);

  const loadPresupuestos = async () => {
    try {
      setLoading(true);
      const data = await PresupuestoService.getAll();

      // Admin y administrativo ven TODOS los presupuestos, vendedores solo los suyos
      const myPresupuestos = (isAdmin || isAdministrativo)
        ? data.filter(p => !p.deleted_at)
        : data.filter(p => p.vendedor_id === user?.id && !p.deleted_at);

      setPresupuestos(myPresupuestos || []);
    } catch (error) {
      console.error('Error loading presupuestos:', error);
      setPresupuestos([]);
    } finally {
      setLoading(false);
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
      loadPresupuestos();
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

  const filteredPresupuestos = presupuestos.filter((p) => {
    const matchesSearch =
      p.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente_documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre_fantasia?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.estado === statusFilter;

    let matchesFechaDesde = true;
    let matchesFechaHasta = true;

    if (fechaDesde) {
      const fechaDesdeDate = new Date(fechaDesde);
      fechaDesdeDate.setHours(0, 0, 0, 0);
      const presupuestoDate = new Date(p.created_at);
      presupuestoDate.setHours(0, 0, 0, 0);
      matchesFechaDesde = presupuestoDate >= fechaDesdeDate;
    }

    if (fechaHasta) {
      const fechaHastaDate = new Date(fechaHasta);
      fechaHastaDate.setHours(23, 59, 59, 999);
      const presupuestoDate = new Date(p.created_at);
      matchesFechaHasta = presupuestoDate <= fechaHastaDate;
    }

    return matchesSearch && matchesStatus && matchesFechaDesde && matchesFechaHasta;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-4">Cargando presupuestos...</p>
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

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 min-w-fit">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Filtrar por fechas:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 min-w-fit">Desde:</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 min-w-fit">Hasta:</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-auto"
                />
              </div>
              {(fechaDesde || fechaHasta) && (
                <button
                  onClick={() => {
                    setFechaDesde('');
                    setFechaHasta('');
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por código, cliente, nombre de fantasía, documento o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              icon={<Search className="w-4 h-4" />}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
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
            </select>
            <button
              onClick={loadPresupuestos}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
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
              <div style={{ height: '1px', width: '1400px' }}></div>
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
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPresupuestos.map((presupuesto) => (
                <tr
                  key={presupuesto.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onSelectPresupuesto(presupuesto.id)}
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
                    {formatCurrency(parseFloat(presupuesto.total_neto as any) + parseFloat(presupuesto.total_impuestos as any))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge color={getStatusColor(presupuesto.estado)}>
                      {getStatusLabel(presupuesto.estado)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center" style={{ minWidth: '240px' }}>
                    <div className="flex justify-center items-center gap-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPresupuesto(presupuesto.id);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                        style={{ display: 'inline-flex', padding: '8px', cursor: 'pointer' }}
                        title="Ver presupuesto"
                      >
                        <Eye className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPresupuesto(presupuesto);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                        style={{ display: 'inline-flex', padding: '8px', cursor: 'pointer' }}
                        title="Descargar PDF"
                      >
                        <Download className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClonePresupuesto(presupuesto);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200"
                        style={{ display: 'inline-flex', padding: '8px', cursor: 'pointer' }}
                        title="Clonar presupuesto"
                      >
                        <Copy className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPresupuestoForEstado(presupuesto);
                          setShowCambiarEstado(true);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200"
                        style={{ display: 'inline-flex', padding: '8px', cursor: 'pointer' }}
                        title="Cambiar estado"
                      >
                        <RotateCw className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPresupuestoForFacturacion(presupuesto);
                          setShowFacturacion(true);
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg border border-purple-200"
                        style={{ display: 'inline-flex', padding: '8px', cursor: 'pointer' }}
                        title="Datos de facturación"
                      >
                        <Receipt className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
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

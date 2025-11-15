import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Presupuesto, SolicitudDescuento, PresupuestoImagen } from '../types/database.types';
import { PresupuestoService, DiscountRequestService } from '../services/api';
import { DiscountRequestForm } from '../components/discount/DiscountRequestForm';
import { DiscountRequestList } from '../components/discount/DiscountRequestList';
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { PresupuestoStatusManager } from '../components/presupuestos/PresupuestoStatusManager';
import { SeguimientoManager } from '../components/seguimiento/SeguimientoManager';
import { PresupuestoEditor } from '../components/presupuestos/PresupuestoEditor';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BudgetCalculator } from '../services/budgetCalculator';
import { generateHDMStandardPDF } from '../services/pdfGeneratorHDMStandard';
import { supabase } from '../lib/supabase';
import {
  FileText,
  Download,
  Eye,
  Tag,
  Calendar,
  User,
  Clock,
  DollarSign,
  RefreshCw,
} from 'lucide-react';

interface PresupuestoDetailProps {
  presupuestoId: string;
}

export function PresupuestoDetail({ presupuestoId }: PresupuestoDetailProps) {
  console.log('🔄 PresupuestoDetail component mounted/updated, presupuestoId:', presupuestoId);

  const { user, isVendedor, isAdmin, isAdministrativo } = useAuth();
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [imagenes, setImagenes] = useState<PresupuestoImagen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalles' | 'solicitudes' | 'seguimiento' | 'historial'>(
    'detalles'
  );

  useEffect(() => {
    loadPresupuesto();
    loadImagenes();
  }, [presupuestoId]);

  const loadPresupuesto = async () => {
    setLoading(true);
    try {
      const data = await PresupuestoService.getById(presupuestoId);
      setPresupuesto(data);
    } catch (error) {
      console.error('Error loading presupuesto:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImagenes = async () => {
    try {
      const { data, error } = await supabase
        .from('presupuesto_imagenes')
        .select('*')
        .eq('presupuesto_id', presupuestoId)
        .order('orden', { ascending: true });

      if (error) throw error;
      setImagenes(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleCreateRequest = async (data: any) => {
    if (!user) return;
    await DiscountRequestService.create(data, user.id);
    await loadPresupuesto();
  };

  const handleCancelRequest = async (id: string) => {
    if (!user) return;
    if (
      confirm('¿Estás seguro de que deseas cancelar esta solicitud de descuento?')
    ) {
      await DiscountRequestService.cancel(id, user.id);
      await loadPresupuesto();
    }
  };

  const handleDownloadPDF = async () => {
    if (!presupuesto) return;
    try {
      const blob = await generateHDMStandardPDF(presupuesto);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Presupuesto_${presupuesto.codigo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handlePreviewPDF = async () => {
    if (!presupuesto) {
      console.error('No hay datos de presupuesto');
      return;
    }

    try {
      const blob = await generateHDMStandardPDF(presupuesto);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error generando vista previa:', error);
      alert('Error al generar la vista previa del PDF');
    }
  };

  const getStatusBadge = (estado: Presupuesto['estado']) => {
    const badges = {
      BORRADOR: <Badge variant="neutral">Borrador</Badge>,
      PRESENTADO: <Badge variant="info">Presentado</Badge>,
      ACEPTADO: <Badge variant="success">Aceptado</Badge>,
      FACTURADO: <Badge variant="success">Facturado</Badge>,
      ANULADO: <Badge variant="error">Anulado</Badge>,
    };
    return badges[estado];
  };

  const solicitudesAprobadas = presupuesto?.solicitudes_descuento?.filter(
    (s) => s.estado === 'APROBADO' || s.estado === 'APROBADO_MODIFICADO'
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-12 h-12 animate-spin mx-auto text-gray-400" />
        <p className="text-gray-600 mt-4">Cargando presupuesto...</p>
      </div>
    );
  }

  if (!presupuesto) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Presupuesto no encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {presupuesto.codigo}
              </h1>
              {getStatusBadge(presupuesto.estado)}
            </div>
            <p className="text-gray-600">{presupuesto.cliente_nombre}</p>
          </div>

          <div className="flex gap-2">
            {presupuesto.estado === 'BORRADOR' && (
              <Button
                size="sm"
                variant={editMode ? "outline" : "primary"}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? 'Ver Detalles' : 'Editar'}
              </Button>
            )}
            {!editMode && (
              <>
                <PresupuestoStatusManager
                  presupuesto={presupuesto}
                  onUpdate={loadPresupuesto}
                  isAdmin={isAdmin}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Vista Previa button clicked!');
                    handlePreviewPDF();
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                {(isVendedor || isAdministrativo) && presupuesto.estado !== 'ANULADO' && presupuesto.vendedor_id === user?.id && (
                  <Button onClick={() => setShowRequestForm(true)}>
                    <Tag className="w-4 h-4 mr-2" />
                    Solicitar Descuento
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4" />
              Fecha
            </div>
            <p className="font-medium">
              {new Date(presupuesto.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <User className="w-4 h-4" />
              Vendedor
            </div>
            <p className="font-medium">{presupuesto.vendedor?.full_name}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Tag className="w-4 h-4" />
              Estado
            </div>
            <Badge
              color={
                presupuesto.estado === 'ABIERTO' ? 'gray' :
                presupuesto.estado === 'PRESENTADO' ? 'blue' :
                presupuesto.estado === 'EN_EJECUCION' ? 'yellow' :
                presupuesto.estado === 'FACTURADO' ? 'green' :
                presupuesto.estado === 'RECHAZADO' ? 'red' :
                presupuesto.estado === 'CANCELADO' ? 'orange' :
                presupuesto.estado === 'ANULADO' ? 'red' : 'gray'
              }
            >
              {presupuesto.estado === 'EN_EJECUCION' ? 'En Ejecución' : presupuesto.estado}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <DollarSign className="w-4 h-4" />
              Moneda
            </div>
            <p className="font-medium">{presupuesto.moneda}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <FileText className="w-4 h-4" />
              Total
            </div>
            <p className="font-bold text-lg text-blue-600">
              {BudgetCalculator.formatCurrency(
                presupuesto.total_neto + presupuesto.total_impuestos,
                presupuesto.moneda
              )}
            </p>
          </div>
        </div>

        {solicitudesAprobadas && solicitudesAprobadas.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-2">
                  Descuentos Aplicados
                </h3>
                {solicitudesAprobadas.map((solicitud) => (
                  <div
                    key={solicitud.id}
                    className="text-sm text-green-800 flex items-center justify-between"
                  >
                    <span>
                      {solicitud.tipo === 'PORCENTAJE'
                        ? `${solicitud.valor_aprobado}%`
                        : BudgetCalculator.formatCurrency(
                            solicitud.valor_aprobado || 0,
                            presupuesto.moneda
                          )}{' '}
                      - {solicitud.aplica_a === 'GLOBAL' ? 'Global' : 'Por Ítem'}
                    </span>
                    <Badge
                      variant={
                        solicitud.estado === 'APROBADO_MODIFICADO'
                          ? 'info'
                          : 'success'
                      }
                      size="sm"
                    >
                      {solicitud.estado === 'APROBADO_MODIFICADO'
                        ? 'Modificado'
                        : 'Aprobado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('detalles')}
              className={`pb-2 border-b-2 font-medium transition-colors ${
                activeTab === 'detalles'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Detalles del Presupuesto
            </button>
            <button
              onClick={() => setActiveTab('solicitudes')}
              className={`pb-2 border-b-2 font-medium transition-colors ${
                activeTab === 'solicitudes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Solicitudes de Descuento
              {presupuesto.solicitudes_descuento &&
                presupuesto.solicitudes_descuento.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    {presupuesto.solicitudes_descuento.length}
                  </span>
                )}
            </button>
            <button
              onClick={() => setActiveTab('seguimiento')}
              className={`pb-2 border-b-2 font-medium transition-colors ${
                activeTab === 'seguimiento'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Gestión de Seguimiento
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('historial')}
                className={`pb-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'historial'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Historial de Auditoría
              </button>
            )}
          </div>

          <div className="mt-6">
            {activeTab === 'detalles' && (
              <div className="space-y-6">
                {editMode && presupuesto.estado === 'BORRADOR' ? (
                  <PresupuestoEditor
                    presupuesto={presupuesto}
                    onUpdate={() => {
                      loadPresupuesto();
                      setEditMode(false);
                    }}
                    onCancel={() => setEditMode(false)}
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Precio Unitario
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Subtotal
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Descuento
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {presupuesto.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.descripcion}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            {BudgetCalculator.formatCurrency(
                              item.precio_unitario,
                              presupuesto.moneda
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            {BudgetCalculator.formatCurrency(
                              item.subtotal,
                              presupuesto.moneda
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {item.descuento_aplicado > 0
                              ? `- ${BudgetCalculator.formatCurrency(
                                  item.descuento_aplicado,
                                  presupuesto.moneda
                                )}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {BudgetCalculator.formatCurrency(
                              item.subtotal - item.descuento_aplicado,
                              presupuesto.moneda
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-80 space-y-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Bruto:</span>
                      <span className="font-medium">
                        {BudgetCalculator.formatCurrency(
                          presupuesto.total_bruto,
                          presupuesto.moneda
                        )}
                      </span>
                    </div>
                    {presupuesto.total_descuento > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Descuento:</span>
                        <span className="font-medium text-red-600">
                          -{' '}
                          {BudgetCalculator.formatCurrency(
                            presupuesto.total_descuento,
                            presupuesto.moneda
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Neto:</span>
                      <span className="font-medium">
                        {BudgetCalculator.formatCurrency(
                          presupuesto.total_neto,
                          presupuesto.moneda
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Impuestos ({presupuesto.tasa_impuesto}%):
                      </span>
                      <span className="font-medium">
                        {BudgetCalculator.formatCurrency(
                          presupuesto.total_impuestos,
                          presupuesto.moneda
                        )}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 flex justify-between">
                      <span className="font-bold text-lg">TOTAL:</span>
                      <span className="font-bold text-lg text-blue-600">
                        {BudgetCalculator.formatCurrency(
                          presupuesto.total_neto + presupuesto.total_impuestos,
                          presupuesto.moneda
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'solicitudes' && (
              <DiscountRequestList
                requests={presupuesto.solicitudes_descuento || []}
                onCancel={(isVendedor || isAdministrativo) ? handleCancelRequest : undefined}
                onView={() => {}}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'seguimiento' && (
              <SeguimientoManager presupuestoId={presupuesto.id} />
            )}

            {activeTab === 'historial' && isAdmin && (
              <AuditTimeline
                entidad="presupuestos"
                entidadId={presupuesto.id}
              />
            )}
          </div>
        </div>
      </div>

      {showRequestForm && (
        <DiscountRequestForm
          isOpen={showRequestForm}
          onClose={() => setShowRequestForm(false)}
          onSubmit={handleCreateRequest}
          presupuestoId={presupuesto.id}
          items={presupuesto.items}
        />
      )}

    </div>
  );
}

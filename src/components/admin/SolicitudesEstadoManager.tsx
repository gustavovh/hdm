import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import {
  EstadoWorkflowService,
  type SolicitudCambioEstado,
} from '../../services/estadoWorkflowService';

export function SolicitudesEstadoManager() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCambioEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'>('PENDIENTE');
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudCambioEstado | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [comentarios, setComentarios] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    loadSolicitudes();
  }, [filtroEstado]);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      let data: SolicitudCambioEstado[];

      if (filtroEstado === 'PENDIENTE') {
        data = await EstadoWorkflowService.getSolicitudesPendientes();
      } else {
        data = await EstadoWorkflowService.getAllSolicitudes();
        if (filtroEstado !== 'TODAS') {
          data = data.filter((s) => s.estado_solicitud === filtroEstado);
        }
      }

      setSolicitudes(data);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      alert('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (solicitud: SolicitudCambioEstado) => {
    setSelectedSolicitud(solicitud);
    setComentarios('');
    setShowModal(true);
  };

  const handleProcesar = async (decision: 'APROBADA' | 'RECHAZADA') => {
    if (!selectedSolicitud) return;

    try {
      setProcesando(true);
      await EstadoWorkflowService.procesarSolicitud(
        selectedSolicitud.id,
        decision,
        comentarios || undefined
      );

      alert(
        `Solicitud ${decision === 'APROBADA' ? 'aprobada' : 'rechazada'} exitosamente`
      );
      setShowModal(false);
      setSelectedSolicitud(null);
      loadSolicitudes();
    } catch (error: any) {
      console.error('Error procesando solicitud:', error);
      alert('Error: ' + (error.message || 'Error desconocido'));
    } finally {
      setProcesando(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      APROBADA: 'bg-green-100 text-green-800',
      RECHAZADA: 'bg-red-100 text-red-800',
    };
    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Solicitudes de Cambio de Estado
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona las solicitudes de cambios excepcionales
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['TODAS', 'PENDIENTE', 'APROBADA', 'RECHAZADA'] as const).map((filtro) => (
          <button
            key={filtro}
            onClick={() => setFiltroEstado(filtro)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filtroEstado === filtro
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filtro === 'TODAS' ? 'Todas' : filtro.charAt(0) + filtro.slice(1).toLowerCase()}
            {filtro === 'PENDIENTE' && solicitudes.filter(s => s.estado_solicitud === 'PENDIENTE').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white text-blue-600 rounded-full text-xs font-semibold">
                {solicitudes.filter(s => s.estado_solicitud === 'PENDIENTE').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de solicitudes */}
      {solicitudes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No hay solicitudes {filtroEstado !== 'TODAS' && filtroEstado.toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {solicitudes.map((solicitud) => (
            <div
              key={solicitud.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {solicitud.presupuestos?.codigo || 'N/A'}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(
                        solicitud.estado_solicitud
                      )}`}
                    >
                      {solicitud.estado_solicitud}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Cliente: {solicitud.presupuestos?.nombre_cliente || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>
                    Solicitado por: {solicitud.users?.full_name || 'Desconocido'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(solicitud.created_at)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">De:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${EstadoWorkflowService.getEstadoColor(
                        solicitud.estado_origen
                      )}`}
                    >
                      {EstadoWorkflowService.getEstadoLabel(solicitud.estado_origen)}
                    </span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">A:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${EstadoWorkflowService.getEstadoColor(
                        solicitud.estado_destino
                      )}`}
                    >
                      {EstadoWorkflowService.getEstadoLabel(solicitud.estado_destino)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Justificación:
                  </p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {solicitud.justificacion}
                  </p>
                </div>
              </div>

              {solicitud.estado_solicitud === 'PENDIENTE' && (
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenModal(solicitud)}
                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => handleOpenModal(solicitud)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {showModal && selectedSolicitud && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Procesar Solicitud de Cambio"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Presupuesto: {selectedSolicitud.presupuestos?.codigo}
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span
                  className={`px-2 py-1 rounded text-xs ${EstadoWorkflowService.getEstadoColor(
                    selectedSolicitud.estado_origen
                  )}`}
                >
                  {EstadoWorkflowService.getEstadoLabel(selectedSolicitud.estado_origen)}
                </span>
                <span>→</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${EstadoWorkflowService.getEstadoColor(
                    selectedSolicitud.estado_destino
                  )}`}
                >
                  {EstadoWorkflowService.getEstadoLabel(selectedSolicitud.estado_destino)}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Justificación:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {selectedSolicitud.justificacion}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios (opcional)
              </label>
              <Textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Agrega comentarios sobre tu decisión..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => handleProcesar('RECHAZADA')}
                loading={procesando}
                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
              <Button
                onClick={() => handleProcesar('APROBADA')}
                loading={procesando}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprobar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

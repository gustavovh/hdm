import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Calendar,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import {
  EstadoWorkflowService,
  type SolicitudCambioEstado,
} from '../../services/estadoWorkflowService';

interface SolicitudCambioEstadoModalProps {
  solicitudId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessed: () => void;
}

export function SolicitudCambioEstadoModal({
  solicitudId,
  isOpen,
  onClose,
  onProcessed,
}: SolicitudCambioEstadoModalProps) {
  const [solicitud, setSolicitud] = useState<SolicitudCambioEstado | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [comentarios, setComentarios] = useState('');

  useEffect(() => {
    if (isOpen && solicitudId) {
      loadSolicitud();
    }
  }, [isOpen, solicitudId]);

  const loadSolicitud = async () => {
    try {
      setLoading(true);
      const solicitudes = await EstadoWorkflowService.getAllSolicitudes();
      const found = solicitudes.find((s) => s.id === solicitudId);
      if (found) {
        setSolicitud(found);
      } else {
        alert('Solicitud no encontrada');
        onClose();
      }
    } catch (error) {
      console.error('Error cargando solicitud:', error);
      alert('Error al cargar la solicitud');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleProcesar = async (decision: 'APROBADA' | 'RECHAZADA') => {
    if (!solicitud) return;

    if (solicitud.estado_solicitud !== 'PENDIENTE') {
      alert('Esta solicitud ya fue procesada anteriormente');
      return;
    }

    try {
      setProcesando(true);
      await EstadoWorkflowService.procesarSolicitud(
        solicitud.id,
        decision,
        comentarios || undefined
      );

      alert(
        `Solicitud ${decision === 'APROBADA' ? 'aprobada' : 'rechazada'} exitosamente`
      );
      onProcessed();
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
      PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APROBADA: 'bg-green-100 text-green-800 border-green-300',
      RECHAZADA: 'bg-red-100 text-red-800 border-red-300',
    };
    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Solicitud de Cambio de Estado">
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : solicitud ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-blue-900">
                    {solicitud.presupuestos?.codigo || 'N/A'}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoBadge(
                      solicitud.estado_solicitud
                    )}`}
                  >
                    {solicitud.estado_solicitud}
                  </span>
                </div>
                <p className="text-sm text-blue-800">
                  Cliente: {solicitud.presupuestos?.nombre_cliente || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>
                <span className="font-medium">Solicitante:</span>{' '}
                {solicitud.users?.full_name || 'Desconocido'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(solicitud.created_at)}</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">De:</span>
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${EstadoWorkflowService.getEstadoColor(
                    solicitud.estado_origen
                  )}`}
                >
                  {EstadoWorkflowService.getEstadoLabel(solicitud.estado_origen)}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">A:</span>
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${EstadoWorkflowService.getEstadoColor(
                    solicitud.estado_destino
                  )}`}
                >
                  {EstadoWorkflowService.getEstadoLabel(solicitud.estado_destino)}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-300">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Justificación:
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                {solicitud.justificacion}
              </p>
            </div>
          </div>

          {solicitud.estado_solicitud === 'PENDIENTE' ? (
            <>
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
                <Button variant="outline" onClick={onClose} disabled={procesando}>
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleProcesar('RECHAZADA')}
                  loading={procesando}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50"
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
            </>
          ) : (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Esta solicitud ya fue procesada
                  </p>
                  <p className="text-sm text-gray-600">
                    Estado: {solicitud.estado_solicitud}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={onClose}>Cerrar</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">Solicitud no encontrada</p>
          <Button onClick={onClose} className="mt-4">
            Cerrar
          </Button>
        </div>
      )}
    </Modal>
  );
}

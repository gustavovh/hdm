import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { RefreshCw, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { BudgetStatus } from '../../types/database.types';
import {
  EstadoWorkflowService,
  type ValidacionTransicion,
} from '../../services/estadoWorkflowService';

interface CambiarEstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  presupuestoId: string;
  presupuestoCodigo: string;
  estadoActual: BudgetStatus;
  onEstadoCambiado: () => void;
}

export function CambiarEstadoModal({
  isOpen,
  onClose,
  presupuestoId,
  presupuestoCodigo,
  estadoActual,
  onEstadoCambiado,
}: CambiarEstadoModalProps) {
  const [nuevoEstado, setNuevoEstado] = useState<BudgetStatus | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [validacion, setValidacion] = useState<ValidacionTransicion | null>(null);
  const [estadosDisponibles, setEstadosDisponibles] = useState<{
    normales: BudgetStatus[];
    excepcionales: BudgetStatus[];
  }>({ normales: [], excepcionales: [] });

  useEffect(() => {
    if (isOpen) {
      // Obtener estados disponibles
      const normales = EstadoWorkflowService.getEstadosSiguientes(estadoActual);
      const excepcionales = EstadoWorkflowService.getEstadosExcepcionales(estadoActual);
      setEstadosDisponibles({ normales, excepcionales });
      setNuevoEstado(null);
      setJustificacion('');
      setValidacion(null);
    }
  }, [isOpen, estadoActual]);

  useEffect(() => {
    const validarSeleccion = async () => {
      if (nuevoEstado) {
        try {
          const result = await EstadoWorkflowService.validarTransicion(
            estadoActual,
            nuevoEstado
          );
          setValidacion(result);
        } catch (error) {
          console.error('Error validando transición:', error);
        }
      } else {
        setValidacion(null);
      }
    };

    validarSeleccion();
  }, [nuevoEstado, estadoActual]);

  const handleSubmit = async () => {
    if (!nuevoEstado) {
      alert('Debes seleccionar un estado');
      return;
    }

    if (!validacion) {
      alert('Error validando la transición');
      return;
    }

    if (!validacion.permitido) {
      alert(validacion.mensaje);
      return;
    }

    if (validacion.requiere_aprobacion && !justificacion.trim()) {
      alert('Debes proporcionar una justificación para este cambio excepcional');
      return;
    }

    try {
      setLoading(true);

      if (validacion.requiere_aprobacion) {
        // Crear solicitud de cambio excepcional
        await EstadoWorkflowService.crearSolicitud(
          presupuestoId,
          nuevoEstado,
          justificacion
        );
        alert('SU SOLICITUD DE CAMBIO DE ESTADO FUE REMITIDA AL ADMINISTRADOR');
      } else {
        // Cambio directo (transición normal)
        await EstadoWorkflowService.cambiarEstadoDirecto(presupuestoId, nuevoEstado);
        alert('Estado actualizado exitosamente');
      }

      onEstadoCambiado();
      onClose();
    } catch (error: any) {
      console.error('Error procesando cambio de estado:', error);
      alert('Error: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Estado del Presupuesto">
      <div className="space-y-4">
        {/* Estado actual */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">
                Presupuesto: {presupuestoCodigo}
              </p>
              <p className="text-sm text-blue-800">
                Estado actual:{' '}
                <span className="font-semibold">
                  {EstadoWorkflowService.getEstadoLabel(estadoActual)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Transiciones normales */}
        {estadosDisponibles.normales.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <CheckCircle className="w-4 h-4 inline text-green-600 mr-1" />
              Cambios Permitidos (Transición Normal)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {estadosDisponibles.normales.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => setNuevoEstado(estado)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    estado === nuevoEstado
                      ? `${EstadoWorkflowService.getEstadoColor(estado)} ring-2 ring-green-500 shadow-md`
                      : `bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{EstadoWorkflowService.getEstadoLabel(estado)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transiciones excepcionales */}
        {estadosDisponibles.excepcionales.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <AlertTriangle className="w-4 h-4 inline text-orange-600 mr-1" />
              Cambios Excepcionales (Requieren Aprobación)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {estadosDisponibles.excepcionales.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => setNuevoEstado(estado)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 border-dashed ${
                    estado === nuevoEstado
                      ? `${EstadoWorkflowService.getEstadoColor(estado)} border-orange-500 ring-2 ring-orange-500 shadow-md`
                      : `bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-300`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{EstadoWorkflowService.getEstadoLabel(estado)}</span>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sin estados disponibles */}
        {estadosDisponibles.normales.length === 0 &&
          estadosDisponibles.excepcionales.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                No hay cambios de estado disponibles desde el estado actual.
              </p>
            </div>
          )}

        {/* Mensaje de validación */}
        {validacion && nuevoEstado && (
          <div
            className={`rounded-lg p-4 ${
              validacion.permitido
                ? validacion.requiere_aprobacion
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                validacion.permitido
                  ? validacion.requiere_aprobacion
                    ? 'text-orange-800'
                    : 'text-green-800'
                  : 'text-red-800'
              }`}
            >
              {validacion.mensaje}
            </p>
          </div>
        )}

        {/* Campo de justificación para cambios excepcionales */}
        {validacion?.requiere_aprobacion && nuevoEstado && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justificación del Cambio Excepcional *
            </label>
            <Textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Explica por qué es necesario este cambio excepcional..."
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta solicitud será revisada por un administrador antes de aplicarse.
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!nuevoEstado || !validacion?.permitido}
          >
            {validacion?.requiere_aprobacion ? 'SOLICITAR CAMBIO' : 'Cambiar Estado'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

import { useState, useEffect } from 'react';
import { Presupuesto, BudgetStatus } from '../../types/database.types';
import { PresupuestoService } from '../../services/api';
import { EstadoWorkflowService, type ValidacionTransicion } from '../../services/estadoWorkflowService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import {
  Send,
  CheckCircle,
  FileText,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface PresupuestoStatusManagerProps {
  presupuesto: Presupuesto;
  onUpdate: () => void;
  isAdmin: boolean;
}

interface InvoiceData {
  numero_factura: string;
  timbrado: string;
  fecha_factura: string;
  monto_factura: number;
  condicion_pago: string;
  medio_pago: string;
  enlace_comprobante?: string;
}

export function PresupuestoStatusManager({
  presupuesto,
  onUpdate,
  isAdmin,
}: PresupuestoStatusManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [validacion, setValidacion] = useState<ValidacionTransicion | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    numero_factura: '',
    timbrado: '',
    fecha_factura: new Date().toISOString().split('T')[0],
    monto_factura: presupuesto.total_neto + presupuesto.total_impuestos,
    condicion_pago: 'Contado',
    medio_pago: 'Transferencia',
    enlace_comprobante: '',
  });
  const [observaciones, setObservaciones] = useState('');

  const getAvailableStates = (): BudgetStatus[] => {
    const allStates: BudgetStatus[] = [
      'CLONADO',
      'ABIERTO',
      'PRESENTADO',
      'ACEPTADO',
      'EN_EJECUCION',
      'FACTURADO',
      'RECHAZADO',
      'CANCELADO'
    ];

    // Vendedores no pueden anular
    if (!isAdmin) {
      return allStates.filter(s => s !== presupuesto.estado);
    }

    // Admins pueden cambiar a cualquier estado incluyendo ANULADO
    return [...allStates, 'ANULADO'].filter(s => s !== presupuesto.estado);
  };

  const getStatusLabel = (status: BudgetStatus): string => {
    const labels: Record<BudgetStatus, string> = {
      CLONADO: 'Clonado',
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

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleStatusChange = (status: BudgetStatus) => {
    setTargetStatus(status);
  };

  useEffect(() => {
    const validarSeleccion = async () => {
      if (targetStatus && presupuesto.estado) {
        try {
          const result = await EstadoWorkflowService.validarTransicion(
            presupuesto.estado,
            targetStatus
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
  }, [targetStatus, presupuesto.estado]);

  const handleConfirm = async () => {
    if (!targetStatus || !validacion) return;

    // Si no está permitido en absoluto, mostrar error
    if (!validacion.permitido) {
      alert(validacion.mensaje);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Si requiere aprobación, crear solicitud
      if (validacion.requiere_aprobacion) {
        const justificacion = observaciones.trim();

        if (!justificacion) {
          alert('Debes proporcionar una justificación en el campo "Observaciones" para este cambio excepcional.');
          setLoading(false);
          return;
        }

        await EstadoWorkflowService.crearSolicitud(
          presupuesto.id,
          targetStatus,
          justificacion
        );

        alert('✅ SU SOLICITUD DE CAMBIO DE ESTADO FUE REMITIDA AL ADMINISTRADOR.\n\nEl presupuesto permanecerá en su estado actual hasta que un administrador apruebe el cambio.');
        setShowModal(false);
        setTargetStatus(null);
        setObservaciones('');
        onUpdate();
        setLoading(false);
        return;
      }

      // Cambio directo permitido
      const updates: any = {
        estado: targetStatus,
        observaciones: observaciones || presupuesto.observaciones,
      };

      if (targetStatus === 'PRESENTADO') {
        updates.fecha_presentacion = new Date().toISOString().split('T')[0];
      }

      if (targetStatus === 'ACEPTADO') {
        updates.fecha_aceptacion = new Date().toISOString().split('T')[0];
      }

      if (targetStatus === 'FACTURADO') {
        updates.fecha_facturacion = invoiceData.fecha_factura;
        updates.numero_factura = invoiceData.numero_factura;
        updates.factura_timbrado = invoiceData.timbrado || null;
        updates.monto_factura = invoiceData.monto_factura;
        updates.condicion_pago = invoiceData.condicion_pago;
        updates.medio_pago = invoiceData.medio_pago;
        updates.enlace_comprobante = invoiceData.enlace_comprobante;
      }

      await EstadoWorkflowService.cambiarEstadoDirecto(presupuesto.id, targetStatus);
      alert('Estado actualizado exitosamente');
      setShowModal(false);
      setTargetStatus(null);
      setObservaciones('');
      onUpdate();
    } catch (error: any) {
      console.error('Error changing status:', error);
      alert('Error: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const availableStates = getAvailableStates();

  if (presupuesto.estado === 'FACTURADO' || presupuesto.estado === 'ANULADO') {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleOpenModal}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Cambiar Estado
      </Button>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setTargetStatus(null);
        }}
        title="Cambiar Estado del Presupuesto"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">
                Estado actual: {getStatusLabel(presupuesto.estado)}
              </p>
              <p className="mt-1 text-blue-700">
                Selecciona el nuevo estado para este presupuesto. Esta acción quedará registrada en el historial.
              </p>
            </div>
          </div>

          <Select
            label="Nuevo Estado"
            value={targetStatus || ''}
            onChange={(e) => handleStatusChange(e.target.value as BudgetStatus)}
            required
          >
            <option value="">Seleccionar estado...</option>
            {availableStates.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </Select>

          {validacion && targetStatus && (
            <div
              className={`rounded-lg p-4 ${
                validacion.permitido
                  ? validacion.requiere_aprobacion
                    ? 'bg-orange-50 border-2 border-orange-400'
                    : 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  validacion.permitido
                    ? validacion.requiere_aprobacion
                      ? 'text-orange-900'
                      : 'text-green-800'
                    : 'text-red-800'
                }`}
              >
                {validacion.mensaje}
              </p>
              {validacion.requiere_aprobacion && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-orange-800 font-semibold">
                    ⚠️ Cambio Excepcional - Requiere Aprobación Administrativa
                  </p>
                  <p className="text-xs text-orange-700">
                    • El presupuesto PERMANECERÁ EN SU ESTADO ACTUAL<br/>
                    • Su solicitud será enviada al administrador<br/>
                    • Recibirá una notificación con la decisión<br/>
                    • DEBE proporcionar una justificación en el campo "Observaciones"
                  </p>
                </div>
              )}
            </div>
          )}

          {targetStatus === 'FACTURADO' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-gray-900">Datos de Facturación</h4>

              <Input
                label="Número de Factura *"
                value={invoiceData.numero_factura}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, numero_factura: e.target.value })
                }
                required
                placeholder="001-001-0000123"
              />

              <Input
                label="Timbrado"
                value={invoiceData.timbrado}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, timbrado: e.target.value })
                }
                placeholder="12345678"
                maxLength={8}
              />

              <Input
                label="Fecha de Factura *"
                type="date"
                value={invoiceData.fecha_factura}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, fecha_factura: e.target.value })
                }
                required
              />

              <Input
                label="Monto Facturado"
                type="number"
                step="0.01"
                value={invoiceData.monto_factura}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    monto_factura: parseFloat(e.target.value),
                  })
                }
                required
              />

              <Input
                label="Condición de Pago"
                value={invoiceData.condicion_pago}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, condicion_pago: e.target.value })
                }
                required
                placeholder="Ej: Contado, 30 días, etc."
              />

              <Input
                label="Medio de Pago"
                value={invoiceData.medio_pago}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, medio_pago: e.target.value })
                }
                required
                placeholder="Ej: Transferencia, Efectivo, etc."
              />

              <Input
                label="Enlace al Comprobante (opcional)"
                type="url"
                value={invoiceData.enlace_comprobante}
                onChange={(e) =>
                  setInvoiceData({
                    ...invoiceData,
                    enlace_comprobante: e.target.value,
                  })
                }
                placeholder="https://..."
              />
            </div>
          )}

          <Textarea
            label={
              validacion?.requiere_aprobacion
                ? 'Justificación del Cambio Excepcional *'
                : 'Observaciones (opcional)'
            }
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={validacion?.requiere_aprobacion ? 4 : 3}
            placeholder={
              validacion?.requiere_aprobacion
                ? 'REQUERIDO: Explica detalladamente por qué es necesario este cambio excepcional...'
                : 'Agrega cualquier comentario sobre este cambio de estado...'
            }
            required={validacion?.requiere_aprobacion}
            className={
              validacion?.requiere_aprobacion
                ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500'
                : ''
            }
          />

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                setTargetStatus(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              loading={loading}
              disabled={!targetStatus || !validacion}
            >
              {validacion && (!validacion.permitido || validacion.requiere_aprobacion)
                ? 'SOLICITAR CAMBIO'
                : 'Confirmar Cambio'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

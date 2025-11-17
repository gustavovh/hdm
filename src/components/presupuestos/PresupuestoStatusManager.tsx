import { useState } from 'react';
import { Presupuesto, BudgetStatus } from '../../types/database.types';
import { PresupuestoService } from '../../services/api';
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
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    numero_factura: '',
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

  const handleConfirm = async () => {
    if (!targetStatus) return;

    setLoading(true);
    try {
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
        updates.monto_factura = invoiceData.monto_factura;
        updates.condicion_pago = invoiceData.condicion_pago;
        updates.medio_pago = invoiceData.medio_pago;
        updates.enlace_comprobante = invoiceData.enlace_comprobante;
      }

      await PresupuestoService.update(presupuesto.id, updates);
      setShowModal(false);
      setTargetStatus(null);
      setObservaciones('');
      onUpdate();
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Error al cambiar el estado del presupuesto');
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

          {targetStatus === 'FACTURADO' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-gray-900">Datos de Facturación</h4>

              <Input
                label="Número de Factura"
                value={invoiceData.numero_factura}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, numero_factura: e.target.value })
                }
                required
                placeholder="001-001-0000123"
              />

              <Input
                label="Fecha de Factura"
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
            label="Observaciones (opcional)"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Agrega cualquier comentario sobre este cambio de estado..."
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
              disabled={!targetStatus}
            >
              Confirmar Cambio
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

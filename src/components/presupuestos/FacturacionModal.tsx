import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Presupuesto } from '../../types/database.types';
import { supabase } from '../../lib/supabase';
import { FileText, DollarSign, Calendar, CreditCard } from 'lucide-react';

interface FacturacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  presupuesto: Presupuesto;
  onSuccess: () => void;
}

interface InvoiceData {
  numero_factura: string;
  fecha_facturacion: string;
  monto_factura: number;
  condicion_pago: string;
  medio_pago: string;
  enlace_comprobante: string;
}

export function FacturacionModal({
  isOpen,
  onClose,
  presupuesto,
  onSuccess,
}: FacturacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    numero_factura: presupuesto.numero_factura || '',
    fecha_facturacion: presupuesto.fecha_facturacion || new Date().toISOString().split('T')[0],
    monto_factura: presupuesto.monto_factura || (presupuesto.total_neto + presupuesto.total_impuestos),
    condicion_pago: presupuesto.condicion_pago || 'Contado',
    medio_pago: presupuesto.medio_pago || 'Transferencia',
    enlace_comprobante: presupuesto.enlace_comprobante || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('presupuestos')
        .update({
          numero_factura: invoiceData.numero_factura,
          fecha_facturacion: invoiceData.fecha_facturacion,
          monto_factura: invoiceData.monto_factura,
          condicion_pago: invoiceData.condicion_pago,
          medio_pago: invoiceData.medio_pago,
          enlace_comprobante: invoiceData.enlace_comprobante || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', presupuesto.id);

      if (error) throw error;

      alert('Datos de facturación guardados correctamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating invoice data:', error);
      alert(error.message || 'Error al guardar los datos de facturación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Datos de Facturación - ${presupuesto.codigo}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Información del Presupuesto</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Cliente:</span>
              <p className="font-medium text-gray-900">{presupuesto.cliente_nombre}</p>
            </div>
            <div>
              <span className="text-gray-600">Monto Total:</span>
              <p className="font-medium text-gray-900">
                {presupuesto.moneda} {(presupuesto.total_neto + presupuesto.total_impuestos).toLocaleString('es-PY')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Número de Factura *
              </label>
              <Input
                value={invoiceData.numero_factura}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, numero_factura: e.target.value })
                }
                required
                placeholder="001-001-0000123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha de Facturación *
              </label>
              <Input
                type="date"
                value={invoiceData.fecha_facturacion}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, fecha_facturacion: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Monto Facturado *
            </label>
            <Input
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Condición de Pago *
              </label>
              <Select
                value={invoiceData.condicion_pago}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, condicion_pago: e.target.value })
                }
                required
              >
                <option value="Contado">Contado</option>
                <option value="30 días">30 días</option>
                <option value="60 días">60 días</option>
                <option value="90 días">90 días</option>
                <option value="Otro">Otro</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Medio de Pago *
              </label>
              <Select
                value={invoiceData.medio_pago}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, medio_pago: e.target.value })
                }
                required
              >
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Otro">Otro</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enlace al Comprobante
            </label>
            <Input
              type="url"
              value={invoiceData.enlace_comprobante}
              onChange={(e) =>
                setInvoiceData({ ...invoiceData, enlace_comprobante: e.target.value })
              }
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500 mt-1">
              URL del comprobante o factura electrónica
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            Guardar Datos
          </Button>
        </div>
      </form>
    </Modal>
  );
}

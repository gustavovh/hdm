import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Presupuesto } from '../../types/database.types';
import { supabase } from '../../lib/supabase';
import { FileText, DollarSign, Calendar, CreditCard, Upload, ExternalLink, X } from 'lucide-react';

interface FacturacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  presupuesto: Presupuesto;
  onSuccess: () => void;
}

interface InvoiceData {
  numero_factura: string;
  timbrado: string;
  fecha_facturacion: string;
  monto_factura: number;
  condicion_pago: string;
  medio_pago: string;
  factura_pdf_url: string;
}

export function FacturacionModal({
  isOpen,
  onClose,
  presupuesto,
  onSuccess,
}: FacturacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    numero_factura: presupuesto.numero_factura || '',
    timbrado: presupuesto.factura_timbrado || '',
    fecha_facturacion: presupuesto.fecha_facturacion || new Date().toISOString().split('T')[0],
    monto_factura: presupuesto.monto_factura || (presupuesto.total_neto + presupuesto.total_impuestos),
    condicion_pago: presupuesto.condicion_pago || 'Contado',
    medio_pago: presupuesto.medio_pago || 'Transferencia',
    factura_pdf_url: presupuesto.factura_pdf_url || '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo debe ser menor a 10MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `factura_${presupuesto.codigo}_${Date.now()}.pdf`;
      const filePath = `facturas/${presupuesto.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('presupuesto-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('presupuesto-images')
        .getPublicUrl(filePath);

      setInvoiceData({ ...invoiceData, factura_pdf_url: urlData.publicUrl });
      alert('PDF cargado exitosamente');
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      alert(error.message || 'Error al cargar el PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePDF = async () => {
    if (!confirm('¿Estás seguro de eliminar el PDF de factura?')) return;

    try {
      if (invoiceData.factura_pdf_url) {
        const filePath = invoiceData.factura_pdf_url.split('/').slice(-3).join('/');
        await supabase.storage.from('presupuesto-images').remove([filePath]);
      }

      setInvoiceData({ ...invoiceData, factura_pdf_url: '' });
      alert('PDF eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting PDF:', error);
      alert('Error al eliminar el PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('presupuestos')
        .update({
          numero_factura: invoiceData.numero_factura,
          factura_timbrado: invoiceData.timbrado || null,
          fecha_facturacion: invoiceData.fecha_facturacion,
          monto_factura: invoiceData.monto_factura,
          condicion_pago: invoiceData.condicion_pago,
          medio_pago: invoiceData.medio_pago,
          factura_pdf_url: invoiceData.factura_pdf_url || null,
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
                <FileText className="w-4 h-4 inline mr-1" />
                Timbrado
              </label>
              <Input
                value={invoiceData.timbrado}
                onChange={(e) =>
                  setInvoiceData({ ...invoiceData, timbrado: e.target.value })
                }
                placeholder="12345678"
                maxLength={8}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              PDF de Factura
            </label>

            {invoiceData.factura_pdf_url ? (
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Factura cargada</p>
                      <p className="text-xs text-gray-500">PDF disponible</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={invoiceData.factura_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Ver PDF"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleDeletePDF}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar PDF"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Haz clic para subir el PDF de factura
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Solo archivos PDF, máximo 10MB
                </p>
                {uploading && (
                  <p className="text-sm text-blue-600 mt-2">Subiendo PDF...</p>
                )}
              </div>
            )}
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

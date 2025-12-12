import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { DiscountType, DiscountScope, PresupuestoItem, SolicitudDescuento } from '../../types/database.types';
import { CreateDiscountRequestDTO } from '../../types/api.types';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DiscountRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDiscountRequestDTO) => Promise<void>;
  presupuestoId: string;
  items?: PresupuestoItem[];
}

export function DiscountRequestForm({
  isOpen,
  onClose,
  onSubmit,
  presupuestoId,
  items = [],
}: DiscountRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [descuentosPrevios, setDescuentosPrevios] = useState<SolicitudDescuento[]>([]);
  const [formData, setFormData] = useState({
    tipo: 'PORCENTAJE' as DiscountType,
    valor_propuesto: '',
    motivo: '',
    aplica_a: 'GLOBAL' as DiscountScope,
    item_id: '',
  });

  useEffect(() => {
    if (isOpen && presupuestoId) {
      loadDescuentosPrevios();
    }
  }, [isOpen, presupuestoId]);

  const loadDescuentosPrevios = async () => {
    setLoadingHistorial(true);
    try {
      const { data, error } = await supabase
        .from('solicitudes_descuento')
        .select('*')
        .eq('presupuesto_id', presupuestoId)
        .is('deleted_at', null)
        .order('numero_descuento', { ascending: true });

      if (error) throw error;
      setDescuentosPrevios(data || []);
    } catch (error) {
      console.error('Error cargando historial de descuentos:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const getEstadoBadge = (estado: SolicitudDescuento['estado']) => {
    switch (estado) {
      case 'APROBADO':
        return <Badge color="green"><CheckCircle className="w-3 h-3 mr-1 inline" />Aprobado</Badge>;
      case 'APROBADO_MODIFICADO':
        return <Badge color="blue"><CheckCircle className="w-3 h-3 mr-1 inline" />Aprobado Modificado</Badge>;
      case 'RECHAZADO':
        return <Badge color="red"><XCircle className="w-3 h-3 mr-1 inline" />Rechazado</Badge>;
      case 'PENDIENTE':
        return <Badge color="yellow"><Clock className="w-3 h-3 mr-1 inline" />Pendiente</Badge>;
      default:
        return <Badge color="gray">{estado}</Badge>;
    }
  };

  const formatDescuento = (solicitud: SolicitudDescuento) => {
    const valor = solicitud.estado === 'APROBADO' || solicitud.estado === 'APROBADO_MODIFICADO'
      ? solicitud.valor_aprobado
      : solicitud.valor_propuesto;

    if (solicitud.tipo === 'PORCENTAJE') {
      return `${valor}%`;
    }
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(valor || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!formData.valor_propuesto || parseFloat(formData.valor_propuesto) <= 0) {
      newErrors.valor_propuesto = 'El valor debe ser mayor a 0';
    }

    if (formData.tipo === 'PORCENTAJE' && parseFloat(formData.valor_propuesto) > 100) {
      newErrors.valor_propuesto = 'El porcentaje no puede exceder 100%';
    }

    if (!formData.motivo.trim()) {
      newErrors.motivo = 'Debes indicar el motivo de la solicitud';
    }

    if (formData.aplica_a === 'ITEM' && !formData.item_id) {
      newErrors.item_id = 'Debes seleccionar un ítem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        presupuesto_id: presupuestoId,
        tipo: formData.tipo,
        valor_propuesto: parseFloat(formData.valor_propuesto),
        motivo: formData.motivo,
        aplica_a: formData.aplica_a,
        item_id: formData.aplica_a === 'ITEM' ? formData.item_id : undefined,
      });

      setFormData({
        tipo: 'PORCENTAJE',
        valor_propuesto: '',
        motivo: '',
        aplica_a: 'GLOBAL',
        item_id: '',
      });
      onClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Error al crear la solicitud',
      });
    } finally {
      setLoading(false);
    }
  };

  const numeroDescuentoActual = descuentosPrevios.length + 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Solicitar Descuento${numeroDescuentoActual > 1 ? ` #${numeroDescuentoActual}` : ''}`} size="lg">
      {descuentosPrevios.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">
              Historial de Descuentos en este Presupuesto
            </h3>
          </div>
          {loadingHistorial ? (
            <p className="text-sm text-blue-700">Cargando historial...</p>
          ) : (
            <div className="space-y-2">
              {descuentosPrevios.map((descuento) => (
                <div
                  key={descuento.id}
                  className="flex items-center justify-between p-3 bg-white rounded border border-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      #{descuento.numero_descuento}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {descuento.tipo === 'PORCENTAJE' ? 'Porcentaje' : 'Monto'}: {formatDescuento(descuento)}
                      </p>
                      <p className="text-xs text-gray-600">{descuento.motivo}</p>
                    </div>
                  </div>
                  {getEstadoBadge(descuento.estado)}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-blue-700 mt-3">
            Estás solicitando el descuento #{numeroDescuentoActual} para este presupuesto
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo de Descuento"
            value={formData.tipo}
            onChange={(e) =>
              setFormData({ ...formData, tipo: e.target.value as DiscountType })
            }
            options={[
              { value: 'PORCENTAJE', label: 'Porcentaje (%)' },
              { value: 'MONTO', label: 'Monto Fijo' },
            ]}
            required
          />

          <Input
            label={`Valor ${formData.tipo === 'PORCENTAJE' ? '(%)' : '(Monto)'}`}
            type="number"
            step={formData.tipo === 'PORCENTAJE' ? '0.01' : '1'}
            min="0"
            max={formData.tipo === 'PORCENTAJE' ? '100' : undefined}
            value={formData.valor_propuesto}
            onChange={(e) =>
              setFormData({ ...formData, valor_propuesto: e.target.value })
            }
            error={errors.valor_propuesto}
            required
          />
        </div>

        <Select
          label="Alcance"
          value={formData.aplica_a}
          onChange={(e) =>
            setFormData({
              ...formData,
              aplica_a: e.target.value as DiscountScope,
              item_id: '',
            })
          }
          options={[
            { value: 'GLOBAL', label: 'Descuento Global (Todo el presupuesto)' },
            { value: 'ITEM', label: 'Descuento por Ítem' },
          ]}
          required
        />

        {formData.aplica_a === 'ITEM' && items.length > 0 && (
          <Select
            label="Seleccionar Ítem"
            value={formData.item_id}
            onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
            options={[
              { value: '', label: 'Selecciona un ítem...' },
              ...items.map((item) => ({
                value: item.id,
                label: `${item.descripcion} - ${item.cantidad} x ${item.precio_unitario}`,
              })),
            ]}
            error={errors.item_id}
            required
          />
        )}

        <Textarea
          label="Motivo de la Solicitud"
          value={formData.motivo}
          onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
          rows={4}
          error={errors.motivo}
          helperText="Explica por qué solicitas este descuento"
          required
        />

        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Solicitar Descuento
          </Button>
        </div>
      </form>
    </Modal>
  );
}

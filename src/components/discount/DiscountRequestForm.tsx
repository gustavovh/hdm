import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { DiscountType, DiscountScope, PresupuestoItem } from '../../types/database.types';
import { CreateDiscountRequestDTO } from '../../types/api.types';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    tipo: 'PORCENTAJE' as DiscountType,
    valor_propuesto: '',
    motivo: '',
    aplica_a: 'GLOBAL' as DiscountScope,
    item_id: '',
  });

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Descuento" size="lg">
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

import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { Presupuesto } from '../../types/database.types';

interface ComisionModalProps {
  presupuesto: Presupuesto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ComisionModal({ presupuesto, isOpen, onClose, onSuccess }: ComisionModalProps) {
  const [tasaComision, setTasaComision] = useState<string>(presupuesto.tasa_comision?.toString() || '0');
  const [loading, setLoading] = useState(false);

  const montoBase = parseFloat(presupuesto.total_neto as any) + parseFloat(presupuesto.total_impuestos as any);
  const montoComisionCalculado = (montoBase * parseFloat(tasaComision || '0')) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tasa = parseFloat(tasaComision);

      if (isNaN(tasa) || tasa < 0 || tasa > 100) {
        alert('Por favor ingresa una tasa de comisión válida (0-100)');
        return;
      }

      const montoComision = (montoBase * tasa) / 100;

      const { error } = await supabase
        .from('presupuestos')
        .update({
          tasa_comision: tasa,
          total_comisiones: montoComision,
          updated_at: new Date().toISOString(),
        })
        .eq('id', presupuesto.id);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('presupuesto_actividad').insert({
          presupuesto_id: presupuesto.id,
          usuario_id: user.id,
          tipo_evento: 'nota',
          detalle: `Comisión asignada: ${tasa}% (${formatCurrency(montoComision)})`,
          metadatos: {
            tasa_comision_anterior: presupuesto.tasa_comision,
            tasa_comision_nueva: tasa,
            monto_comision: montoComision,
          },
        });
      }

      alert('Comisión asignada exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error asignando comisión:', error);
      alert('Error al asignar la comisión');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: presupuesto.moneda === 'USD' ? 'USD' : 'PYG',
      minimumFractionDigits: presupuesto.moneda === 'USD' ? 2 : 0,
    }).format(amount);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar Comisión">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Información del Presupuesto</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Código:</span>
                  <span className="font-semibold text-blue-900">{presupuesto.codigo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Cliente:</span>
                  <span className="font-semibold text-blue-900">{presupuesto.cliente_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Monto Total:</span>
                  <span className="font-semibold text-blue-900">{formatCurrency(montoBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Estado:</span>
                  <span className="font-semibold text-blue-900">{presupuesto.estado}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tasa de Comisión (%)
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={tasaComision}
            onChange={(e) => setTasaComision(e.target.value)}
            placeholder="Ej: 3.5"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Ingresa el porcentaje de comisión para este presupuesto (0-100)
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium mb-1">Monto de Comisión Calculado</p>
              <p className="text-xs text-green-600">
                {tasaComision}% de {formatCurrency(montoBase)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(montoComisionCalculado)}
              </p>
            </div>
          </div>
        </div>

        {presupuesto.tasa_comision && presupuesto.tasa_comision > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Este presupuesto ya tiene una comisión asignada de {presupuesto.tasa_comision}%
              ({formatCurrency(parseFloat(presupuesto.total_comisiones as any) || 0)}).
              Al guardar, se reemplazará con el nuevo valor.
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Asignar Comisión'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

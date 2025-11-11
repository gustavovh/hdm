import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { RefreshCw } from 'lucide-react';
import { BudgetStatus } from '../../types/database.types';

interface CambiarEstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  presupuestoId: string;
  presupuestoCodigo: string;
  estadoActual: BudgetStatus;
  onEstadoCambiado: () => void;
}

const ESTADOS: { value: BudgetStatus; label: string; color: string }[] = [
  { value: 'ABIERTO', label: 'Abierto', color: 'bg-gray-100 text-gray-800' },
  { value: 'PRESENTADO', label: 'Presentado', color: 'bg-blue-100 text-blue-800' },
  { value: 'EN_EJECUCION', label: 'En Ejecución', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FACTURADO', label: 'Facturado', color: 'bg-green-100 text-green-800' },
  { value: 'RECHAZADO', label: 'Rechazado', color: 'bg-red-100 text-red-800' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-orange-100 text-orange-800' },
  { value: 'ANULADO', label: 'Anulado', color: 'bg-red-100 text-red-800' },
];

export function CambiarEstadoModal({
  isOpen,
  onClose,
  presupuestoId,
  presupuestoCodigo,
  estadoActual,
  onEstadoCambiado,
}: CambiarEstadoModalProps) {
  const [nuevoEstado, setNuevoEstado] = useState<BudgetStatus>(estadoActual);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (nuevoEstado === estadoActual) {
      alert('Debes seleccionar un estado diferente');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('presupuestos')
        .update({
          estado: nuevoEstado,
          ultima_actualizacion_estado: new Date().toISOString(),
        })
        .eq('id', presupuestoId);

      if (error) throw error;

      alert('Estado actualizado exitosamente');
      onEstadoCambiado();
      onClose();
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambiar Estado del Presupuesto">
      <div className="space-y-4">
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
                  {ESTADOS.find((e) => e.value === estadoActual)?.label || estadoActual}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Nuevo Estado *
          </label>
          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value as BudgetStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ESTADOS.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ESTADOS.map((estado) => (
            <button
              key={estado.value}
              type="button"
              onClick={() => setNuevoEstado(estado.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                estado.value === nuevoEstado
                  ? `${estado.color} ring-2 ring-blue-500`
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {estado.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Cambiar Estado
          </Button>
        </div>
      </div>
    </Modal>
  );
}

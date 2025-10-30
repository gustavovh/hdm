import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { SolicitudDescuento } from '../../types/database.types';
import { Badge } from '../ui/Badge';
import { BudgetCalculator } from '../../services/budgetCalculator';
import { Check, Edit, X } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: SolicitudDescuento | null;
  onApprove: (id: string, comentario?: string) => Promise<void>;
  onApproveWithModification: (
    id: string,
    valorAprobado: number,
    comentario?: string
  ) => Promise<void>;
  onReject: (id: string, comentario: string) => Promise<void>;
}

export function ApprovalModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onApproveWithModification,
  onReject,
}: ApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'modify' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);
  const [valorAprobado, setValorAprobado] = useState('');
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');

  if (!request) return null;

  const handleAction = async () => {
    setError('');

    if (action === 'reject' && !comentario.trim()) {
      setError('Debes proporcionar un motivo para rechazar la solicitud');
      return;
    }

    if (action === 'modify') {
      if (!valorAprobado || parseFloat(valorAprobado) <= 0) {
        setError('Debes especificar un valor válido');
        return;
      }

      if (request.tipo === 'PORCENTAJE' && parseFloat(valorAprobado) > 100) {
        setError('El porcentaje no puede exceder 100%');
        return;
      }
    }

    setLoading(true);

    try {
      switch (action) {
        case 'approve':
          await onApprove(request.id, comentario || undefined);
          break;
        case 'modify':
          await onApproveWithModification(
            request.id,
            parseFloat(valorAprobado),
            comentario || undefined
          );
          break;
        case 'reject':
          await onReject(request.id, comentario);
          break;
      }

      setAction(null);
      setValorAprobado('');
      setComentario('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number) => {
    if (request.tipo === 'PORCENTAJE') {
      return `${value}%`;
    }
    return BudgetCalculator.formatCurrency(
      value,
      request.presupuesto?.moneda || 'PYG'
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setAction(null);
        setValorAprobado('');
        setComentario('');
        setError('');
        onClose();
      }}
      title="Aprobar Solicitud de Descuento"
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Detalles de la Solicitud</h4>
            <Badge variant="warning">Pendiente</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Presupuesto</p>
              <p className="font-medium">{request.presupuesto?.codigo}</p>
            </div>
            <div>
              <p className="text-gray-600">Vendedor</p>
              <p className="font-medium">{request.vendedor?.full_name}</p>
            </div>
            <div>
              <p className="text-gray-600">Tipo</p>
              <p className="font-medium">{request.tipo}</p>
            </div>
            <div>
              <p className="text-gray-600">Valor Propuesto</p>
              <p className="font-semibold text-blue-600">
                {formatValue(request.valor_propuesto)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600 mb-1">Motivo</p>
              <p className="text-gray-900">{request.motivo}</p>
            </div>
          </div>
        </div>

        {!action && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Selecciona una acción:</p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="success"
                fullWidth
                onClick={() => setAction('approve')}
              >
                <Check className="w-4 h-4 mr-2" />
                Aprobar
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setAction('modify');
                  setValorAprobado(request.valor_propuesto.toString());
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Modificar
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => setAction('reject')}
              >
                <X className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </div>
          </div>
        )}

        {action && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">
                {action === 'approve' && 'Aprobar Solicitud'}
                {action === 'modify' && 'Aprobar con Modificación'}
                {action === 'reject' && 'Rechazar Solicitud'}
              </h5>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAction(null);
                  setValorAprobado('');
                  setComentario('');
                  setError('');
                }}
              >
                Cambiar
              </Button>
            </div>

            {action === 'modify' && (
              <Input
                label={`Valor Aprobado ${
                  request.tipo === 'PORCENTAJE' ? '(%)' : '(Monto)'
                }`}
                type="number"
                step={request.tipo === 'PORCENTAJE' ? '0.01' : '1'}
                min="0"
                max={request.tipo === 'PORCENTAJE' ? '100' : undefined}
                value={valorAprobado}
                onChange={(e) => setValorAprobado(e.target.value)}
                required
              />
            )}

            <Textarea
              label={`Comentario ${action === 'reject' ? '(Obligatorio)' : '(Opcional)'}`}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              required={action === 'reject'}
              helperText={
                action === 'reject'
                  ? 'Explica por qué rechazas esta solicitud'
                  : 'Añade un comentario adicional si lo deseas'
              }
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setAction(null);
                  setValorAprobado('');
                  setComentario('');
                  setError('');
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant={action === 'reject' ? 'danger' : 'primary'}
                onClick={handleAction}
                loading={loading}
              >
                {action === 'approve' && 'Aprobar'}
                {action === 'modify' && 'Aprobar con Modificación'}
                {action === 'reject' && 'Rechazar'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

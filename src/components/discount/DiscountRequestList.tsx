import { SolicitudDescuento } from '../../types/database.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Calendar, User, Percent, DollarSign, Package } from 'lucide-react';
import { BudgetCalculator } from '../../services/budgetCalculator';

interface DiscountRequestListProps {
  requests: SolicitudDescuento[];
  onCancel?: (id: string) => void;
  onView: (request: SolicitudDescuento) => void;
  isAdmin?: boolean;
}

export function DiscountRequestList({
  requests,
  onCancel,
  onView,
  isAdmin = false,
}: DiscountRequestListProps) {
  const getStatusBadge = (status: SolicitudDescuento['estado']) => {
    const badges = {
      PENDIENTE: <Badge variant="warning">Pendiente</Badge>,
      APROBADO: <Badge variant="success">Aprobado</Badge>,
      RECHAZADO: <Badge variant="error">Rechazado</Badge>,
      APROBADO_MODIFICADO: <Badge variant="info">Aprobado Modificado</Badge>,
    };
    return badges[status];
  };

  const formatValue = (request: SolicitudDescuento, isApproved: boolean = false) => {
    const value = isApproved ? request.valor_aprobado : request.valor_propuesto;
    if (!value) return '-';

    if (request.tipo === 'PORCENTAJE') {
      return `${value}%`;
    }
    return BudgetCalculator.formatCurrency(
      value,
      request.presupuesto?.moneda || 'PYG'
    );
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No hay solicitudes de descuento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(request.estado)}
                <Badge variant="neutral" size="sm">
                  {request.aplica_a === 'GLOBAL' ? 'Descuento Global' : 'Por Ítem'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {request.vendedor?.full_name}
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onView(request)}>
              Ver Detalles
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Tipo</p>
              <div className="flex items-center gap-2">
                {request.tipo === 'PORCENTAJE' ? (
                  <Percent className="w-4 h-4 text-gray-400" />
                ) : (
                  <DollarSign className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">{request.tipo}</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Valor Propuesto</p>
              <p className="font-semibold text-blue-600">
                {formatValue(request, false)}
              </p>
            </div>

            {(request.estado === 'APROBADO' ||
              request.estado === 'APROBADO_MODIFICADO') && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Valor Aprobado</p>
                <p className="font-semibold text-green-600">
                  {formatValue(request, true)}
                </p>
              </div>
            )}
          </div>

          {request.aplica_a === 'ITEM' && request.item && (
            <div className="flex items-start gap-2 mb-3 p-3 bg-gray-50 rounded">
              <Package className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{request.item.descripcion}</p>
                <p className="text-gray-600">
                  {request.item.cantidad} x{' '}
                  {BudgetCalculator.formatCurrency(
                    request.item.precio_unitario,
                    request.presupuesto?.moneda || 'PYG'
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Motivo</p>
            <p className="text-sm text-gray-700">{request.motivo}</p>
          </div>

          {request.comentario_admin && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
              <p className="text-xs text-blue-700 font-medium mb-1">
                Comentario del Administrador
              </p>
              <p className="text-sm text-blue-900">{request.comentario_admin}</p>
            </div>
          )}

          {request.estado === 'PENDIENTE' && onCancel && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="danger"
                onClick={() => onCancel(request.id)}
              >
                Cancelar Solicitud
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

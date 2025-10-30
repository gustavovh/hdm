import { useEffect, useState } from 'react';
import { Auditoria } from '../../types/database.types';
import { AuditService } from '../../services/api';
import {
  FileText,
  Check,
  X,
  Edit,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';

interface AuditTimelineProps {
  entidad: string;
  entidadId: string;
}

export function AuditTimeline({ entidad, entidadId }: AuditTimelineProps) {
  const [audits, setAudits] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudits();
  }, [entidad, entidadId]);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await AuditService.getByEntity(entidad, entidadId);
      setAudits(data);
    } catch (error) {
      console.error('Error loading audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (accion: string) => {
    const iconClass = 'w-5 h-5';
    switch (accion) {
      case 'CREAR_PRESUPUESTO':
      case 'CREAR_SOLICITUD_DESCUENTO':
        return <FileText className={`${iconClass} text-blue-600`} />;
      case 'APROBAR_SOLICITUD_DESCUENTO':
        return <Check className={`${iconClass} text-green-600`} />;
      case 'RECHAZAR_SOLICITUD_DESCUENTO':
        return <X className={`${iconClass} text-red-600`} />;
      case 'APROBAR_MODIFICADO_SOLICITUD_DESCUENTO':
        return <Edit className={`${iconClass} text-orange-600`} />;
      case 'ACTUALIZAR_PRESUPUESTO':
        return <Edit className={`${iconClass} text-blue-600`} />;
      case 'CANCELAR_SOLICITUD_DESCUENTO':
        return <AlertCircle className={`${iconClass} text-gray-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-400`} />;
    }
  };

  const getActionLabel = (accion: string): string => {
    const labels: Record<string, string> = {
      CREAR_PRESUPUESTO: 'Presupuesto creado',
      CREAR_SOLICITUD_DESCUENTO: 'Solicitud de descuento creada',
      APROBAR_SOLICITUD_DESCUENTO: 'Solicitud aprobada',
      APROBAR_MODIFICADO_SOLICITUD_DESCUENTO: 'Solicitud aprobada con modificación',
      RECHAZAR_SOLICITUD_DESCUENTO: 'Solicitud rechazada',
      CANCELAR_SOLICITUD_DESCUENTO: 'Solicitud cancelada',
      ACTUALIZAR_PRESUPUESTO: 'Presupuesto actualizado',
    };
    return labels[accion] || accion.replace(/_/g, ' ').toLowerCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-PY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('es-PY', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const renderChanges = (cambios: Record<string, any> | null) => {
    if (!cambios) return null;

    const { before, after } = cambios;

    if (!before && after) {
      return (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <p className="text-green-800 font-medium">Registro creado</p>
        </div>
      );
    }

    if (before && after) {
      const changes = Object.keys(after).filter(
        (key) =>
          JSON.stringify(before[key]) !== JSON.stringify(after[key]) &&
          !key.includes('_at') &&
          key !== 'updated_at'
      );

      if (changes.length === 0) return null;

      return (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
          <p className="text-blue-800 font-medium mb-1">Cambios realizados:</p>
          {changes.map((key) => (
            <div key={key} className="text-blue-700">
              <span className="font-medium">{key}:</span>{' '}
              <span className="line-through text-red-600">
                {JSON.stringify(before[key])}
              </span>{' '}
              →{' '}
              <span className="text-green-600">{JSON.stringify(after[key])}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        <p className="text-gray-600 mt-4">Cargando historial...</p>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600">No hay eventos registrados</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {audits.map((audit, index) => {
          const { date, time } = formatDate(audit.created_at);

          return (
            <div key={audit.id} className="relative pl-14">
              <div className="absolute left-4 -translate-x-1/2 w-10 h-10 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center z-10">
                {getActionIcon(audit.accion)}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {getActionLabel(audit.accion)}
                    </h4>
                    {audit.usuario && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <User className="w-4 h-4" />
                        <span>{audit.usuario.full_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{date}</div>
                    <div className="text-xs">{time}</div>
                  </div>
                </div>

                {renderChanges(audit.cambios)}

                {audit.ip_address && (
                  <div className="mt-2 text-xs text-gray-400">
                    IP: {audit.ip_address}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

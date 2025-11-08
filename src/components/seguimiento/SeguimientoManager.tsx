import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PresupuestoSeguimiento } from '../../types/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Calendar, Plus, Trash2, AlertCircle, Pencil } from 'lucide-react';

interface SeguimientoManagerProps {
  presupuestoId: string;
}

export function SeguimientoManager({ presupuestoId }: SeguimientoManagerProps) {
  const { user } = useAuth();
  const [seguimientos, setSeguimientos] = useState<PresupuestoSeguimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accion: '',
    status_comentario: '',
    proxima_accion: '',
    fecha_proxima_accion: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadSeguimientos();
  }, [presupuestoId]);

  const loadSeguimientos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('presupuesto_seguimiento')
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .eq('presupuesto_id', presupuestoId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setSeguimientos(data || []);
    } catch (err) {
      console.error('Error loading seguimientos:', err);
      setError('Error al cargar el seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setError('');

      if (formData.fecha_proxima_accion) {
        const fechaProxima = new Date(formData.fecha_proxima_accion);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (fechaProxima < hoy) {
          setError('La fecha de próxima acción no puede ser anterior a hoy');
          return;
        }
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('presupuesto_seguimiento')
          .update({
            accion: formData.accion,
            status_comentario: formData.status_comentario || null,
            proxima_accion: formData.proxima_accion || null,
            fecha_proxima_accion: formData.fecha_proxima_accion || null,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('presupuesto_seguimiento')
          .insert({
            presupuesto_id: presupuestoId,
            user_id: user.id,
            accion: formData.accion,
            status_comentario: formData.status_comentario || null,
            proxima_accion: formData.proxima_accion || null,
            fecha_proxima_accion: formData.fecha_proxima_accion || null,
          });

        if (insertError) throw insertError;
      }

      setFormData({
        accion: '',
        status_comentario: '',
        proxima_accion: '',
        fecha_proxima_accion: '',
      });
      setEditingId(null);
      setShowForm(false);
      loadSeguimientos();
    } catch (err: any) {
      console.error('Error saving seguimiento:', err);
      setError(err.message || 'Error al guardar el seguimiento');
    }
  };

  const handleEdit = (seguimiento: PresupuestoSeguimiento) => {
    setFormData({
      accion: seguimiento.accion,
      status_comentario: seguimiento.status_comentario || '',
      proxima_accion: seguimiento.proxima_accion || '',
      fecha_proxima_accion: seguimiento.fecha_proxima_accion || '',
    });
    setEditingId(seguimiento.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este seguimiento?')) return;

    try {
      const { error } = await supabase
        .from('presupuesto_seguimiento')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSeguimientos();
    } catch (err) {
      console.error('Error deleting seguimiento:', err);
      setError('Error al eliminar el seguimiento');
    }
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      accion: '',
      status_comentario: '',
      proxima_accion: '',
      fecha_proxima_accion: '',
    });
    setError('');
  };

  if (loading) {
    return <div className="text-center py-4">Cargando seguimiento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Gestión de Seguimiento</h3>
        {!showForm && (
          <Button
            type="button"
            onClick={() => setShowForm(true)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Acción
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {editingId ? 'Editar Seguimiento' : 'Nuevo Seguimiento'}
            </h4>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acción Realizada <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.accion}
              onChange={(e) => setFormData({ ...formData, accion: e.target.value })}
              placeholder="Ej: Llamada a cliente, Visita in situ, etc."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status / Comentario
            </label>
            <Textarea
              value={formData.status_comentario}
              onChange={(e) => setFormData({ ...formData, status_comentario: e.target.value })}
              placeholder="Comentarios sobre la acción realizada..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Próxima Acción
              </label>
              <Input
                type="text"
                value={formData.proxima_accion}
                onChange={(e) => setFormData({ ...formData, proxima_accion: e.target.value })}
                placeholder="Ej: Visita, Seguimiento, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Próxima Acción
              </label>
              <Input
                type="date"
                value={formData.fecha_proxima_accion}
                onChange={(e) => setFormData({ ...formData, fecha_proxima_accion: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingId ? 'Actualizar' : 'Guardar'} Seguimiento
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {seguimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay seguimientos registrados para este presupuesto
          </div>
        ) : (
          seguimientos.map((seg) => (
            <div
              key={seg.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{seg.accion}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(seg.fecha).toLocaleDateString('es-PY', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Por: {seg.user?.full_name || 'Usuario'}
                  </p>
                </div>
                {seg.user_id === user?.id && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(seg)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(seg.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {seg.status_comentario && (
                <div className="mb-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">Comentario:</p>
                  {seg.status_comentario}
                </div>
              )}

              {(seg.proxima_accion || seg.fecha_proxima_accion) && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Próxima Acción:</p>
                  <div className="flex items-center gap-4 text-sm">
                    {seg.proxima_accion && (
                      <span className="text-gray-900">{seg.proxima_accion}</span>
                    )}
                    {seg.fecha_proxima_accion && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Calendar className="w-4 h-4" />
                        {(() => {
                          const date = new Date(seg.fecha_proxima_accion + 'T00:00:00');
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

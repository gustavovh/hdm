import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { supabase } from '../../lib/supabase';
import { MessageSquare } from 'lucide-react';

interface RegistroGestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  presupuestoId: string;
  presupuestoCodigo: string;
  estadoActual: string;
  tipoNotificacion: '5_dias' | '3_semanas';
}

export function RegistroGestionModal({
  isOpen,
  onClose,
  presupuestoId,
  presupuestoCodigo,
  estadoActual,
  tipoNotificacion,
}: RegistroGestionModalProps) {
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!comentario.trim()) {
      alert('Por favor ingresa un comentario');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Guardar el registro de gestión
      const { error: insertError } = await supabase
        .from('registro_gestion')
        .insert({
          presupuesto_id: presupuestoId,
          vendedor_id: user.id,
          comentario: comentario.trim(),
          estado_momento: estadoActual,
          tipo_notificacion: tipoNotificacion === '5_dias' ? '5_dias_abierto' : '3_semanas_en_ejecucion',
        });

      if (insertError) throw insertError;

      // Actualizar el timestamp del presupuesto para resetear el contador de 24hs
      const { error: updateError } = await supabase
        .from('presupuestos')
        .update({
          ultima_actualizacion_estado: new Date().toISOString(),
        })
        .eq('id', presupuestoId);

      if (updateError) throw updateError;

      alert('Comentario guardado exitosamente');
      setComentario('');
      onClose();
    } catch (error: any) {
      console.error('Error guardando comentario:', error);
      alert('Error al guardar el comentario: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const getTitulo = () => {
    if (tipoNotificacion === '5_dias') {
      return 'Presupuesto en Estado ABIERTO - 5 Días';
    }
    return 'Presupuesto en Estado EN EJECUCIÓN - 3 Semanas';
  };

  const getMensaje = () => {
    if (tipoNotificacion === '5_dias') {
      return `El presupuesto ${presupuestoCodigo} está en estado ABIERTO hace 5 días. Por favor, ingresa un comentario sobre la gestión realizada o cambia el estado del presupuesto.`;
    }
    return `El presupuesto ${presupuestoCodigo} está EN EJECUCIÓN hace 3 semanas. Por favor, ingresa un comentario sobre la gestión realizada o cambia el estado del presupuesto.`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitulo()}>
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-900 font-medium mb-1">
                Acción Requerida
              </p>
              <p className="text-sm text-yellow-800">
                {getMensaje()}
              </p>
              <p className="text-sm text-yellow-800 mt-2 font-medium">
                Si no cargas gestión o cambias el estado en 24 horas, el presupuesto será anulado automáticamente.
              </p>
            </div>
          </div>
        </div>

        <Textarea
          label="Comentario de Gestión *"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Describe las acciones realizadas, contactos con el cliente, avances, etc."
          rows={6}
          required
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Guardar Comentario
          </Button>
        </div>
      </div>
    </Modal>
  );
}

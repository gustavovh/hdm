import { useState, useEffect } from 'react';
import { Presupuesto } from '../../types/database.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { Save, X, Search } from 'lucide-react';
import { ItemsEditor } from './ItemsEditor';
import { ClienteSearchModal } from './ClienteSearchModal';
import { ImageUpload } from './ImageUpload';
import { Cliente } from '../../services/clientesService';
import { EstadoWorkflowService, type BudgetStatus } from '../../services/estadoWorkflowService';

interface PresupuestoEditorProps {
  presupuesto: Presupuesto;
  onUpdate: () => void;
  onCancel: () => void;
}

export function PresupuestoEditor({ presupuesto, onUpdate, onCancel }: PresupuestoEditorProps) {
  const [loading, setLoading] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nombre: presupuesto.cliente_nombre || '',
    cliente_email: presupuesto.cliente_email || '',
    cliente_telefono: presupuesto.cliente_telefono || '',
    cliente_documento: presupuesto.cliente_documento || '',
    nombre_fantasia: presupuesto.nombre_fantasia || '',
    concepto: presupuesto.concepto || '',
    observaciones: presupuesto.observaciones || '',
    moneda: presupuesto.moneda || 'PYG',
    tipo_cambio: presupuesto.tipo_cambio || 7300,
    condicion_pago: presupuesto.condicion_pago || '',
    medio_pago: presupuesto.medio_pago || '',
    tasa_impuesto: presupuesto.tasa_impuesto || 10,
    tasa_comision: presupuesto.tasa_comision || 0,
  });

  const handleSelectCliente = (cliente: Cliente) => {
    setFormData({
      ...formData,
      cliente_nombre: cliente.nombre,
      nombre_fantasia: cliente.nombre_fantasia || '',
      cliente_documento: cliente.documento || '',
      cliente_telefono: cliente.telefono || '',
      cliente_email: cliente.email || '',
    });
  };

  const handleSave = async () => {
    if (!formData.cliente_nombre) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    setLoading(true);
    try {
      let nuevoEstado = presupuesto.estado;

      if (presupuesto.estado === 'CLONADO') {
        nuevoEstado = 'ABIERTO';
      }

      if (presupuesto.estado !== 'CLONADO' && presupuesto.estado !== nuevoEstado) {
        const validacion = await EstadoWorkflowService.validarTransicion(
          presupuesto.estado as BudgetStatus,
          nuevoEstado as BudgetStatus
        );

        // Si no está permitido o requiere aprobación, crear solicitud automáticamente
        if (!validacion.permitido || validacion.requiere_aprobacion) {
          const justificacion = prompt(
            `⚠️ CAMBIO DE ESTADO QUE REQUIERE APROBACIÓN\n\n` +
            `De: "${EstadoWorkflowService.getEstadoLabel(presupuesto.estado as BudgetStatus)}" → A: "${EstadoWorkflowService.getEstadoLabel(nuevoEstado as BudgetStatus)}"\n\n` +
            `${validacion.mensaje}\n\n` +
            `Por favor, proporciona una justificación para este cambio:`
          );

          if (!justificacion || !justificacion.trim()) {
            alert('Debes proporcionar una justificación para el cambio de estado.\n\nEl presupuesto se guardará manteniendo su estado actual.');
            nuevoEstado = presupuesto.estado;
          } else {
            // Crear solicitud de cambio
            try {
              await EstadoWorkflowService.crearSolicitud(
                presupuesto.id,
                nuevoEstado as BudgetStatus,
                justificacion
              );
              alert('SU SOLICITUD DE CAMBIO DE ESTADO FUE REMITIDA AL ADMINISTRADOR\n\nEl presupuesto se guardará con su estado actual hasta que el administrador apruebe el cambio.');
              nuevoEstado = presupuesto.estado;
            } catch (error: any) {
              alert('Error al crear la solicitud:\n' + error.message + '\n\nEl presupuesto se guardará con su estado actual.');
              nuevoEstado = presupuesto.estado;
            }
          }
        }
      }

      const updateData = {
        ...formData,
        estado: nuevoEstado,
      };

      const { error } = await supabase
        .from('presupuestos')
        .update(updateData)
        .eq('id', presupuesto.id);

      if (error) throw error;

      alert('Presupuesto actualizado exitosamente');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating presupuesto:', error);
      alert(`Error al actualizar el presupuesto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Modo de Edición - Presupuesto en CLONADO
        </h3>

        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Información del Cliente</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowClienteSearch(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar Cliente
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Cliente *
                </label>
                <Input
                  value={formData.cliente_nombre}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  placeholder="Nombre completo del cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Fantasía
                </label>
                <Input
                  value={formData.nombre_fantasia}
                  onChange={(e) => setFormData({ ...formData, nombre_fantasia: e.target.value })}
                  placeholder="Nombre comercial (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documento
                </label>
                <Input
                  value={formData.cliente_documento}
                  onChange={(e) => setFormData({ ...formData, cliente_documento: e.target.value })}
                  placeholder="RUC o CI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.cliente_email}
                  onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <Input
                  value={formData.cliente_telefono}
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                  placeholder="+595 XXX XXX XXX"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-900">Detalles del Presupuesto</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto
              </label>
              <Input
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                placeholder="Concepto del presupuesto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                placeholder="Observaciones adicionales"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición de Pago
                </label>
                <Input
                  value={formData.condicion_pago}
                  onChange={(e) => setFormData({ ...formData, condicion_pago: e.target.value })}
                  placeholder="Ej: 30 días, Contado, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medio de Pago
                </label>
                <Input
                  value={formData.medio_pago}
                  onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
                  placeholder="Ej: Transferencia, Efectivo, etc."
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-900">Configuración Financiera</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda *
                </label>
                <Select
                  value={formData.moneda}
                  onChange={(e) => setFormData({ ...formData, moneda: e.target.value as 'PYG' | 'USD' })}
                >
                  <option value="PYG">PYG - Guaraníes</option>
                  <option value="USD">USD - Dólares</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cambio
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.tipo_cambio}
                  onChange={(e) => setFormData({ ...formData, tipo_cambio: parseFloat(e.target.value) || 0 })}
                  placeholder="7300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasa de Impuesto (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.tasa_impuesto}
                  onChange={(e) => setFormData({ ...formData, tasa_impuesto: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasa de Comisión (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.tasa_comision}
                  onChange={(e) => setFormData({ ...formData, tasa_comision: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={loading}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              disabled={loading || !formData.cliente_nombre}
            >
              <Save className="w-4 h-4 mr-1" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ItemsEditor
          presupuestoId={presupuesto.id}
          moneda={formData.moneda}
          onItemsUpdated={onUpdate}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Imágenes del Presupuesto</h4>
        <ImageUpload
          presupuestoId={presupuesto.id}
          onUploadComplete={onUpdate}
        />
      </div>

      <ClienteSearchModal
        isOpen={showClienteSearch}
        onClose={() => setShowClienteSearch(false)}
        onSelect={handleSelectCliente}
      />
    </div>
  );
}

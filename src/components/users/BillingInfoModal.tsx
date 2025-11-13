import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Building, FileText, Phone, MapPin } from 'lucide-react';
import { User } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

interface BillingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
}

export function BillingInfoModal({ isOpen, onClose, onSuccess, user }: BillingInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: user.razon_social || '',
    ruc: user.ruc || '',
    direccion_facturacion: user.direccion_facturacion || '',
    ciudad_facturacion: user.ciudad_facturacion || '',
    telefono_facturacion: user.telefono_facturacion || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        razon_social: user.razon_social || '',
        ruc: user.ruc || '',
        direccion_facturacion: user.direccion_facturacion || '',
        ciudad_facturacion: user.ciudad_facturacion || '',
        telefono_facturacion: user.telefono_facturacion || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          razon_social: formData.razon_social || null,
          ruc: formData.ruc || null,
          direccion_facturacion: formData.direccion_facturacion || null,
          ciudad_facturacion: formData.ciudad_facturacion || null,
          telefono_facturacion: formData.telefono_facturacion || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Datos de facturación actualizados correctamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating billing info:', error);
      alert(error.message || 'Error al actualizar los datos de facturación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Datos de Facturación - ${user.full_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Building className="w-4 h-4 inline mr-1" />
            Razón Social
          </label>
          <Input
            type="text"
            value={formData.razon_social}
            onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
            placeholder="Nombre de la empresa"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              RUC
            </label>
            <Input
              type="text"
              value={formData.ruc}
              onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
              placeholder="12345678-9"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Teléfono
            </label>
            <Input
              type="tel"
              value={formData.telefono_facturacion}
              onChange={(e) => setFormData({ ...formData, telefono_facturacion: e.target.value })}
              placeholder="+595 21 123456"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4 inline mr-1" />
            Dirección de Facturación
          </label>
          <Input
            type="text"
            value={formData.direccion_facturacion}
            onChange={(e) => setFormData({ ...formData, direccion_facturacion: e.target.value })}
            placeholder="Calle, número, barrio"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4 inline mr-1" />
            Ciudad
          </label>
          <Input
            type="text"
            value={formData.ciudad_facturacion}
            onChange={(e) => setFormData({ ...formData, ciudad_facturacion: e.target.value })}
            placeholder="Asunción"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            Guardar Datos
          </Button>
        </div>
      </form>
    </Modal>
  );
}

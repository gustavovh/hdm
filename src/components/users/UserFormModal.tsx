import { useState, useEffect } from 'react';
import { User } from '../../types/database.types';
import { UserService } from '../../services/userService';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
}

export function UserFormModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UserFormModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'vendedor' as 'admin' | 'vendedor',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        password: '',
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        role: 'vendedor',
        password: '',
      });
    }
    setError('');
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (user) {
        await UserService.update(user.id, {
          full_name: formData.full_name,
          role: formData.role,
        });
      } else {
        if (!formData.password || formData.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        await UserService.create({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          password: formData.password,
        });
      }
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el usuario'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Editar Usuario' : 'Crear Usuario'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          required
          disabled={!!user}
        />

        <Input
          label="Nombre Completo"
          type="text"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
          required
        />

        <Select
          label="Rol"
          value={formData.role}
          onChange={(e) =>
            setFormData({
              ...formData,
              role: e.target.value as 'admin' | 'vendedor',
            })
          }
          required
        >
          <option value="vendedor">Vendedor</option>
          <option value="admin">Administrador</option>
        </Select>

        {!user && (
          <Input
            label="Contraseña"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            placeholder="Mínimo 6 caracteres"
          />
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {user ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

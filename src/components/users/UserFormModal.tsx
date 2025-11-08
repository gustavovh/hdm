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
    role: 'vendedor' as 'admin' | 'vendedor' | 'administrativo',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        password: '',
      });
      setShowPasswordField(false);
    } else {
      setFormData({
        email: '',
        full_name: '',
        role: 'vendedor',
        password: '',
      });
      setShowPasswordField(false);
    }
    setError('');
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (user) {
        const updates: { full_name: string; role: 'admin' | 'vendedor'; password?: string } = {
          full_name: formData.full_name,
          role: formData.role,
        };

        if (showPasswordField && formData.password) {
          if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
          }
          updates.password = formData.password;
        }

        await UserService.update(user.id, updates);
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
              role: e.target.value as 'admin' | 'vendedor' | 'administrativo',
            })
          }
          required
        >
          <option value="vendedor">Vendedor</option>
          <option value="administrativo">Administrativo</option>
          <option value="admin">Administrador</option>
        </Select>

        {!user ? (
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
        ) : (
          <>
            {!showPasswordField ? (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordField(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Cambiar Contraseña
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordField(false);
                    setFormData({ ...formData, password: '' });
                  }}
                  className="text-gray-600 hover:text-gray-700"
                >
                  Cancelar cambio de contraseña
                </Button>
              </div>
            )}
          </>
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

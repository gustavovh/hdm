import { useState, useEffect } from 'react';
import { User } from '../../types/database.types';
import { UserService } from '../../services/userService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { UserPlus, Edit, Shield, UserX, Eye, EyeOff, Key } from 'lucide-react';
import { UserFormModal } from './UserFormModal';

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await UserService.list();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const handleToggleActive = async (user: User) => {
    if (
      confirm(
        `¿Estás seguro de que deseas ${user.active ? 'desactivar' : 'activar'} a ${user.full_name}?`
      )
    ) {
      try {
        await UserService.toggleActive(user.id, !user.active);
        await loadUsers();
      } catch (error) {
        console.error('Error toggling user active status:', error);
        alert('Error al cambiar el estado del usuario');
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedUser(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedUser(null);
    loadUsers();
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const generated = generateRandomPassword();
    setNewPassword(generated);
    setShowNewPassword(true);
  };

  const handleSavePassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setPasswordLoading(true);
    try {
      await UserService.update(selectedUser.id, { password: newPassword });
      alert('Contraseña actualizada exitosamente');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Error al actualizar la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Gestión de Usuarios
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Administra los usuarios del sistema
              </p>
            </div>
            <Button onClick={handleCreate}>
              <UserPlus className="w-4 h-4 mr-2" />
              Crear Usuario
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-gray-500">No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {user.role === 'admin' ? (
                            <Shield className="w-5 h-5 text-blue-600" />
                          ) : (
                            <span className="text-sm font-semibold text-blue-600">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.full_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          user.role === 'admin'
                            ? 'info'
                            : user.role === 'administrativo'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {user.role === 'admin'
                          ? 'Administrador'
                          : user.role === 'administrativo'
                          ? 'Administrativo'
                          : 'Vendedor'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={user.active ? 'success' : 'error'}
                        size="sm"
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(user)}
                          title="Editar usuario"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleChangePassword(user)}
                          title="Cambiar contraseña"
                        >
                          <Key className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(user)}
                          title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {user.active ? (
                            <UserX className="w-4 h-4 text-red-600" />
                          ) : (
                            <Shield className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <UserFormModal
          isOpen={showForm}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          user={selectedUser}
        />
      )}

      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Cambiar Contraseña</h3>
            <p className="text-sm text-gray-600 mb-4">
              Usuario: <span className="font-medium">{selectedUser.full_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    placeholder="Ingrese nueva contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Generar Contraseña Aleatoria
              </button>

              {newPassword && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Importante:</strong> Copia esta contraseña antes de guardar.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={passwordLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePassword}
                disabled={!newPassword || passwordLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Guardando...' : 'Guardar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { User } from '../../types/database.types';
import { UserService } from '../../services/userService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { UserPlus, Edit, Trash2, Shield, UserX } from 'lucide-react';
import { UserFormModal } from './UserFormModal';

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
                        variant={user.role === 'admin' ? 'info' : 'neutral'}
                      >
                        {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
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
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(user)}
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
    </div>
  );
}

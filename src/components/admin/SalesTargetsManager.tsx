import React, { useState, useEffect } from 'react';
import { Target, Save, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { salesTargetsService } from '../../services/salesTargetsService';
import { userService } from '../../services/userService';
import { User, SalesTarget } from '../../types/database.types';
import { useAuth } from '../../contexts/AuthContext';

export const SalesTargetsManager: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [año, setAño] = useState(new Date().getFullYear());
  const [objetivo, setObjetivo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, targetsData] = await Promise.all([
        userService.getVendedores(),
        salesTargetsService.getAllTargets(),
      ]);
      setUsers(usersData.filter(u => u.active));
      setTargets(targetsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      const now = new Date();
      setMes(now.getMonth() + 1);
      setAño(now.getFullYear());

      const existingTarget = targets.find(
        t => t.user_id === user.id && t.mes === now.getMonth() + 1 && t.año === now.getFullYear()
      );
      setObjetivo(existingTarget ? existingTarget.objetivo.toString() : '');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setObjetivo('');
  };

  const handleSave = async () => {
    if (!selectedUser || !objetivo || !user) return;

    try {
      setLoading(true);
      await salesTargetsService.createOrUpdateTarget({
        user_id: selectedUser.id,
        mes,
        año,
        objetivo: parseFloat(objetivo),
        created_by: user.id,
      });
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving target:', error);
      alert('Error al guardar el objetivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (targetId: string) => {
    if (!confirm('¿Está seguro de eliminar este objetivo?')) return;

    try {
      setLoading(true);
      await salesTargetsService.deleteTarget(targetId);
      await loadData();
    } catch (error) {
      console.error('Error deleting target:', error);
      alert('Error al eliminar el objetivo');
    } finally {
      setLoading(false);
    }
  };

  const getTargetForUser = (userId: string, mes: number, año: number) => {
    return targets.find(t => t.user_id === userId && t.mes === mes && t.año === año);
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Objetivos de Ventas</h2>
        </div>
      </div>

      {loading && !users.length ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objetivo Actual ({currentMonth}/{currentYear})
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((vendedor) => {
                const currentTarget = getTargetForUser(vendedor.id, currentMonth, currentYear);
                return (
                  <tr key={vendedor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vendedor.full_name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{vendedor.email}</span>
                            {vendedor.role === 'administrativo' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                Administrativo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currentTarget ? (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(currentTarget.objetivo)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No asignado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleOpenModal(vendedor)}
                          size="sm"
                          variant="outline"
                        >
                          {currentTarget ? 'Editar' : 'Asignar'}
                        </Button>
                        {currentTarget && (
                          <Button
                            onClick={() => handleDelete(currentTarget.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Asignar Objetivo">
        <div className="space-y-4">
          {selectedUser && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Vendedor</p>
              <p className="font-semibold text-gray-900">{selectedUser.full_name}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <Input
                type="number"
                value={año}
                onChange={(e) => setAño(parseInt(e.target.value))}
                min={2020}
                max={2100}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objetivo (PYG)
            </label>
            <Input
              type="number"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ej: 50000000"
              min={0}
              step={1000000}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={handleCloseModal} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!objetivo || loading}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

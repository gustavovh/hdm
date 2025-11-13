import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ClientesService, Cliente } from '../../services/clientesService';

interface ClienteSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cliente: Cliente) => void;
}

export function ClienteSearchModal({ isOpen, onClose, onSelect }: ClienteSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClientes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      searchClientes();
    } else {
      loadClientes();
    }
  }, [searchQuery]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await ClientesService.getAll();
      setClientes(data);
    } catch (error) {
      console.error('Error loading clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchClientes = async () => {
    try {
      setLoading(true);
      const data = await ClientesService.search(searchQuery);
      setClientes(data);
    } catch (error) {
      console.error('Error searching clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (cliente: Cliente) => {
    onSelect(cliente);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buscar Cliente">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron clientes
            </div>
          ) : (
            clientes.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => handleSelect(cliente)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
              >
                <div className="font-semibold text-gray-900">{cliente.nombre}</div>
                {cliente.documento && (
                  <div className="text-sm text-gray-600">Doc: {cliente.documento}</div>
                )}
                <div className="text-sm text-gray-600">
                  {cliente.telefono && <span className="mr-4">Tel: {cliente.telefono}</span>}
                  {cliente.email && <span>Email: {cliente.email}</span>}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

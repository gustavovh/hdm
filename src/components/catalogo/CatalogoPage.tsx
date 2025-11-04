import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ProductosList } from './ProductosList';
import { ProductoFormModal } from './ProductoFormModal';
import { Button } from '../ui/Button';
import { Producto } from '../../types/database.types';

export function CatalogoPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (producto: Producto) => {
    setSelectedProducto(producto);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedProducto(undefined);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedProducto(undefined);
  };

  const handleSave = () => {
    setRefreshKey(prev => prev + 1);
    handleClose();
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-gray-600 mt-1">Gestiona tu inventario de productos y servicios</p>
        </div>

        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <ProductosList
        key={refreshKey}
        onEdit={handleEdit}
        selectionMode={false}
      />

      <ProductoFormModal
        isOpen={showModal}
        onClose={handleClose}
        onSave={handleSave}
        producto={selectedProducto}
      />
    </div>
  );
}

import { useState } from 'react';
import { ProductosList } from './ProductosList';
import { ProductoFormModal } from './ProductoFormModal';
import { Producto } from '../../types/database.types';

export function CatalogoPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (producto: Producto) => {
    setSelectedProducto(producto);
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
    <>
      <ProductosList
        key={refreshKey}
        onEdit={handleEdit}
        selectionMode={false}
      />

      {showModal && (
        <ProductoFormModal
          isOpen={showModal}
          onClose={handleClose}
          onSave={handleSave}
          producto={selectedProducto}
        />
      )}
    </>
  );
}

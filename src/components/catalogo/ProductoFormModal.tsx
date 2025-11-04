import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Producto, Categoria } from '../../types/database.types';
import { ProductosService } from '../../services/productosService';

interface ProductoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  producto?: Producto | null;
}

export function ProductoFormModal({ isOpen, onClose, onSave, producto }: ProductoFormModalProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    precio_base: 0,
    precio_usd: 0,
    unidad_medida: 'unidad',
    stock_disponible: 0,
    stock_minimo: 0,
    activo: true,
    notas: '',
  });

  useEffect(() => {
    loadCategorias();
  }, []);

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        categoria_id: producto.categoria_id || '',
        precio_base: producto.precio_base,
        precio_usd: producto.precio_usd || 0,
        unidad_medida: producto.unidad_medida,
        stock_disponible: producto.stock_disponible || 0,
        stock_minimo: producto.stock_minimo || 0,
        activo: producto.activo,
        notas: producto.notas || '',
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria_id: '',
        precio_base: 0,
        precio_usd: 0,
        unidad_medida: 'unidad',
        stock_disponible: 0,
        stock_minimo: 0,
        activo: true,
        notas: '',
      });
    }
  }, [producto]);

  const loadCategorias = async () => {
    try {
      const data = await ProductosService.getAllCategorias();
      setCategorias(data);
    } catch (error) {
      console.error('Error loading categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        categoria_id: formData.categoria_id || null,
        codigo: formData.codigo || undefined,
      };

      if (producto) {
        await ProductosService.updateProducto(producto.id, dataToSave);
      } else {
        await ProductosService.createProducto(dataToSave);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving producto:', error);
      alert('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={producto ? 'Editar Producto' : 'Nuevo Producto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código / SKU
            </label>
            <Input
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              placeholder="Ej: PROD-001 (opcional, se genera automático)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <Select
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <Input
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Nombre del producto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <Textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Descripción detallada del producto"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio Base (₲) *
            </label>
            <Input
              type="number"
              required
              min="0"
              step="1"
              value={formData.precio_base}
              onChange={(e) => setFormData({ ...formData, precio_base: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio USD
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.precio_usd}
              onChange={(e) => setFormData({ ...formData, precio_usd: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidad de Medida
            </label>
            <Select
              value={formData.unidad_medida}
              onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
            >
              <option value="unidad">Unidad</option>
              <option value="kg">Kilogramo</option>
              <option value="litro">Litro</option>
              <option value="metro">Metro</option>
              <option value="m2">Metro cuadrado</option>
              <option value="caja">Caja</option>
              <option value="paquete">Paquete</option>
              <option value="servicio">Servicio</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Disponible
            </label>
            <Input
              type="number"
              min="0"
              value={formData.stock_disponible}
              onChange={(e) => setFormData({ ...formData, stock_disponible: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Mínimo
            </label>
            <Input
              type="number"
              min="0"
              value={formData.stock_minimo}
              onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas Internas
          </label>
          <Textarea
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Notas o comentarios internos"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activo"
            checked={formData.activo}
            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="activo" className="text-sm font-medium text-gray-700">
            Producto activo
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Guardando...' : producto ? 'Actualizar' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

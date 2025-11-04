import { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit, Trash2, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Producto, Categoria } from '../../types/database.types';
import { ProductosService } from '../../services/productosService';
import { useAuth } from '../../contexts/AuthContext';

interface ProductosListProps {
  onSelectProducto?: (producto: Producto) => void;
  onEdit?: (producto: Producto) => void;
  selectionMode?: boolean;
}

export function ProductosList({ onSelectProducto, onEdit, selectionMode = false }: ProductosListProps) {
  const { isAdmin } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productosData, categoriasData] = await Promise.all([
        ProductosService.getAllProductos(),
        ProductosService.getAllCategorias(),
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Error loading productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      try {
        const results = await ProductosService.searchProductos(searchTerm);
        setProductos(results);
      } catch (error) {
        console.error('Error searching productos:', error);
      }
    } else {
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await ProductosService.deleteProducto(id);
      loadData();
    } catch (error) {
      console.error('Error deleting producto:', error);
      alert('Error al eliminar el producto');
    }
  };

  const filteredProductos = productos.filter(p => {
    if (categoriaFilter !== 'all' && p.categoria_id !== categoriaFilter) {
      return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {selectionMode ? 'Seleccionar Producto' : 'Catálogo de Productos'}
          </h2>
          <p className="text-gray-600 mt-1">
            {productos.length} producto(s) disponible(s)
          </p>
        </div>

        {isAdmin && !selectionMode && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por nombre, código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="w-64"
          >
            <option value="all">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </Select>

          <Button onClick={handleSearch} variant="secondary">
            <Filter className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>

      {filteredProductos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || categoriaFilter !== 'all'
              ? 'No se encontraron productos'
              : 'Aún no hay productos'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || categoriaFilter !== 'all'
              ? 'Intenta cambiar los filtros de búsqueda'
              : 'Agrega tu primer producto al catálogo'}
          </p>
          {isAdmin && !searchTerm && categoriaFilter === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Producto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProductos.map((producto) => (
            <div
              key={producto.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all ${
                selectionMode
                  ? 'hover:shadow-lg hover:border-blue-500 cursor-pointer'
                  : 'hover:shadow-md'
              }`}
              onClick={() => selectionMode && onSelectProducto?.(producto)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {producto.nombre}
                    </h3>
                    {producto.stock_disponible !== null && producto.stock_disponible !== undefined && (
                      <Badge variant={producto.stock_disponible > 0 ? 'success' : 'error'}>
                        Stock: {producto.stock_disponible}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Código: {producto.codigo}
                  </p>
                  {producto.categoria && (
                    <Badge variant="neutral" className="text-xs">
                      {producto.categoria.nombre}
                    </Badge>
                  )}
                </div>
              </div>

              {producto.descripcion && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {producto.descripcion}
                </p>
              )}

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Precio:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(producto.precio_base)}
                  </span>
                </div>
                {producto.precio_usd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">USD:</span>
                    <span className="text-sm font-semibold text-gray-700">
                      ${producto.precio_usd.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {producto.unidad_medida}
                  </span>
                </div>
              </div>

              {isAdmin && !selectionMode && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(producto);
                    }}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(producto.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

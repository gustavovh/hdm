import { useState, useEffect } from 'react';
import { PresupuestoItem } from '../../types/database.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, X, GripVertical } from 'lucide-react';
import { BudgetCalculator } from '../../services/budgetCalculator';

interface ItemsEditorProps {
  presupuestoId: string;
  moneda: 'PYG' | 'USD';
  onItemsUpdated: () => void;
}

interface ItemForm {
  id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento_aplicado: number;
  orden: number;
}

export function ItemsEditor({ presupuestoId, moneda, onItemsUpdated }: ItemsEditorProps) {
  const [items, setItems] = useState<PresupuestoItem[]>([]);
  const [editingItem, setEditingItem] = useState<ItemForm | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
  }, [presupuestoId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('presupuesto_items')
        .select('*')
        .eq('presupuesto_id', presupuestoId)
        .order('orden', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleAddNew = () => {
    setEditingItem({
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento_aplicado: 0,
      orden: items.length + 1,
    });
  };

  const handleEdit = (item: PresupuestoItem) => {
    setEditingItem({
      id: item.id,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento_aplicado: item.descuento_aplicado,
      orden: item.orden,
    });
  };

  const handleSave = async () => {
    if (!editingItem) return;

    setLoading(true);
    try {
      const subtotal = editingItem.cantidad * editingItem.precio_unitario;

      const itemData = {
        presupuesto_id: presupuestoId,
        descripcion: editingItem.descripcion,
        cantidad: editingItem.cantidad,
        precio_unitario: editingItem.precio_unitario,
        subtotal: subtotal,
        descuento_aplicado: 0,
        orden: editingItem.orden,
      };

      if (editingItem.id) {
        const { error } = await supabase
          .from('presupuesto_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('presupuesto_items')
          .insert(itemData);

        if (error) throw error;
      }

      await recalculatePresupuestoTotals();
      await loadItems();
      setEditingItem(null);
      onItemsUpdated();
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(`Error al guardar el ítem: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('¿Estás seguro de eliminar este ítem?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('presupuesto_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await recalculatePresupuestoTotals();
      await loadItems();
      onItemsUpdated();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert(`Error al eliminar el ítem: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const recalculatePresupuestoTotals = async () => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('presupuesto_items')
        .select('*')
        .eq('presupuesto_id', presupuestoId);

      if (itemsError) throw itemsError;

      const items = itemsData || [];
      const totalBruto = items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalDescuento = items.reduce((sum, item) => sum + item.descuento_aplicado, 0);

      const { data: presupuestoData, error: presupuestoError } = await supabase
        .from('presupuestos')
        .select('tasa_impuesto, tasa_comision')
        .eq('id', presupuestoId)
        .single();

      if (presupuestoError) throw presupuestoError;

      const totalNeto = totalBruto - totalDescuento;
      const totalImpuestos = totalNeto * (presupuestoData.tasa_impuesto / 100);
      const totalComisiones = totalNeto * (presupuestoData.tasa_comision / 100);

      const { error: updateError } = await supabase
        .from('presupuestos')
        .update({
          total_bruto: totalBruto,
          total_descuento: totalDescuento,
          total_neto: totalNeto,
          total_impuestos: totalImpuestos,
          total_comisiones: totalComisiones,
        })
        .eq('id', presupuestoId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error recalculating totals:', error);
    }
  };

  const calculateSubtotal = () => {
    if (!editingItem) return 0;
    return editingItem.cantidad * editingItem.precio_unitario;
  };

  const calculateTotal = () => {
    if (!editingItem) return 0;
    return calculateSubtotal() - editingItem.descuento_aplicado;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Ítems del Presupuesto</h3>
        <Button onClick={handleAddNew} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Agregar Ítem
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-2 cursor-move text-gray-400">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{item.descripcion}</div>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cantidad:</span>
                    <span className="ml-2 font-medium">{item.cantidad}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Precio Unit.:</span>
                    <span className="ml-2 font-medium">
                      {BudgetCalculator.formatCurrency(item.precio_unitario, moneda)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span>
                    <span className="ml-2 font-bold text-blue-600">
                      {BudgetCalculator.formatCurrency(item.subtotal, moneda)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => handleEdit(item)}
                  variant="outline"
                  size="sm"
                >
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(item.id)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay ítems. Haz clic en "Agregar Ítem" para comenzar.
          </div>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingItem.id ? 'Editar Ítem' : 'Nuevo Ítem'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <Textarea
                    value={editingItem.descripcion}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, descripcion: e.target.value })
                    }
                    rows={3}
                    placeholder="Descripción detallada del ítem"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.cantidad}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          cantidad: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Unitario ({moneda}) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.precio_unitario}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          precio_unitario: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-gray-700">Total del Ítem:</span>
                    <span className="text-blue-600">
                      {BudgetCalculator.formatCurrency(calculateSubtotal(), moneda)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={() => setEditingItem(null)}
                  variant="outline"
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  variant="primary"
                  disabled={loading || !editingItem.descripcion || editingItem.cantidad <= 0}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

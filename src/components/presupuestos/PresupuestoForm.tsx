import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Package } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Presupuesto, PresupuestoItem, Producto } from '../../types/database.types';
import { PresupuestoService, PresupuestoItemService } from '../../services/api';
import { ProductosList } from '../catalogo/ProductosList';
import { supabase } from '../../lib/supabase';

interface PresupuestoFormProps {
  presupuestoId?: string;
  onSave: () => void;
  onCancel: () => void;
}

interface ItemForm extends Omit<PresupuestoItem, 'id' | 'presupuesto_id' | 'created_at' | 'updated_at'> {
  tempId?: string;
}

export function PresupuestoForm({ presupuestoId, onSave, onCancel }: PresupuestoFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(false);

  const [formData, setFormData] = useState({
    concepto: '',
    cliente_nombre: '',
    cliente_documento: '',
    cliente_telefono: '',
    cliente_email: '',
    descripcion: '',
    moneda: 'PYG' as 'PYG' | 'USD',
    tipo_cambio: 7500,
    tasa_impuesto: 10,
    tasa_comision: 0,
  });

  const [items, setItems] = useState<ItemForm[]>([]);

  useEffect(() => {
    if (presupuestoId) {
      loadPresupuesto();
    } else {
      addNewItem();
    }
  }, [presupuestoId]);

  const loadPresupuesto = async () => {
    if (!presupuestoId) return;
    try {
      setLoading(true);
      const presupuesto = await PresupuestoService.getById(presupuestoId);
      setFormData({
        concepto: presupuesto.concepto || '',
        cliente_nombre: presupuesto.cliente_nombre,
        cliente_documento: presupuesto.cliente_documento || '',
        cliente_telefono: presupuesto.cliente_telefono || '',
        cliente_email: presupuesto.cliente_email || '',
        descripcion: presupuesto.observaciones || '',
        moneda: presupuesto.moneda,
        tipo_cambio: presupuesto.tipo_cambio,
        tasa_impuesto: presupuesto.tasa_impuesto,
        tasa_comision: presupuesto.tasa_comision,
      });

      const loadedItems = await PresupuestoItemService.getByPresupuesto(presupuestoId);
      setItems(
        loadedItems.map((item) => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        }))
      );
    } catch (error) {
      console.error('Error loading presupuesto:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewItem = () => {
    setItems([
      ...items,
      {
        tempId: Date.now().toString(),
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  };

  const addProductoFromCatalogo = (producto: Producto) => {
    setItems([
      ...items,
      {
        tempId: Date.now().toString(),
        descripcion: producto.nombre + (producto.descripcion ? ` - ${producto.descripcion}` : ''),
        cantidad: 1,
        precio_unitario: producto.precio_base,
      },
    ]);
    setShowCatalogo(false);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotals = () => {
    const totalBruto = items.reduce((sum, item) => {
      return sum + item.cantidad * item.precio_unitario;
    }, 0);

    const totalImpuestos = totalBruto * (formData.tasa_impuesto / 100);
    const totalComisiones = totalBruto * (formData.tasa_comision / 100);
    const totalFinal = totalBruto + totalImpuestos;

    return { totalBruto, totalImpuestos, totalComisiones, totalFinal };
  };

  const handleSubmit = async (estado: Presupuesto['estado']) => {
    if (!formData.concepto.trim()) {
      alert('El concepto es obligatorio');
      return;
    }

    if (!formData.cliente_nombre.trim()) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    if (items.length === 0 || items.some((item) => !item.descripcion.trim())) {
      alert('Debes agregar al menos un ítem válido');
      return;
    }

    try {
      setSaving(true);
      const totals = calculateTotals();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      let codigo = '';
      if (!presupuestoId) {
        const { data: lastPresupuesto } = await supabase
          .from('presupuestos')
          .select('codigo')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastNumber = lastPresupuesto?.codigo
          ? parseInt(lastPresupuesto.codigo.split('-')[1])
          : 0;
        codigo = `PRE-${String(lastNumber + 1).padStart(6, '0')}`;
      }

      const presupuestoData: any = {
        concepto: formData.concepto,
        cliente_nombre: formData.cliente_nombre,
        cliente_documento: formData.cliente_documento || null,
        cliente_telefono: formData.cliente_telefono || null,
        cliente_email: formData.cliente_email || null,
        observaciones: formData.descripcion || null,
        moneda: formData.moneda,
        tipo_cambio: formData.tipo_cambio,
        tasa_impuesto: formData.tasa_impuesto,
        tasa_comision: formData.tasa_comision,
        estado,
        total_bruto: totals.totalBruto,
        total_descuento: 0,
        total_neto: totals.totalFinal,
        total_impuestos: totals.totalImpuestos,
        total_comisiones: totals.totalComisiones,
      };

      if (!presupuestoId) {
        presupuestoData.codigo = codigo;
        presupuestoData.vendedor_id = user.id;
        if (estado === 'PRESENTADO') {
          presupuestoData.fecha_presentacion = new Date().toISOString().split('T')[0];
        }
      }

      if (presupuestoId) {
        await PresupuestoService.update(presupuestoId, presupuestoData);

        const existingItems = await PresupuestoItemService.getByPresupuesto(presupuestoId);
        for (const item of existingItems) {
          await PresupuestoItemService.delete(item.id);
        }

        for (const item of items) {
          const subtotal = item.cantidad * item.precio_unitario;
          await PresupuestoItemService.create({
            presupuesto_id: presupuestoId,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: subtotal,
            descuento_aplicado: 0,
            orden: items.indexOf(item) + 1,
          });
        }
      } else {
        const { data: newPresupuesto, error } = await supabase
          .from('presupuestos')
          .insert(presupuestoData)
          .select()
          .single();

        if (error) throw error;

        for (const item of items) {
          const subtotal = item.cantidad * item.precio_unitario;
          await PresupuestoItemService.create({
            presupuesto_id: newPresupuesto.id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: subtotal,
            descuento_aplicado: 0,
            orden: items.indexOf(item) + 1,
          });
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving presupuesto:', error);
      alert('Error al guardar el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {presupuestoId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </h2>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Presupuesto
            </h3>
            <div className="mb-4">
              <Input
                label="Concepto / Título del Presupuesto *"
                value={formData.concepto}
                onChange={(e) =>
                  setFormData({ ...formData, concepto: e.target.value })
                }
                placeholder="Ej: Suministro de materiales de construcción"
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre del Cliente *"
                value={formData.cliente_nombre}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_nombre: e.target.value })
                }
                required
              />
              <Input
                label="RUC/CI"
                value={formData.cliente_documento}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_documento: e.target.value })
                }
              />
              <Input
                label="Teléfono"
                value={formData.cliente_telefono}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_telefono: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                value={formData.cliente_email}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_email: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configuración
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Moneda"
                value={formData.moneda}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    moneda: e.target.value as 'PYG' | 'USD',
                  })
                }
              >
                <option value="PYG">Guaraníes (PYG)</option>
                <option value="USD">Dólares (USD)</option>
              </Select>
              <Input
                label="Tipo de Cambio"
                type="number"
                value={formData.tipo_cambio}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo_cambio: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="IVA (%)"
                type="number"
                step="0.1"
                value={formData.tasa_impuesto}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tasa_impuesto: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="Comisión (%)"
                type="number"
                step="0.1"
                value={formData.tasa_comision}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tasa_comision: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="mt-4">
              <Textarea
                label="Descripción / Notas"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ítems</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCatalogo(true)}>
                  <Package className="w-4 h-4 mr-2" />
                  Del Catálogo
                </Button>
                <Button variant="outline" size="sm" onClick={addNewItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Ítem
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.tempId || index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <Input
                        label="Descripción *"
                        value={item.descripcion}
                        onChange={(e) =>
                          updateItem(index, 'descripcion', e.target.value)
                        }
                        placeholder="Descripción del ítem"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label="Cantidad"
                        type="number"
                        value={item.cantidad}
                        onChange={(e) =>
                          updateItem(
                            index,
                            'cantidad',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        label="Precio Unit."
                        type="number"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          updateItem(
                            index,
                            'precio_unitario',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-sm font-medium text-gray-700">
                      Subtotal:{' '}
                      {formatCurrency(item.cantidad * item.precio_unitario)}{' '}
                      {formData.moneda}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-2 max-w-md ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Bruto:</span>
                  <span className="font-medium">
                    {formatCurrency(totals.totalBruto)} {formData.moneda}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    IVA ({formData.tasa_impuesto}%):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(totals.totalImpuestos)} {formData.moneda}
                  </span>
                </div>
                {formData.tasa_comision > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Comisión ({formData.tasa_comision}%):
                    </span>
                    <span className="font-medium">
                      {formatCurrency(totals.totalComisiones)} {formData.moneda}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                  <span className="text-gray-900">Total Final:</span>
                  <span className="text-blue-600">
                    {formatCurrency(totals.totalFinal)} {formData.moneda}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit('BORRADOR')}
              loading={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Borrador
            </Button>
            <Button onClick={() => handleSubmit('PRESENTADO')} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Presentar Presupuesto
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showCatalogo}
        onClose={() => setShowCatalogo(false)}
        title="Seleccionar producto del catálogo"
        size="large"
      >
        <ProductosList
          selectionMode={true}
          onSelectProducto={addProductoFromCatalogo}
        />
      </Modal>
    </div>
  );
}

import { supabase } from '../lib/supabase';
import { Producto, Categoria } from '../types/database.types';

export class ProductosService {
  static async getAllProductos(): Promise<Producto[]> {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .is('deleted_at', null)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getProductoById(id: string): Promise<Producto | null> {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async searchProductos(query: string): Promise<Producto[]> {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .is('deleted_at', null)
      .eq('activo', true)
      .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%,descripcion.ilike.%${query}%`)
      .order('nombre', { ascending: true })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  static async getProductosByCategoria(categoriaId: string): Promise<Producto[]> {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .eq('categoria_id', categoriaId)
      .is('deleted_at', null)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createProducto(producto: Partial<Producto>): Promise<Producto> {
    let codigo = producto.codigo;

    if (!codigo) {
      const { data: lastProduct } = await supabase
        .from('productos')
        .select('codigo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastNumber = lastProduct?.codigo
        ? parseInt(lastProduct.codigo.replace(/\D/g, '')) || 0
        : 0;
      codigo = `PROD-${String(lastNumber + 1).padStart(6, '0')}`;
    }

    const { data, error } = await supabase
      .from('productos')
      .insert({
        codigo: codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria_id: producto.categoria_id,
        precio_base: producto.precio_base || 0,
        precio_usd: producto.precio_usd,
        unidad_medida: producto.unidad_medida || 'unidad',
        stock_disponible: producto.stock_disponible,
        stock_minimo: producto.stock_minimo,
        activo: producto.activo ?? true,
        imagen_url: producto.imagen_url,
        notas: producto.notas,
      })
      .select(`
        *,
        categoria:categorias(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProducto(id: string, updates: Partial<Producto>): Promise<Producto> {
    const { data, error } = await supabase
      .from('productos')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        categoria:categorias(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteProducto(id: string): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .update({
        deleted_at: new Date().toISOString(),
        activo: false,
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async getAllCategorias(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activa', true)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createCategoria(categoria: Partial<Categoria>): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        activa: categoria.activa ?? true,
        orden: categoria.orden || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCategoria(id: string, updates: Partial<Categoria>): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async search(query: string): Promise<Producto[]> {
    return this.searchProductos(query);
  }
}

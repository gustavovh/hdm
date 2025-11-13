import { supabase } from '../lib/supabase';

export interface Cliente {
  id: string;
  nombre: string;
  documento: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  pais: string | null;
  vendedor_id: string;
  created_at: string;
  updated_at: string;
}

export const ClientesService = {
  async getAll(): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return data || [];
  },

  async search(query: string): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,documento.ilike.%${query}%`)
      .order('nombre')
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async create(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .insert(cliente)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .update(cliente)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
  },
};

import { supabase } from '../lib/supabase';
import { SalesTarget } from '../types/database.types';

export const salesTargetsService = {
  async getTargetForUser(userId: string, mes: number, año: number): Promise<SalesTarget | null> {
    const { data, error } = await supabase
      .from('sales_targets')
      .select('*')
      .eq('user_id', userId)
      .eq('mes', mes)
      .eq('año', año)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCurrentTargetForUser(userId: string): Promise<SalesTarget | null> {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const año = now.getFullYear();

    return this.getTargetForUser(userId, mes, año);
  },

  async getAllTargetsForUser(userId: string): Promise<SalesTarget[]> {
    const { data, error } = await supabase
      .from('sales_targets')
      .select('*')
      .eq('user_id', userId)
      .order('año', { ascending: false })
      .order('mes', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllTargets(): Promise<SalesTarget[]> {
    const { data, error } = await supabase
      .from('sales_targets')
      .select('*')
      .order('año', { ascending: false })
      .order('mes', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createOrUpdateTarget(target: {
    user_id: string;
    mes: number;
    año: number;
    objetivo: number;
    created_by: string;
  }): Promise<SalesTarget> {
    const { data, error } = await supabase
      .from('sales_targets')
      .upsert(
        {
          user_id: target.user_id,
          mes: target.mes,
          año: target.año,
          objetivo: target.objetivo,
          created_by: target.created_by,
        },
        {
          onConflict: 'user_id,mes,año',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTarget(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales_targets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

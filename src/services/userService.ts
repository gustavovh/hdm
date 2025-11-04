import { supabase } from '../lib/supabase';
import { User } from '../types/database.types';

interface CreateUserDTO {
  email: string;
  full_name: string;
  role: 'admin' | 'vendedor';
  password: string;
}

interface UpdateUserDTO {
  full_name?: string;
  role?: 'admin' | 'vendedor';
}

export class UserService {
  static async list(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async create(userData: CreateUserDTO): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          role: userData.role,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Error al crear usuario');

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        active: true,
      })
      .select()
      .single();

    if (userError) throw userError;
    return user;
  }

  static async update(id: string, updates: UpdateUserDTO): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async toggleActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ active })
      .eq('id', id);

    if (error) throw error;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}

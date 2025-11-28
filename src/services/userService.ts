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
  role?: 'admin' | 'vendedor' | 'administrativo';
  password?: string;
}

export class UserService {
  static async list(): Promise<User[]> {
    // Use the SECURITY DEFINER function to bypass RLS recursion issues
    const { data, error } = await supabase.rpc('get_all_users');

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No hay sesión activa');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear usuario');
    }

    const result = await response.json();
    return result.user;
  }

  static async update(id: string, updates: UpdateUserDTO): Promise<User> {
    // Change password first if needed
    if (updates.password) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: id,
            new_password: updates.password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar contraseña');
      }
    }

    // Update user data (full_name, role) using SECURITY DEFINER function
    const hasDataUpdates = updates.full_name !== undefined || updates.role !== undefined;

    if (hasDataUpdates) {
      const { data, error } = await supabase.rpc('update_user_as_admin', {
        target_user_id: id,
        new_full_name: updates.full_name,
        new_role: updates.role,
      });

      if (error) throw error;
      return data;
    }

    // If only password was changed, get the user data
    const { data: allUsers, error } = await supabase.rpc('get_all_users');
    if (error) throw error;

    const user = allUsers?.find((u: User) => u.id === id);
    if (!user) throw new Error('Usuario no encontrado');

    return user;
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

  static async getVendedores(): Promise<User[]> {
    // Use the SECURITY DEFINER function and filter locally
    // Incluye vendedores Y administrativos
    const { data, error } = await supabase.rpc('get_all_users');

    if (error) throw error;
    return (data || [])
      .filter((user: User) => user.role === 'vendedor' || user.role === 'administrativo')
      .sort((a: User, b: User) => (a.full_name || '').localeCompare(b.full_name || ''));
  }
}

export const userService = UserService;

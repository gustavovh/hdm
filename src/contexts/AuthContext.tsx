import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types/database.types';
import { UserService } from '../services/api';


interface AuthContextType {
  authUser: AuthUser | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: 'admin' | 'vendedor') => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isVendedor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        (async () => {
          setAuthUser(session?.user || null);
          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setUser(null);
            setLoading(false);
          }
        })();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 loadUserProfile - Starting for userId:', userId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ loadUserProfile - Database error:', error);
        throw error;
      }

      console.log('✅ loadUserProfile - Profile loaded:', profile);

      if (!profile) {
        console.error('❌ loadUserProfile - No profile found for user');
        console.error('❌ Signing out and clearing session');
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('✅ Profile successfully loaded, setting user state');
      setUser(profile);
      setLoading(false);
    } catch (error) {
      console.error('❌ loadUserProfile - Error:', error);
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'vendedor' = 'vendedor'
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        active: true,
      });

      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isVendedor = user?.role === 'vendedor';

  return (
    <AuthContext.Provider
      value={{
        authUser,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isVendedor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

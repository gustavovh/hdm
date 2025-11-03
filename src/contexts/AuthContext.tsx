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
    console.log('🚀 AuthContext: Initializing...');

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Session error:', error);
        supabase.auth.signOut();
        setAuthUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('📋 Initial session check:', session ? 'Session found' : 'No session');
      if (session?.user) {
        console.log('👤 User in session:', session.user.id);
      }

      setAuthUser(session?.user || null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('❌ Fatal session error:', err);
      supabase.auth.signOut();
      setAuthUser(null);
      setUser(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state changed:', event);
        console.log('📋 New session:', session ? 'Session exists' : 'No session');

        (async () => {
          setAuthUser(session?.user || null);
          if (session?.user) {
            console.log('👤 Loading profile for user:', session.user.id);
            await loadUserProfile(session.user.id);
          } else {
            console.log('❌ No user in session');
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
      console.log('🔍 Loading user profile for ID:', userId);
      const profile = await UserService.getById(userId);
      console.log('✅ User profile loaded:', profile);
      setUser(profile);
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      setUser(null);
    } finally {
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

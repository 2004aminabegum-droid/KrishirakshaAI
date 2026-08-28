'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

export type AppRole = 'farmer' | 'officer';

interface AuthContextValue {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string, role: AppRole) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getRole = (user: User | null): AppRole | null => {
  if (!user) return null;
  if (user.email?.toLowerCase() === 'admin@gmail.com') return 'officer';
  return user.user_metadata?.role === 'officer' ? 'officer' : 'farmer';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) return { error: 'Supabase is not configured. Add the public Supabase URL and anon key.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp = async (name: string, email: string, password: string, role: AppRole) => {
    if (!isSupabaseConfigured || !supabase) return { error: 'Supabase is not configured. Add the public Supabase URL and anon key.' };
    if (email.toLowerCase() === 'admin@gmail.com') return { error: 'This email is reserved for the agriculture officer administrator.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } }
    });
    if (error) return { error: error.message };
    return { needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    if (typeof window !== 'undefined') localStorage.removeItem('krishirakshak_role');
  };

  return (
    <AuthContext.Provider value={{ user, role: getRole(user), loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

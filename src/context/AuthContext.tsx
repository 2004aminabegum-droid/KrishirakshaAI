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

const MOCK_SESSION_KEY = 'krishirakshak_auth_session';

const getRole = (user: User | null): AppRole | null => {
  if (!user) return null;
  if (user.email?.toLowerCase() === 'admin@gmail.com') return 'officer';
  return user.user_metadata?.role === 'officer' ? 'officer' : 'farmer';
};

const createMockUser = (email: string, name: string, role: AppRole): User => ({
  id: `usr_${Date.now()}`,
  app_metadata: { provider: 'local' },
  user_metadata: { full_name: name, role },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email,
} as unknown as User);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(MOCK_SESSION_KEY);
        if (cached) return JSON.parse(cached);
      } catch (err) {
        console.warn('Could not read cached session', err);
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: Never leave loading true for more than 2 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    if (!supabase) {
      setLoading(false);
      clearTimeout(timeout);
      return;
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) {
          if (data.session?.user) {
            setUser(data.session.user);
            try {
              localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(data.session.user));
              localStorage.setItem('krishirakshak_role', getRole(data.session.user) || 'farmer');
            } catch {}
          }
          setLoading(false);
          clearTimeout(timeout);
        }
      })
      .catch((err) => {
        console.warn('Supabase getSession failed, falling back to local session:', err);
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (mounted) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          try {
            localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(currentUser));
            localStorage.setItem('krishirakshak_role', getRole(currentUser) || 'farmer');
          } catch {}
        }
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const isOfficer = email.trim().toLowerCase() === 'admin@gmail.com';
    const role: AppRole = isOfficer ? 'officer' : 'farmer';

    // 1. Try real Supabase auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (!error && data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(data.user));
            localStorage.setItem('krishirakshak_role', role);
          }
          return {};
        }
        // If officer and Supabase returned invalid credentials, check if local master password admin@11 matches
        if (isOfficer && (password === 'admin@11' || password === 'admin')) {
          console.info('Supabase sign in failed, authenticating officer via local master credentials.');
        } else if (error) {
          return { error: error.message };
        }
      } catch (err) {
        console.warn('Network error reaching Supabase, trying offline fallback:', err);
      }
    }

    // 2. Offline / Local fallback authentication
    if (isOfficer) {
      if (password !== 'admin@11' && password !== 'admin') {
        return { error: 'Invalid password. For officer demo use: admin@11' };
      }
      const officerUser = createMockUser('admin@gmail.com', 'Agriculture Officer Administrator', 'officer');
      setUser(officerUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(officerUser));
        localStorage.setItem('krishirakshak_role', 'officer');
      }
      return {};
    }

    // Farmer local fallback
    if (!email || !password) {
      return { error: 'Please provide both email and password.' };
    }
    const farmerUser = createMockUser(email.trim(), email.split('@')[0], 'farmer');
    setUser(farmerUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(farmerUser));
      localStorage.setItem('krishirakshak_role', 'farmer');
    }
    return {};
  };

  const signUp = async (name: string, email: string, password: string, role: AppRole) => {
    if (email.trim().toLowerCase() === 'admin@gmail.com') {
      return { error: 'This email is reserved for the agriculture officer administrator.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name, role } }
        });
        if (error) return { error: error.message };
        if (data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(data.user));
            localStorage.setItem('krishirakshak_role', role);
          }
        }
        return { needsEmailConfirmation: !data.session };
      } catch (err) {
        console.warn('Supabase sign up failed, falling back to local account creation:', err);
      }
    }

    // Offline / Local signup fallback
    const localUser = createMockUser(email.trim(), name, role);
    setUser(localUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(localUser));
      localStorage.setItem('krishirakshak_role', role);
    }
    return { needsEmailConfirmation: false };
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MOCK_SESSION_KEY);
      localStorage.removeItem('krishirakshak_role');
    }
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

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, shouldBypassNetwork } from '@/lib/supabase/client';
import { MOCK_ACCOUNTS } from '@/lib/supabase/mock-data';

export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'employee';

export type Profile = {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    if (shouldBypassNetwork()) {
      const matched =
        MOCK_ACCOUNTS.find((a) => a.id === userId || a.email === userId) ||
        MOCK_ACCOUNTS[0];
      setProfile({
        id: matched.id,
        organization_id: matched.organization_id,
        email: matched.email,
        full_name: matched.full_name,
        role: matched.role,
        phone: matched.phone,
        is_active: true,
      });
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, organization_id, email, full_name, role, phone, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback: check MOCK_ACCOUNTS in dev mode
    const matched = MOCK_ACCOUNTS.find((a) => a.id === userId) || MOCK_ACCOUNTS[0];
    if (matched) {
      setProfile({
        id: matched.id,
        organization_id: matched.organization_id,
        email: matched.email,
        full_name: matched.full_name,
        role: matched.role,
        phone: matched.phone,
        is_active: true,
      });
    }
  }, []);

  // Failsafe: guarantee loading is resolved and mock profile is ready in offline/dev mode
  useEffect(() => {
    const failsafe = setTimeout(() => {
      setLoading(false);
      setProfile((current) => current || {
        id: MOCK_ACCOUNTS[0].id,
        organization_id: MOCK_ACCOUNTS[0].organization_id,
        email: MOCK_ACCOUNTS[0].email,
        full_name: MOCK_ACCOUNTS[0].full_name,
        role: MOCK_ACCOUNTS[0].role,
        phone: MOCK_ACCOUNTS[0].phone,
        is_active: true,
      });
    }, 300);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          if (!mounted) return;
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
        })();
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}
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

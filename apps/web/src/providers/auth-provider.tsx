'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import apiClient from '@/lib/api-client';
import { assertSupabaseConfigured, isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { PortalSection } from '@gymstack/shared';

export interface AuthUser {
  id: string;
  organizationId: string | null;
  gymId: string | null;
  name: string;
  role: string;
  portalSections: PortalSection[];
  phone: string;
  email: string | null;
}

export interface BranchSummary {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  branches: BranchSummary[];
  selectedBranchId: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchBranch: (branchId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setUser(null);
      setBranches([]);
      setSelectedBranchId(null);
      return;
    }
    const { data } = await apiClient.get<{ user: AuthUser; branches: BranchSummary[] }>('/auth/me');
    setUser(data.user);
    setBranches(data.branches);
    const stored = window.localStorage.getItem('gymos-branch-id');
    const allowedStored = data.branches.some((branch) => branch.id === stored);
    const nextBranchId = allowedStored ? stored : data.user.gymId ?? data.branches[0]?.id ?? null;
    if (nextBranchId) window.localStorage.setItem('gymos-branch-id', nextBranchId);
    else window.localStorage.removeItem('gymos-branch-id');
    setSelectedBranchId(nextBranchId);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      try {
        await loadProfile(data.session);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      window.setTimeout(() => loadProfile(nextSession).catch(() => setUser(null)), 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    try {
      await loadProfile(data.session);
    } catch (error) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.localStorage.removeItem('gymos-branch-id');
    setUser(null);
    setSession(null);
    window.location.href = '/login';
  };

  const switchBranch = (branchId: string) => {
    if (!branches.some((branch) => branch.id === branchId)) return;
    window.localStorage.setItem('gymos-branch-id', branchId);
    setSelectedBranchId(branchId);
    window.location.href = '/dashboard';
  };

  const changePassword = async (password: string) => {
    assertSupabaseConfigured();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const requestPasswordReset = async (email: string) => {
    assertSupabaseConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, branches, selectedBranchId, isLoading, login, logout, changePassword, requestPasswordReset, refreshProfile: () => loadProfile(session), switchBranch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import apiClient, { setApiSession } from '@/lib/api-client';
import { clearPersistedQueryCache } from '@/lib/query-cache';
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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchBranch: (branchId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_PROFILE_CACHE_PREFIX = 'gymos-auth-profile';
const AUTH_PROFILE_CACHE_MAX_AGE = 10 * 60 * 1000;

interface CachedAuthProfile {
  savedAt: number;
  user: AuthUser;
  branches: BranchSummary[];
}

function authProfileCacheKey(authUserId: string) {
  return `${AUTH_PROFILE_CACHE_PREFIX}:${authUserId}`;
}

function clearAuthProfileCache() {
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(`${AUTH_PROFILE_CACHE_PREFIX}:`)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Session storage is an optimization; auth continues without it.
  }
}

function persistAuthProfile(activeSession: Session, user: AuthUser, branches: BranchSummary[]) {
  try {
    window.sessionStorage.setItem(authProfileCacheKey(activeSession.user.id), JSON.stringify({
      savedAt: Date.now(),
      user,
      branches,
    } satisfies CachedAuthProfile));
  } catch {
    // Session storage is an optimization; auth continues without it.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyProfile = useCallback((nextUser: AuthUser, nextBranches: BranchSummary[]) => {
    window.localStorage.setItem('gymos-user-id', nextUser.id);
    setUser(nextUser);
    setBranches(nextBranches);
    const stored = window.localStorage.getItem('gymos-branch-id');
    const allowedStored = nextBranches.some((branch) => branch.id === stored);
    const nextBranchId = allowedStored ? stored : nextUser.gymId ?? nextBranches[0]?.id ?? null;
    if (nextBranchId) window.localStorage.setItem('gymos-branch-id', nextBranchId);
    else window.localStorage.removeItem('gymos-branch-id');
    setSelectedBranchId(nextBranchId);
  }, []);

  const restoreCachedProfile = useCallback((activeSession: Session) => {
    const key = authProfileCacheKey(activeSession.user.id);
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return false;
      const cached = JSON.parse(raw) as CachedAuthProfile;
      if (Date.now() - cached.savedAt > AUTH_PROFILE_CACHE_MAX_AGE) {
        window.sessionStorage.removeItem(key);
        return false;
      }
      applyProfile(cached.user, cached.branches);
      return true;
    } catch {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Storage is optional.
      }
      return false;
    }
  }, [applyProfile]);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      window.localStorage.removeItem('gymos-user-id');
      setUser(null);
      setBranches([]);
      setSelectedBranchId(null);
      return;
    }
    const { data } = await apiClient.get<{ user: AuthUser; branches: BranchSummary[] }>('/auth/me');
    persistAuthProfile(activeSession, data.user, data.branches);
    applyProfile(data.user, data.branches);
  }, [applyProfile]);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setApiSession(data.session);
      setSession(data.session);
      const restoredProfile = data.session ? restoreCachedProfile(data.session) : false;
      if (restoredProfile) setIsLoading(false);
      try {
        await loadProfile(data.session);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403 && typeof window !== 'undefined') {
          if (!window.location.pathname.includes('complete-profile')) {
            window.location.href = '/auth/complete-profile';
            return;
          }
        }
        if (mounted && !restoredProfile) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setApiSession(nextSession);
      setSession(nextSession);
      window.setTimeout(() => {
        loadProfile(nextSession).catch((err) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 403 && typeof window !== 'undefined') {
            if (!window.location.pathname.includes('complete-profile')) {
              window.location.href = '/auth/complete-profile';
              return;
            }
          }
          setUser(null);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, restoreCachedProfile]);

  const login = async (email: string, password: string) => {
    assertSupabaseConfigured();
    queryClient.clear();
    clearPersistedQueryCache();
    clearAuthProfileCache();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setApiSession(data.session);
    setSession(data.session);
    try {
      await loadProfile(data.session);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403 && typeof window !== 'undefined') {
        if (!window.location.pathname.includes('complete-profile')) {
          window.location.href = '/auth/complete-profile';
          return;
        }
      }
      await supabase.auth.signOut();
      setApiSession(null);
      setSession(null);
      setUser(null);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    assertSupabaseConfigured();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setApiSession(null);
    queryClient.clear();
    clearPersistedQueryCache();
    clearAuthProfileCache();
    window.localStorage.removeItem('gymos-user-id');
    window.localStorage.removeItem('gymos-branch-id');
    setUser(null);
    setSession(null);
    window.location.href = '/login';
  };

  const switchBranch = (branchId: string) => {
    if (!branches.some((branch) => branch.id === branchId)) return;
    queryClient.clear();
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
    <AuthContext.Provider value={{
      user,
      session,
      branches,
      selectedBranchId,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      changePassword,
      requestPasswordReset,
      refreshProfile: async () => {
        const { data } = await supabase.auth.getSession();
        await loadProfile(data.session ?? session);
      },
      switchBranch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

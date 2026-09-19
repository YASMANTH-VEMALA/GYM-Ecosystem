import axios from 'axios';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearPersistedQueryCache } from './query-cache';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

let cachedSession: Session | null = null;
let sessionRequest: ReturnType<typeof supabase.auth.getSession> | null = null;

export function setApiSession(session: Session | null) {
  cachedSession = session;
}

async function getAccessToken() {
  const expiresAt = cachedSession?.expires_at ?? 0;
  if (cachedSession?.access_token && expiresAt * 1000 > Date.now() + 10_000) {
    return cachedSession.access_token;
  }

  sessionRequest ??= supabase.auth.getSession();
  try {
    const { data } = await sessionRequest;
    cachedSession = data.session;
    return data.session?.access_token;
  } finally {
    sessionRequest = null;
  }
}

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const selectedBranchId = window.localStorage.getItem('gymos-branch-id');
    if (selectedBranchId) config.headers['X-Gym-Id'] = selectedBranchId;

  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const isAuthFlow = path.includes('/callback') || path.includes('complete-profile');

      if (error.response?.status === 401 && !isAuthFlow) {
        setApiSession(null);
        clearPersistedQueryCache();
        window.localStorage.removeItem('gymos-user-id');
        await supabase.auth.signOut();
        window.location.href = '/login';
      } else if (error.response?.status === 403) {
        const url = error.config?.url ?? '';
        if (url.includes('/auth/me') && !isAuthFlow) {
          // New Google/OAuth or registered user without a gym record yet — redirect to complete profile
          window.location.href = '/auth/complete-profile';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

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
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      setApiSession(null);
      clearPersistedQueryCache();
      window.localStorage.removeItem('gymos-user-id');
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

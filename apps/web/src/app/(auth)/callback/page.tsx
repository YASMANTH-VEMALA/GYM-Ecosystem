'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import apiClient from '@/lib/api-client';
import { setApiSession } from '@/lib/api-client';

/**
 * Landing page for Supabase OAuth redirects.
 *
 * Supabase appends either:
 *  - A `code` query param  (PKCE flow)  → we exchange it for a session
 *  - A hash fragment with tokens        → Supabase handles automatically
 *
 * After obtaining a session we try /auth/me:
 *  - 200 → user has a DB record → go to /dashboard
 *  - 403 → new Google user, not provisioned yet → go to /auth/complete-profile
 *  - anything else → show error
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function handle() {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error_description') || params.get('error');
      if (urlError) {
        console.error('OAuth provider redirected with error:', urlError);
        router.replace(`/login?error=${encodeURIComponent(urlError)}`);
        return;
      }

      const code = params.get('code');
      let activeSession = null;

      // 1. Check if Supabase client already auto-parsed the session via detectSessionInUrl
      const { data: initialSession } = await supabase.auth.getSession();
      if (initialSession?.session) {
        activeSession = initialSession.session;
      } else if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          activeSession = data.session;
        } else {
          // If code was already exchanged by concurrent listener, check session again
          const { data: retrySession } = await supabase.auth.getSession();
          if (retrySession?.session) {
            activeSession = retrySession.session;
          } else {
            console.error('Failed to exchange code for session:', error);
            router.replace(`/login?error=${encodeURIComponent(error?.message || 'oauth_failed')}`);
            return;
          }
        }
      } else {
        // Hash-fragment flow — wait for Supabase JS to process the URL fragment
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        const { data: hashSession } = await supabase.auth.getSession();
        activeSession = hashSession?.session;
      }

      if (!activeSession) {
        router.replace('/login?error=oauth_failed');
        return;
      }

      setApiSession(activeSession);

      // Try to load the user's DB profile
      try {
        const { data } = await apiClient.get<{ user: { role: string } }>('/auth/me');
        const role = data.user.role;
        router.replace(role === 'member' ? '/member-app' : '/dashboard');
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        const status = axiosErr?.response?.status;
        if (status === 403) {
          // New Google/OAuth user — they need to set up their gym profile
          router.replace('/auth/complete-profile');
          return;
        }

        console.error('Callback error loading /auth/me:', err);
        if (!axiosErr?.response) {
          // Network error: Backend API is not reachable
          router.replace('/login?error=api_unreachable');
        } else {
          router.replace('/login?error=oauth_failed');
        }
      }
    }

    handle();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page gap-4">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-card bg-primary text-white font-medium text-section-heading">G</div>
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 size={18} className="animate-spin" strokeWidth={1.5} />
        <span className="text-body">Signing you in…</span>
      </div>
    </div>
  );
}

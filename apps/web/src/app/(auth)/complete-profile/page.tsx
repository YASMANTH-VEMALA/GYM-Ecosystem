'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeroSide from '@/components/auth/AuthHeroSide';
import { Loader2, Building2, User, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import apiClient, { setApiSession } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Shown to users who signed in via Google or registered for the first time.
 * They have a valid Supabase session but no Organization/Gym/User record yet.
 * We collect gym name, owner name, phone, and optionally city, then call POST /auth/setup.
 */
export default function CompleteProfilePage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState('');

  // Pre-fill name from the Google account, verify session, and check if already provisioned
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        window.location.href = '/login';
        return;
      }

      setToken(data.session.access_token);
      setApiSession(data.session);

      // If user account is already created in the database, navigate straight to dashboard
      try {
        const { data: profile } = await apiClient.get<{ user: { role: string } }>('/auth/me');
        if (profile?.user) {
          window.location.href = profile.user.role === 'member' ? '/member-app' : '/dashboard';
          return;
        }
      } catch {
        // 403 status is expected for newly authenticated users who need setup
      }

      if (!mounted) return;
      const meta = data.session.user.user_metadata as Record<string, string> | undefined;
      const name = meta?.full_name ?? meta?.name ?? '';
      setGoogleName(name);
      if (name) {
        setOwnerName(name);
      }
      setCheckingAuth(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gymName: gymName.trim(),
          ownerName: ownerName.trim(),
          phone: cleanPhone,
          city: city.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      // If created (201) or already setup (409), refresh auth and go to dashboard
      if (response.status === 201 || response.status === 409) {
        try {
          await refreshProfile();
        } catch {
          // Fallback to full page navigation
        }
        window.location.href = '/dashboard';
        return;
      }

      if (!response.ok) {
        if (data.details && data.details.length > 0) {
          setError(data.details[0].message);
        } else {
          setError(data.error ?? 'Setup failed. Please try again.');
        }
        return;
      }

      // Fallback redirect
      window.location.href = '/dashboard';
    } catch {
      setError('Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex w-full bg-black">
        <AuthHeroSide />
        <div className="w-full md:w-1/2 lg:w-2/5 min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-black">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-black">
      {/* Left hero side — dynamic animated quotes, progress timers, and uncropped athlete hero */}
      <AuthHeroSide />

      {/* Right side — sleek modern Linear/Vercel style form */}
      <div className="w-full md:w-1/2 lg:w-2/5 min-h-screen flex flex-col justify-center items-center px-6 py-12 sm:px-10 lg:px-14 bg-black select-none">
        <div className="w-full max-w-[360px] mx-auto">
          {/* Brand header */}
          <div className="mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-blue-500/20">
              G
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Set up your gym</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {googleName ? `Welcome, ${googleName}! ` : ''}Enter your gym details to finish setup
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Gym name
              </label>
              <div className="relative flex items-center">
                <Building2 size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. Iron Fitness"
                  autoComplete="organization"
                  required
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Owner name
              </label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Mobile number
              </label>
              <div className="relative flex items-center">
                <Phone size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  required
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                City <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <div className="relative flex items-center">
                <MapPin size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  autoComplete="address-level2"
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-150"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 pt-0.5 shadow-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Setting up...</span>
                </>
              ) : (
                'Launch GymOS'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

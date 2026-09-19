'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeroSide from '@/components/auth/AuthHeroSide';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Incorrect email or password';
  if (message.includes('email not confirmed')) return 'Confirm your email address before signing in';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Check your connection and try again';
  return 'Unable to sign in right now. Please try again.';
}

export default function LoginPage() {
  const { login, loginWithGoogle, requestPasswordReset, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error_description') || params.get('error');
      if (err) {
        if (err === 'oauth_failed') {
          setError('Google authentication failed. Please try again or check your account permissions.');
        } else if (err === 'api_unreachable') {
          setError('Cannot connect to the backend server. Please ensure the API is running on port 4000.');
        } else {
          setError(decodeURIComponent(err));
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'member') window.sessionStorage.removeItem('gymos-pending-checkin');
      router.replace(user.role === 'member' ? '/member-app' : '/dashboard');
    }
  }, [authLoading, router, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setError(friendlyAuthError(loginError));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    setResetSent(false);
    if (!email.trim()) { setError('Enter your email address first'); return; }
    setLoading(true);
    try { await requestPasswordReset(email.trim()); setResetSent(true); }
    catch { setError('Unable to send the reset email. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

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
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="text-sm text-zinc-400 mt-1">Sign in to your GymOS account</p>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={loading || authLoading}
            className="w-full h-11 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-white text-sm font-medium flex items-center justify-center gap-3 transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-3 bg-black text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={resetPassword}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full h-11 pl-10 pr-10 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-white/40 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                {error}
              </div>
            )}
            {resetSent && (
              <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                Password reset email sent! Please check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 pt-0.5 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-white hover:text-blue-400 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

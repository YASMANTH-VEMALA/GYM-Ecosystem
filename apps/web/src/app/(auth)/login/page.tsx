'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Incorrect email or password';
  if (message.includes('email not confirmed')) return 'Confirm your email address before signing in';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Check your connection and try again';
  return 'Unable to sign in right now. Please try again.';
}

export default function LoginPage() {
  const { login, requestPasswordReset, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-[400px] card">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-card bg-primary text-white font-medium text-section-heading mb-4">G</div>
          <h1 className="text-page-title text-text-primary">GymOS</h1>
          <p className="text-body text-text-secondary mt-2">Sign in to your GymOS account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="input-label">Email address</label>
            <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="input" placeholder="owner@example.com" />
          </div>
          <div>
            <label htmlFor="login-password" className="input-label">Password</label>
            <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="input" placeholder="Enter your password" />
          </div>
          {error && <div className="bg-danger-bg text-danger text-caption px-4 py-3 rounded-btn border border-danger-border">{error}</div>}
          {resetSent && <div className="bg-green-50 text-green-700 text-caption px-4 py-3 rounded-btn border border-green-200">Password reset email sent. After opening it, use Settings → Account to choose a new password.</div>}
          <button type="submit" disabled={loading || authLoading} className="btn btn-primary w-full h-input">
            {loading ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Signing in...</> : 'Sign In'}
          </button>
          <button type="button" disabled={loading} onClick={resetPassword} className="w-full text-caption text-primary hover:underline">Forgot password?</button>
        </form>
      </div>
    </div>
  );
}

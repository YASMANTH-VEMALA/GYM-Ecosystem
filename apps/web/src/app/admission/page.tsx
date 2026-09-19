'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Building2, CheckCircle2, Dumbbell, Loader2, ShieldCheck, Gift } from 'lucide-react';
import apiClient from '@/lib/api-client';

type Branch = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

type AdmissionResult = { member: { id: string; memberCode: string; name: string }; branch: { id: string; name: string } };

const initialForm = {
  name: '', phone: '', email: '', password: '', confirmPassword: '', dateOfBirth: '', gender: '', emergencyPhone: '', bloodGroup: '', notes: '',
};

function apiError(error: unknown) {
  if (isAxiosError(error) && typeof error.response?.data?.error === 'string') return error.response.data.error;
  return 'Check your connection and try again.';
}

export default function AdmissionPage() {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [gymId, setGymId] = useState('');
  const [token, setToken] = useState('');
  const [refCode, setRefCode] = useState('');
  const [referralInfo, setReferralInfo] = useState<{
    referrerName: string;
    campaignName: string;
    reward?: string | null;
  } | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdmissionResult | null>(null);
  const accent = useMemo(() => branch?.primaryColor && /^#[0-9a-f]{6}$/i.test(branch.primaryColor) ? branch.primaryColor : '#E85D04', [branch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextGymId = params.get('gymId') ?? '';
    const nextToken = params.get('token') ?? '';
    const nextRef = (params.get('ref') ?? '').trim().toUpperCase();
    setGymId(nextGymId);
    setToken(nextToken);
    setRefCode(nextRef);

    if (nextRef) {
      apiClient.get<{
        branch: Branch;
        referrer: { name: string };
        campaign: { name: string; reward?: string | null };
        gymId: string;
      }>(`/admissions/referral/${encodeURIComponent(nextRef)}`)
        .then(({ data }) => {
          setBranch(data.branch);
          setGymId(data.gymId);
          setReferralInfo({
            referrerName: data.referrer.name,
            reward: data.campaign.reward,
            campaignName: data.campaign.name,
          });
        })
        .catch((requestError) => setError(apiError(requestError)))
        .finally(() => setLoadingBranch(false));
      return;
    }

    if (!nextGymId || !nextToken) {
      setLoadingBranch(false);
      setError('This admission link is incomplete. Please scan the branch QR or use your friend\'s referral link.');
      return;
    }

    apiClient.get<{ branch: Branch }>(`/admissions/${encodeURIComponent(nextGymId)}`, { params: { token: nextToken } })
      .then(({ data }) => setBranch(data.branch))
      .catch((requestError) => setError(apiError(requestError)))
      .finally(() => setLoadingBranch(false));
  }, []);

  const update = (name: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.email.trim()) { setError('Enter your email address to create your member login.'); return; }
    if (!form.password) { setError('Create a password for your member login.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(), phone: form.phone, email: form.email.trim().toLowerCase(),
        password: form.password, dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined, emergencyPhone: form.emergencyPhone || undefined,
        bloodGroup: form.bloodGroup || undefined, notes: form.notes.trim() || undefined,
      };
      const queryParams: Record<string, string> = {};
      if (token) queryParams.token = token;
      if (refCode) queryParams.ref = refCode;
      const { data } = await apiClient.post<AdmissionResult>(`/admissions/${encodeURIComponent(gymId)}`, payload, { params: queryParams });
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBranch) return <AdmissionShell accent="#E85D04"><div className="space-y-4"><div className="h-20 rounded-xl bg-gray-100 animate-pulse" /><div className="h-96 rounded-xl bg-gray-100 animate-pulse" /></div></AdmissionShell>;
  if (!branch) return <AdmissionShell accent={accent}><div className="py-16 text-center"><Building2 className="mx-auto text-text-muted" size={42} /><h1 className="mt-4 text-xl font-medium">Admission link unavailable</h1><p className="mx-auto mt-2 max-w-sm text-body text-text-secondary">{error || 'Ask the branch team for a new QR code.'}</p></div></AdmissionShell>;
  if (result) return <AdmissionShell accent={accent}><div className="py-12 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-green-50 text-success"><CheckCircle2 size={34} /></div><p className="mt-5 text-caption text-text-secondary">ADMISSION COMPLETE</p><h1 className="mt-2 text-2xl font-medium">Welcome, {result.member.name}</h1><p className="mt-2 text-body text-text-secondary">You have been added to {result.branch.name}.</p><div className="mx-auto mt-6 max-w-xs rounded-card bg-stat-card p-5"><p className="text-caption text-text-secondary">Your member code</p><p className="mt-2 font-mono text-2xl font-medium tracking-wider">{result.member.memberCode}</p></div><a href="/login" className="mt-6 inline-flex h-12 items-center justify-center rounded-btn px-6 text-white" style={{ backgroundColor: accent }}>Open member app</a><p className="mx-auto mt-5 max-w-sm text-caption text-text-muted">Sign in with your email and password. You will stay signed in on this device until you choose Sign out.</p></div></AdmissionShell>;

  return <AdmissionShell accent={accent}>
    <header className="mb-7 flex items-center gap-3 border-b border-divider pb-6">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-white" style={{ backgroundColor: accent }}>{branch.logoUrl ? <img src={branch.logoUrl} alt="" className="h-full w-full object-cover" /> : <Dumbbell size={22} />}</div>
      <div><p className="text-caption text-text-secondary">New member admission</p><h1 className="text-xl font-medium">{branch.name}</h1><p className="text-caption text-text-muted">{[branch.address, branch.city].filter(Boolean).join(', ')}</p></div>
    </header>

    {referralInfo && (
      <div className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 flex items-start sm:items-center gap-3.5 shadow-xs">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
          <Gift size={20} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-950">
            Referred by {referralInfo.referrerName}
          </p>
          {referralInfo.reward ? (
            <p className="text-xs text-emerald-800 mt-0.5 font-medium">
              🎁 Welcome reward: <span className="font-semibold">{referralInfo.reward}</span>
            </p>
          ) : (
            <p className="text-xs text-emerald-700 mt-0.5">
              Welcome to {branch.name}! Sign up below to join with your friend&apos;s referral.
            </p>
          )}
        </div>
      </div>
    )}
    <form onSubmit={submit} className="space-y-6">
      <div><h2 className="text-section-heading">Personal details</h2><p className="mt-1 text-caption text-text-muted">Fields marked * are required.</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name *"><input className="input" required minLength={2} maxLength={200} autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
        <Field label="Mobile number *"><input className="input font-mono" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel" placeholder="10-digit number" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></Field>
        <Field label="Date of birth"><input className="input" type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></Field>
        <Field label="Gender"><select className="input" value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
        <Field label="Blood group"><select className="input" value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)}><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Emergency mobile"><input className="input font-mono" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit number" value={form.emergencyPhone} onChange={(e) => update('emergencyPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></Field>
      </div>
      <div className="border-t border-divider pt-6"><h2 className="text-section-heading">Member app access</h2><p className="mt-1 text-caption text-text-muted">Your email and password are required to sign in, mark QR attendance, and stay connected to your gym.</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email address *"><input className="input" required type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></Field>
        <div className="hidden sm:block" />
        <Field label="Create password *"><input className="input" required type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={(e) => update('password', e.target.value)} /></Field>
        <Field label="Confirm password *"><input className="input" required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} /></Field>
      </div>
      <Field label="Health notes or anything the branch should know"><textarea className="input h-auto resize-none py-3" rows={3} maxLength={1000} value={form.notes} onChange={(e) => update('notes', e.target.value)} /></Field>
      {error && <div role="alert" className="rounded-btn border border-danger-border bg-danger-bg px-4 py-3 text-caption text-danger">{error}</div>}
      <button type="submit" disabled={submitting} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-medium text-white active:scale-[0.98] disabled:opacity-40" style={{ backgroundColor: accent }}>{submitting ? <><Loader2 size={19} className="animate-spin" /> Submitting…</> : 'Complete admission'}</button>
      <p className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-text-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0" /> Your details are sent securely to this branch only.</p>
    </form>
  </AdmissionShell>;
}

function AdmissionShell({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <main className="min-h-screen bg-[#F9F9F8] px-4 py-6 sm:py-10" style={{ '--color-primary': accent } as React.CSSProperties}><div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-5 sm:p-8">{children}</div><p className="mt-5 text-center text-xs text-text-muted">Powered by GymOS</p></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="input-label">{label}</span>{children}</label>;
}

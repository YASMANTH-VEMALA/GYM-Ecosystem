'use client';

import { useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Building2, Download, KeyRound, Palette, QrCode, RefreshCw, Save, UserCog } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useGymConfig } from '@/lib/gym-config-store';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/providers/auth-provider';
import { LogoUpload } from '@/components/branding/LogoUpload';

type Section = 'profile' | 'branding' | 'checkin' | 'account';
const colors = ['#E85D04', '#2563EB', '#16A34A', '#DC2626', '#0891B2', '#D97706', '#111827', '#059669'];

export default function SettingsPage() {
  const { config, updateConfig, saveConfig, resetConfig, isDirty, isLoading } = useGymConfig();
  const { toast } = useToast();
  const { changePassword, user } = useAuth();
  const [section, setSection] = useState<Section>('profile');
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const qr = useQuery({
    queryKey: ['gym', 'qr'],
    enabled: section === 'checkin',
    queryFn: async () => {
      const { data } = await apiClient.get<{ qrData: string }>('/gym/qr');
      let qrUrl = data.qrData;
      // Ensure QR encodes the live domain, not localhost
      try {
        const parsed = new URL(qrUrl);
        if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
          if (parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1')) {
            qrUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
          }
        }
      } catch { /* ignore */ }
      return QRCode.toDataURL(qrUrl, { width: 440, margin: 2, errorCorrectionLevel: 'M' });
    },
  });
  const organization = useQuery({
    queryKey: ['organization', 'branding'],
    enabled: user?.role === 'gym_owner' && section === 'branding',
    queryFn: () => apiClient.get<{ organization: { id: string; name: string; logoUrl: string | null } }>('/organization').then((response) => response.data.organization),
  });
  const save = async () => {
    setSaving(true);
    try { await saveConfig(); toast('success', 'Settings saved to the database'); }
    catch { toast('error', 'Could not save settings'); }
    finally { setSaving(false); }
  };
  const downloadQr = () => {
    if (!qr.data) return;
    const link = document.createElement('a'); link.href = qr.data; link.download = `${config.gymName.replace(/\s+/g, '-')}-checkin-qr.png`; link.click();
  };
  const regenerateQr = async () => {
    if (!window.confirm('Regenerate this QR? Every previously printed QR will stop working.')) return;
    setRegenerating(true);
    try { await apiClient.post('/gym/qr/regenerate'); await qr.refetch(); toast('success', 'QR regenerated; replace old printed copies'); }
    catch { toast('error', 'Could not regenerate QR'); }
    finally { setRegenerating(false); }
  };
  const updatePassword = async () => {
    if (password.length < 12) { toast('error', 'Use at least 12 characters'); return; }
    setPasswordSaving(true);
    try { await changePassword(password); setPassword(''); toast('success', 'Password updated'); }
    catch { toast('error', 'Could not update password'); }
    finally { setPasswordSaving(false); }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 rounded-card bg-gray-100 animate-pulse" />)}</div>;
  return <div className="space-y-8">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"><div><h1 className="text-page-title">Settings</h1><p className="text-body text-text-secondary mt-2">Manage persisted gym profile and branding</p></div><div className="flex gap-3"><button className="btn btn-secondary" disabled={!isDirty} onClick={resetConfig}>Discard</button><button className="btn btn-primary" disabled={!isDirty || saving} onClick={save}><Save size={16} /> {saving ? 'Saving...' : 'Save changes'}</button></div></div>
    <div className="flex flex-wrap gap-2">{([{ key: 'profile', label: 'Gym Profile', icon: Building2 }, { key: 'branding', label: 'Branding', icon: Palette }, { key: 'checkin', label: 'Check-in QR', icon: QrCode }, { key: 'account', label: 'Account', icon: KeyRound }] as const).map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setSection(key)} className={`filter-chip ${section === key ? 'active' : ''}`}><Icon size={14} /> {label}</button>)}<Link href="/staff" className="filter-chip"><UserCog size={14} /> Staff Accounts</Link></div>

    {section === 'profile' && <div className="card max-w-4xl"><h2 className="text-section-heading mb-6">Gym Information</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Gym name" value={config.gymName} onChange={(value) => updateConfig({ gymName: value })} />
      <Field label="Owner name" value={config.ownerName} onChange={(value) => updateConfig({ ownerName: value })} />
      <Field label="Owner phone" value={config.phone} onChange={(value) => updateConfig({ phone: value.replace(/\D/g, '').slice(0, 10) })} />
      <Field label="Owner email" type="email" value={config.email} onChange={(value) => updateConfig({ email: value })} />
      <Field label="City" value={config.city} onChange={(value) => updateConfig({ city: value })} />
      <div className="md:col-span-2"><label className="input-label">Address</label><textarea className="input h-auto py-3" rows={3} value={config.address} onChange={(event) => updateConfig({ address: event.target.value })} /></div>
    </div></div>}

    {section === 'branding' && <div className="card max-w-4xl space-y-8"><div><h2 className="text-section-heading">Logos</h2><p className="text-caption text-text-muted mt-1">The branch logo overrides the company logo for members and public admission.</p></div>{organization.isLoading ? <div className="h-32 rounded-card bg-gray-100 animate-pulse" /> : organization.data && <LogoUpload label="Company logo" description={`Used across ${organization.data.name} whenever a branch has no custom logo.`} value={organization.data.logoUrl} scope="organization" onUploaded={(logoUrl) => { updateConfig({ companyLogoUrl: logoUrl }); void organization.refetch(); }} onRemove={async () => { await apiClient.patch('/organization', { logoUrl: null }); updateConfig({ companyLogoUrl: null }); await organization.refetch(); }} />}<LogoUpload label={`${config.gymName} branch logo`} description="Optional logo used only for this branch." value={config.logoUrl} fallbackUrl={organization.data?.logoUrl} scope="branch" branchId={config.branchId} onUploaded={(logoUrl) => updateConfig({ logoUrl })} onRemove={async () => { await apiClient.put('/gym', { logoUrl: null }); updateConfig({ logoUrl: null }); }} /><div className="border-t border-divider pt-8"><h2 className="text-section-heading">Brand Colour</h2><p className="text-caption text-text-muted mt-1 mb-5">Saved branding is applied across this branch.</p><div className="flex flex-wrap gap-3">{colors.map((color) => <button key={color} aria-label={`Use ${color}`} onClick={() => updateConfig({ primaryColor: color })} className={`w-11 h-11 rounded-xl border-4 ${config.primaryColor === color ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div><div className="mt-6"><label className="input-label">Custom HEX colour</label><input className="input max-w-xs font-mono" type="color" value={config.primaryColor} onChange={(event) => updateConfig({ primaryColor: event.target.value })} /></div><div className="mt-8 flex items-center gap-3 rounded-card p-5 text-white" style={{ backgroundColor: config.primaryColor }}>{config.logoUrl || organization.data?.logoUrl ? <img src={config.logoUrl ?? organization.data?.logoUrl ?? ''} alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1" /> : null}<div><p className="text-caption opacity-80">Preview</p><p className="text-xl font-medium mt-1">{config.gymName}</p></div></div></div></div>}

    {section === 'checkin' && <div className="card max-w-xl text-center"><h2 className="text-section-heading">Gym Check-in QR</h2><p className="text-caption text-text-muted mt-1 mb-6">Members scan this signed link with their phone camera to open the member app and check in.</p>{qr.isLoading ? <div className="w-72 h-72 bg-gray-100 animate-pulse rounded-card mx-auto" /> : qr.isError ? <div className="empty-state"><p className="empty-state-title">Could not generate QR</p><button className="btn btn-primary" onClick={() => qr.refetch()}>Retry</button></div> : qr.data && <><img src={qr.data} alt="Gym check-in QR" className="w-72 h-72 mx-auto" /><div className="mt-5 flex justify-center gap-3"><button className="btn btn-primary" onClick={downloadQr}><Download size={16} /> Download QR</button><button className="btn btn-secondary" disabled={regenerating} onClick={regenerateQr}><RefreshCw size={16} /> {regenerating ? 'Regenerating...' : 'Regenerate'}</button></div></>}</div>}
    {section === 'account' && <div className="card max-w-xl"><h2 className="text-section-heading">Account Password</h2><p className="text-caption text-text-muted mt-1 mb-5">Replace the temporary password after your first login.</p><label className="input-label">New password</label><input className="input" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /><button className="btn btn-primary mt-4" disabled={passwordSaving || password.length < 12} onClick={updatePassword}><KeyRound size={16} /> {passwordSaving ? 'Updating...' : 'Update password'}</button></div>}
  </div>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><label className="input-label">{label}</label><input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

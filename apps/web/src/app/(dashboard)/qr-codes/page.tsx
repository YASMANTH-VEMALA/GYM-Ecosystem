'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Clipboard, Download, QrCode, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useGymConfig } from '@/lib/gym-config-store';
import { useToast } from '@/components/ui/toast';

type QrResponse = { attendanceQrData: string; admissionQrData: string };

export default function BranchQrCodesPage() {
  const { user } = useAuth();
  const { config } = useGymConfig();
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState(false);
  const query = useQuery({
    queryKey: ['gym', 'branch-qr-codes'],
    queryFn: async () => {
      const { data } = await apiClient.get<QrResponse>('/gym/qr');
      const [attendanceImage, admissionImage] = await Promise.all([
        QRCode.toDataURL(data.attendanceQrData, { width: 560, margin: 2, errorCorrectionLevel: 'M' }),
        QRCode.toDataURL(data.admissionQrData, { width: 560, margin: 2, errorCorrectionLevel: 'M' }),
      ]);
      return { ...data, attendanceImage, admissionImage };
    },
  });

  const cards = useMemo(() => query.data ? [
    { key: 'admission', title: 'Admission QR', description: 'New members scan, enter their details, and are added directly to this branch.', icon: UserPlus, image: query.data.admissionImage, url: query.data.admissionQrData },
    { key: 'attendance', title: 'Attendance QR', description: 'Existing members scan, sign in if needed, and confirm today’s attendance.', icon: QrCode, image: query.data.attendanceImage, url: query.data.attendanceQrData },
  ] : [], [query.data]);

  const download = (image: string, key: string) => {
    const link = document.createElement('a');
    link.href = image;
    link.download = `${config.gymName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${key}-qr.png`;
    link.click();
  };
  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast('success', 'Secure link copied');
  };
  const regenerate = async () => {
    if (!window.confirm('Replace both QR codes? All previously printed admission and attendance codes will stop working.')) return;
    setRegenerating(true);
    try { await apiClient.post('/gym/qr/regenerate'); await query.refetch(); toast('success', 'Both QR codes were replaced'); }
    catch { toast('error', 'Could not replace QR codes'); }
    finally { setRegenerating(false); }
  };

  return <div className="space-y-8">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h1 className="text-page-title">Branch QR Codes</h1><p className="mt-2 text-body text-text-secondary">Admission and attendance links for {config.gymName}</p></div>{user?.role === 'gym_owner' && <button className="btn btn-secondary" disabled={regenerating} onClick={regenerate}><RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} /> Replace both codes</button>}</div>
    <div className="flex items-start gap-3 rounded-card border border-blue-100 bg-blue-50 p-4 text-blue-900"><ShieldCheck className="mt-0.5 shrink-0" size={18} /><p className="text-caption leading-5">Each QR is signed for this branch. Managers can display and download them. Only an owner can replace compromised codes.</p></div>
    {query.isLoading ? <div className="grid gap-6 lg:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-[520px] rounded-card bg-gray-100 animate-pulse" />)}</div> : query.isError ? <div className="card empty-state"><QrCode className="empty-state-icon" /><p className="empty-state-title">Could not load QR codes</p><p className="empty-state-description">Check your connection and try again.</p><button className="btn btn-primary" onClick={() => query.refetch()}>Retry</button></div> : <div className="grid gap-6 lg:grid-cols-2">{cards.map(({ key, title, description, icon: Icon, image, url }) => <section key={key} className="card"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stat-card text-primary"><Icon size={19} /></div><div><h2 className="text-section-heading">{title}</h2><p className="mt-1 text-caption leading-5 text-text-secondary">{description}</p></div></div><div className="mx-auto mt-6 w-full max-w-[320px] rounded-card border border-border bg-white p-4"><img src={image} alt={`${title} for ${config.gymName}`} className="h-auto w-full" /></div><p className="mt-4 truncate rounded-btn bg-stat-card px-3 py-2 font-mono text-[11px] text-text-muted">{url}</p><div className="mt-4 flex flex-wrap gap-3"><button className="btn btn-primary" onClick={() => download(image, key)}><Download size={16} /> Download PNG</button><button className="btn btn-secondary" onClick={() => void copy(url)}><Clipboard size={16} /> Copy link</button></div></section>)}</div>}
  </div>;
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Dumbbell, LogIn, UserRound, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { useGymConfig } from '@/lib/gym-config-store';

type CheckIn = { id: string; checkedInAt: string; source: string; member: { memberCode: string; user: { name: string; avatarUrl: string | null } } };

export default function KioskPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { config } = useGymConfig();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [memberCode, setMemberCode] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string; name?: string } | null>(null);
  useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [authLoading, router, user]);
  const today = useQuery({ queryKey: ['checkins', 'today'], enabled: Boolean(user), refetchInterval: 15000, queryFn: () => apiClient.get<{ checkIns: CheckIn[] }>('/checkins/today').then((response) => response.data.checkIns) });
  const checkIn = useMutation({
    mutationFn: () => apiClient.post('/checkins', { memberCode: memberCode.trim() }),
    onSuccess: async ({ data }) => { setResult({ ok: true, message: 'Check-in successful', name: data.member?.user?.name ?? data.memberName }); setMemberCode(''); await queryClient.invalidateQueries({ queryKey: ['checkins', 'today'] }); },
    onError: (error: any) => setResult({ ok: false, message: error.response?.data?.error ?? 'Unable to check in' }),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); setResult(null); if (memberCode.trim()) checkIn.mutate(); };

  if (authLoading || !user) return <main className="min-h-screen bg-[#0A0A0A] p-8"><div className="max-w-5xl mx-auto h-32 rounded-2xl bg-white/5 animate-pulse" /></main>;
  return <main className="min-h-screen bg-[#0A0A0A] text-white p-5 md:p-10">
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.primaryColor }}><Dumbbell size={24} /></div><div><h1 className="text-2xl font-medium">{config.gymName}</h1><p className="text-sm text-white/40">Reception check-in terminal</p></div></div><div className="text-right"><p className="text-3xl font-mono">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs text-white/40">Live attendance</p></div></header>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-8"><p className="text-sm text-white/50">Enter member code</p><form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-3"><input autoFocus className="flex-1 h-16 px-5 rounded-xl bg-white/[0.06] border border-white/10 text-2xl font-mono outline-none focus:border-white/30" value={memberCode} onChange={(event) => setMemberCode(event.target.value.toUpperCase())} placeholder="GYM-0001" /><button disabled={!memberCode.trim() || checkIn.isPending} className="h-16 px-7 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-40" style={{ backgroundColor: config.primaryColor }}><LogIn size={20} /> {checkIn.isPending ? 'Checking...' : 'Check in'}</button></form>{result && <div className={`mt-6 p-5 rounded-xl border flex items-center gap-3 ${result.ok ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{result.ok ? <CheckCircle2 /> : <XCircle />}<div><p className="font-medium">{result.message}</p>{result.name && <p className="text-sm opacity-70">Welcome, {result.name}</p>}</div></div>}</section>
        <aside className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"><div className="p-5 border-b border-white/10 flex justify-between"><h2 className="font-medium">Today</h2><span className="text-sm text-white/40">{today.data?.length ?? 0} check-ins</span></div>{today.isLoading ? <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div> : today.data?.length ? <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">{today.data.map((item) => <div key={item.id} className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><UserRound size={18} /></div><div className="flex-1"><p className="text-sm font-medium">{item.member.user.name}</p><p className="text-xs text-white/40 font-mono">{item.member.memberCode}</p></div><span className="text-xs text-white/40 flex items-center gap-1"><Clock size={11} />{new Date(item.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>)}</div> : <div className="p-12 text-center text-white/40"><UserRound className="mx-auto mb-3" /><p>No check-ins yet</p></div>}</aside>
      </div>
    </div>
  </main>;
}

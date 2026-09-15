'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarCheck, CreditCard, LineChart, Mail, User } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

type Tab = 'overview' | 'attendance' | 'progress' | 'payments' | 'notifications';
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const money = (value: number | string) => `₹${Number(value).toLocaleString('en-IN')}`;

export default function MemberProfilePage() {
  const memberId = String(useParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [weight, setWeight] = useState('');
  const profile = useQuery({ queryKey: ['member', memberId], queryFn: () => apiClient.get(`/members/${memberId}`).then((response) => response.data) });
  const attendance = useQuery({ queryKey: ['member', memberId, 'attendance'], enabled: tab === 'attendance', queryFn: () => apiClient.get(`/members/${memberId}/attendance`, { params: { limit: 100 } }).then((response) => response.data) });
  const progress = useQuery({ queryKey: ['member', memberId, 'progress'], enabled: tab === 'progress', queryFn: () => apiClient.get(`/bodystats/${memberId}`, { params: { limit: 100 } }).then((response) => response.data) });
  const payments = useQuery({ queryKey: ['member', memberId, 'payments'], enabled: tab === 'payments', queryFn: () => apiClient.get('/payments', { params: { memberId, limit: 100 } }).then((response) => response.data) });
  const notifications = useQuery({ queryKey: ['member', memberId, 'notifications'], enabled: tab === 'notifications', queryFn: () => apiClient.get('/notifications', { params: { memberId, limit: 100 } }).then((response) => response.data) });
  const addWeight = useMutation({
    mutationFn: () => apiClient.post(`/bodystats/${memberId}`, { weightKg: Number(weight) }),
    onSuccess: async () => { setWeight(''); await queryClient.invalidateQueries({ queryKey: ['member', memberId, 'progress'] }); },
  });

  if (profile.isLoading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, index) => <div className="h-20 rounded-card bg-gray-100 animate-pulse" key={index} />)}</div>;
  if (profile.isError || !profile.data?.member) return <div className="card empty-state"><p className="empty-state-title">Member not found</p><Link href="/members" className="btn btn-primary">Back to members</Link></div>;
  const { member, activeSubscription, lastCheckIn, totalVisits } = profile.data;

  const tabs: Array<{ key: Tab; label: string; icon: typeof User }> = [
    { key: 'overview', label: 'Overview', icon: User }, { key: 'attendance', label: 'Attendance', icon: CalendarCheck }, { key: 'progress', label: 'Progress', icon: LineChart }, { key: 'payments', label: 'Payments', icon: CreditCard }, { key: 'notifications', label: 'Emails', icon: Mail },
  ];
  const loadingRows = <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 rounded bg-gray-100 animate-pulse" />)}</div>;

  return <div className="space-y-8">
    <div><Link href="/members" className="text-caption text-text-secondary flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Members</Link><div className="flex items-center gap-4"><div className="avatar w-14 h-14 text-xl">{member.user.name[0]}</div><div><h1 className="text-page-title">{member.user.name}</h1><p className="text-body text-text-secondary mt-1">{member.memberCode} · {member.user.phone}</p></div></div></div>
    <div className="flex gap-2 overflow-x-auto">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`filter-chip ${tab === key ? 'active' : ''}`}><Icon size={13} /> {label}</button>)}</div>

    {tab === 'overview' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-between-cards"><div className="lg:col-span-2 card"><h2 className="text-section-heading mb-5">Member Information</h2><dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">{[['Email', member.user.email ?? '—'], ['Joined', formatDate(member.joinedAt)], ['Gender', member.gender ?? '—'], ['Date of birth', formatDate(member.dateOfBirth)], ['Emergency phone', member.emergencyPhone ?? '—'], ['Blood group', member.bloodGroup ?? '—']].map(([label, value]) => <div key={label}><dt className="text-caption text-text-muted">{label}</dt><dd className="text-body text-text-primary mt-1">{value}</dd></div>)}</dl>{member.notes && <div className="mt-6"><p className="text-caption text-text-muted">Notes</p><p className="text-body mt-1">{member.notes}</p></div>}</div><div className="space-y-between-cards"><div className="stat-card"><p className="stat-card-label">Current plan</p><p className="text-section-heading mt-2">{activeSubscription?.plan?.name ?? 'No active plan'}</p><p className="text-caption text-text-muted mt-2">Ends {formatDate(activeSubscription?.endDate)}</p></div><div className="grid grid-cols-2 gap-3"><div className="stat-card"><p className="stat-card-value">{totalVisits}</p><p className="stat-card-label mt-1">Total visits</p></div><div className="stat-card"><p className="text-body font-medium">{formatDate(lastCheckIn)}</p><p className="stat-card-label mt-1">Last visit</p></div></div></div></div>}

    {tab === 'attendance' && <div className="card"><h2 className="text-section-heading mb-5">Attendance History</h2>{attendance.isLoading ? loadingRows : (attendance.data?.checkIns ?? []).length === 0 ? <div className="empty-state"><CalendarCheck className="empty-state-icon" /><p className="empty-state-title">No check-ins yet</p></div> : <div className="divide-y divide-divider">{attendance.data.checkIns.map((item: any) => <div className="py-4 flex justify-between" key={item.time}><span>{formatDate(item.time)}</span><span className="badge badge-active">{item.source}</span></div>)}</div>}</div>}

    {tab === 'progress' && <div className="space-y-4"><div className="card"><h2 className="text-section-heading mb-4">Record Weight</h2><div className="flex gap-3"><input className="input" type="number" min="20" max="400" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Weight in kg" /><button className="btn btn-primary" disabled={!weight || addWeight.isPending} onClick={() => addWeight.mutate()}>Save</button></div></div><div className="card"><h2 className="text-section-heading mb-5">Body Statistics</h2>{progress.isLoading ? loadingRows : (progress.data?.stats ?? []).length === 0 ? <div className="empty-state"><LineChart className="empty-state-icon" /><p className="empty-state-title">No progress recorded</p></div> : <div className="divide-y divide-divider">{progress.data.stats.map((item: any) => <div key={item.id} className="py-4 grid grid-cols-3"><span>{formatDate(item.recordedAt)}</span><span>{item.weightKg ? `${item.weightKg} kg` : '—'}</span><span>{item.bodyFatPct ? `${item.bodyFatPct}% body fat` : '—'}</span></div>)}</div>}</div></div>}

    {tab === 'payments' && <div className="card"><h2 className="text-section-heading mb-5">Payment History</h2>{payments.isLoading ? loadingRows : (payments.data?.payments ?? []).length === 0 ? <div className="empty-state"><CreditCard className="empty-state-icon" /><p className="empty-state-title">No payments yet</p></div> : <div className="divide-y divide-divider">{payments.data.payments.map((item: any) => <div key={item.id} className="py-4 flex justify-between"><div><p className="font-medium">{money(item.totalAmount)}</p><p className="text-caption text-text-muted">{item.invoiceNumber}</p></div><div className="text-right"><span className="badge badge-paid">{item.paymentMethod}</span><p className="text-caption text-text-muted mt-1">{formatDate(item.paidAt)}</p></div></div>)}</div>}</div>}

    {tab === 'notifications' && <div className="card"><h2 className="text-section-heading mb-5">Email History</h2>{notifications.isLoading ? loadingRows : (notifications.data?.notifications ?? []).length === 0 ? <div className="empty-state"><Mail className="empty-state-icon" /><p className="empty-state-title">No emails yet</p></div> : <div className="divide-y divide-divider">{notifications.data.notifications.map((item: any) => <div key={item.id} className="py-4"><div className="flex justify-between"><p className="font-medium">{item.title}</p><span className={`badge ${item.status === 'delivered' ? 'badge-active' : 'badge-overdue'}`}>{item.status}</span></div><p className="text-caption text-text-secondary mt-1">{item.body}</p><p className="text-caption text-text-muted mt-1">{formatDate(item.sentAt ?? item.createdAt)}</p></div>)}</div>}</div>}
  </div>;
}

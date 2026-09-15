'use client';

import Link from 'next/link';
import { ArrowUpRight, CalendarCheck, CreditCard, Mail, UserPlus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiClient from '@/lib/api-client';

type Overview = {
  stats: { totalMembers: number; activeMembers: number; newMembersThisMonth: number; todayCheckIns: number; revenueThisMonth: number; overdueMembers: number; expiringSoonMembers: number };
  recentCheckIns: Array<{ id: string; checkedInAt: string; source: string; member: { id: string; name: string; memberCode: string } }>;
  recentMembers: Array<{ id: string; name: string; memberCode: string; joinedAt: string; planName: string | null; subscriptionEndDate: string | null }>;
};
type Growth = { month: string; newMembers: number; totalMembers: number };
type PlanPopularity = { planId: string; planName: string; count: number; revenue: number };

const colors = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#9333EA'];
const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const date = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DashboardPage() {
  const overview = useQuery({ queryKey: ['dashboard'], queryFn: () => apiClient.get<Overview>('/analytics/dashboard').then((response) => response.data) });
  const growth = useQuery({ queryKey: ['analytics', 'growth'], queryFn: () => apiClient.get<{ monthly: Growth[] }>('/analytics/member-growth', { params: { months: 6 } }).then((response) => response.data.monthly) });
  const plans = useQuery({ queryKey: ['analytics', 'plans'], queryFn: () => apiClient.get<{ plans: PlanPopularity[] }>('/analytics/plan-popularity').then((response) => response.data.plans) });

  if (overview.isLoading) return <div className="space-y-6">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-card bg-gray-100 animate-pulse" />)}</div>;
  if (overview.isError || !overview.data) return <div className="card empty-state"><p className="empty-state-title">Dashboard could not be loaded</p><button onClick={() => overview.refetch()} className="btn btn-primary">Retry</button></div>;

  const stats = overview.data.stats;
  return <div className="space-y-8">
    <div><h1 className="text-page-title">Dashboard</h1><p className="text-body text-text-secondary mt-2">Live data · {date(new Date().toISOString())}</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-between-cards">
      {[
        { label: 'Active Members', value: stats.activeMembers, caption: `${stats.totalMembers} total`, Icon: Users, color: 'text-blue-500' },
        { label: 'Monthly Revenue', value: money(stats.revenueThisMonth), caption: 'Collected this month', Icon: CreditCard, color: 'text-emerald-500' },
        { label: 'Today Check-ins', value: stats.todayCheckIns, caption: 'Live attendance', Icon: CalendarCheck, color: 'text-amber-500' },
        { label: 'New This Month', value: stats.newMembersThisMonth, caption: 'New registrations', Icon: UserPlus, color: 'text-cyan-600' },
      ].map(({ label, value, caption, Icon, color }) => <div className="stat-card" key={label}><div className="flex justify-between"><span className="stat-card-label">{label}</span><Icon size={18} className={color} /></div><p className="stat-card-value mt-3 font-mono">{value}</p><p className="text-caption text-text-muted mt-2">{caption}</p></div>)}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
      <div className="xl:col-span-2 card"><h2 className="text-section-heading">Member Growth</h2><p className="text-caption text-text-muted mt-1 mb-5">Last six months</p><div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={growth.data ?? []}><CartesianGrid stroke="#F3F4F6" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="totalMembers" fill="#2563EB" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="card"><h2 className="text-section-heading">Plan Distribution</h2><p className="text-caption text-text-muted mt-1">Active subscriptions</p><div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={plans.data ?? []} dataKey="count" nameKey="planName" innerRadius={45} outerRadius={75} stroke="none">{(plans.data ?? []).map((plan, index) => <Cell key={plan.planId} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-2">{(plans.data ?? []).map((plan, index) => <div key={plan.planId} className="flex justify-between text-table-row"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{plan.planName}</span><span className="font-mono">{plan.count}</span></div>)}</div></div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
      <div className="xl:col-span-2 card p-0 overflow-hidden"><div className="px-card-pad py-4 border-b border-divider"><h2 className="text-section-heading">Recent Check-ins</h2></div>{overview.data.recentCheckIns.length === 0 ? <div className="empty-state py-12"><CalendarCheck className="empty-state-icon" /><p className="empty-state-title">No check-ins today</p></div> : <div className="divide-y divide-divider">{overview.data.recentCheckIns.map((item) => <div key={item.id} className="px-card-pad py-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="avatar">{item.member.name[0]}</div><div><Link href={`/members/${item.member.id}`} className="text-body font-medium">{item.member.name}</Link><p className="text-caption text-text-muted font-mono">{item.member.memberCode}</p></div></div><div className="text-right"><span className="badge badge-active">{item.source}</span><p className="text-caption text-text-muted mt-1">{new Date(item.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p></div></div>)}</div>}</div>
      <div className="space-y-between-cards"><div className="card"><h2 className="text-section-heading mb-4">Quick Actions</h2><div className="space-y-2">{[[`/members/new`, 'Add member', UserPlus], ['/payments/collect', 'Collect fee', CreditCard], ['/notifications', 'Send email', Mail]].map(([href, label, Icon]) => <Link key={String(href)} href={String(href)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stat-card"><Icon size={18} className="text-primary" /><span className="text-body font-medium">{String(label)}</span><ArrowUpRight size={14} className="ml-auto text-text-muted" /></Link>)}</div></div><div className="card"><h2 className="text-section-heading">Attention Needed</h2><div className="grid grid-cols-2 gap-3 mt-4"><Link href="/fees" className="stat-card"><p className="text-2xl text-danger font-mono">{stats.overdueMembers}</p><p className="text-caption text-text-muted">Overdue</p></Link><Link href="/members" className="stat-card"><p className="text-2xl text-warning font-mono">{stats.expiringSoonMembers}</p><p className="text-caption text-text-muted">Expiring</p></Link></div></div></div>
    </div>
  </div>;
}

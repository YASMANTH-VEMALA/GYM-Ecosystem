'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpRight, CalendarCheck, CreditCard, Mail, UserPlus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { Growth, PlanPopularity } from '@/components/dashboard/DashboardCharts';

// Dynamically import heavy Recharts bundle to cut initial page weight and boost INP/LCP
const DashboardCharts = dynamic(() => import('@/components/dashboard/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
      <div className="xl:col-span-2 card h-[340px] animate-pulse bg-neutral-100 dark:bg-neutral-800/40 rounded-card" />
      <div className="card h-[340px] animate-pulse bg-neutral-100 dark:bg-neutral-800/40 rounded-card" />
    </div>
  ),
});

type Overview = {
  stats: {
    totalMembers: number;
    activeMembers: number;
    newMembersThisMonth: number;
    todayCheckIns: number;
    revenueThisMonth: number;
    overdueMembers: number;
    expiringSoonMembers: number;
  };
  recentCheckIns: Array<{
    id: string;
    checkedInAt: string;
    source: string;
    member: { id: string; name: string; memberCode: string };
  }>;
  recentMembers: Array<{
    id: string;
    name: string;
    memberCode: string;
    joinedAt: string;
    planName: string | null;
    subscriptionEndDate: string | null;
  }>;
};

const colors = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#9333EA'];
const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const date = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-800 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-between-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card h-28 bg-card border border-border" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
        <div className="xl:col-span-2 card h-[340px] bg-card border border-border" />
        <div className="card h-[340px] bg-card border border-border" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
        <div className="xl:col-span-2 card h-64 bg-card border border-border" />
        <div className="card h-64 bg-card border border-border" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const overview = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get<Overview>('/analytics/dashboard').then((res) => res.data),
  });

  const growth = useQuery({
    queryKey: ['analytics', 'growth'],
    queryFn: () =>
      apiClient
        .get<{ monthly: Growth[] }>('/analytics/member-growth', { params: { months: 6 } })
        .then((res) => res.data.monthly),
  });

  const plans = useQuery({
    queryKey: ['analytics', 'plans'],
    queryFn: () =>
      apiClient
        .get<{ plans: PlanPopularity[] }>('/analytics/plan-popularity')
        .then((res) => res.data.plans),
  });

  if (overview.isLoading) {
    return <DashboardSkeleton />;
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="card empty-state">
        <p className="empty-state-title">Dashboard could not be loaded</p>
        <button onClick={() => overview.refetch()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const stats = overview.data.stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title">Dashboard</h1>
        <p className="text-body text-text-secondary mt-2">
          Live data · {date(new Date().toISOString())}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-between-cards">
        {[
          {
            label: 'Active Members',
            value: stats.activeMembers,
            caption: `${stats.totalMembers} total`,
            Icon: Users,
            color: 'text-blue-500',
          },
          {
            label: 'Monthly Revenue',
            value: money(stats.revenueThisMonth),
            caption: 'Collected this month',
            Icon: CreditCard,
            color: 'text-emerald-500',
          },
          {
            label: 'Today Check-ins',
            value: stats.todayCheckIns,
            caption: 'Live attendance',
            Icon: CalendarCheck,
            color: 'text-amber-500',
          },
          {
            label: 'New This Month',
            value: stats.newMembersThisMonth,
            caption: 'New registrations',
            Icon: UserPlus,
            color: 'text-cyan-600',
          },
        ].map(({ label, value, caption, Icon, color }) => (
          <div className="stat-card" key={label}>
            <div className="flex justify-between">
              <span className="stat-card-label">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <p className="stat-card-value mt-3 font-mono">{value}</p>
            <p className="text-caption text-text-muted mt-2">{caption}</p>
          </div>
        ))}
      </div>

      <DashboardCharts
        growth={growth.data ?? []}
        plans={plans.data ?? []}
        colors={colors}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-card-pad py-4 border-b border-divider">
            <h2 className="text-section-heading">Recent Check-ins</h2>
          </div>
          {overview.data.recentCheckIns.length === 0 ? (
            <div className="empty-state py-12">
              <CalendarCheck className="empty-state-icon" />
              <p className="empty-state-title">No check-ins today</p>
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {overview.data.recentCheckIns.map((item) => (
                <div
                  key={item.id}
                  className="px-card-pad py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="avatar">{item.member.name[0]}</div>
                    <div>
                      <Link
                        href={`/members/${item.member.id}`}
                        className="text-body font-medium"
                      >
                        {item.member.name}
                      </Link>
                      <p className="text-caption text-text-muted font-mono">
                        {item.member.memberCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-active">{item.source}</span>
                    <p className="text-caption text-text-muted mt-1">
                      {new Date(item.checkedInAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-between-cards">
          <div className="card">
            <h2 className="text-section-heading mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                [`/members/new`, 'Add member', UserPlus],
                ['/payments/collect', 'Collect fee', CreditCard],
                ['/notifications', 'Send email', Mail],
              ].map(([href, label, Icon]) => (
                <Link
                  key={String(href)}
                  href={String(href)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-stat-card"
                >
                  <Icon size={18} className="text-primary" />
                  <span className="text-body font-medium">{String(label)}</span>
                  <ArrowUpRight size={14} className="ml-auto text-text-muted" />
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-section-heading">Attention Needed</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Link href="/fees" className="stat-card">
                <p className="text-2xl text-danger font-mono">
                  {stats.overdueMembers}
                </p>
                <p className="text-caption text-text-muted">Overdue</p>
              </Link>
              <Link href="/members" className="stat-card">
                <p className="text-2xl text-warning font-mono">
                  {stats.expiringSoonMembers}
                </p>
                <p className="text-caption text-text-muted">Expiring</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

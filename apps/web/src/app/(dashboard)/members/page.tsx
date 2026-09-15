'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Filter, Download, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

type FilterStatus = 'all' | 'active' | 'expiring' | 'expired';

type ApiMember = {
  id: string;
  memberCode: string;
  user: { name: string; phone: string; email: string | null; avatarUrl: string | null };
  subscriptions: Array<{ endDate: string; status: string; plan: { name: string } }>;
  _count: { checkIns: number };
};

type MemberRow = {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  plan: string;
  planEnd: string | null;
  status: Exclude<FilterStatus, 'all'>;
  totalVisits: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['members'],
    queryFn: () => apiClient.get<{ members: ApiMember[]; total: number }>('/members', { params: { limit: 500 } }).then((response) => response.data),
  });

  const members = useMemo<MemberRow[]>(() => (data?.members ?? []).map((member) => {
    const subscription = member.subscriptions[0];
    const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
    const daysLeft = endDate ? Math.ceil((endDate.getTime() - Date.now()) / 86400000) : -1;
    const status: MemberRow['status'] = !subscription || daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'expiring' : 'active';
    return {
      id: member.id,
      memberCode: member.memberCode,
      name: member.user.name,
      phone: member.user.phone,
      plan: subscription?.plan.name ?? 'No active plan',
      planEnd: subscription?.endDate ?? null,
      status,
      totalVisits: member._count.checkIns,
    };
  }), [data]);

  const filtered = useMemo(() => {
    let list = members;

    if (filterStatus !== 'all') {
      list = list.filter((m) => m.status === filterStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.memberCode.includes(q) ||
          m.phone.includes(q)
      );
    }

    return list;
  }, [members, search, filterStatus]);

  const counts = useMemo(() => ({
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    expiring: members.filter(m => m.status === 'expiring').length,
    expired: members.filter(m => m.status === 'expired').length,
  }), [members]);

  const exportCsv = () => {
    const rows = [['Member Code', 'Name', 'Phone', 'Plan', 'Expiry', 'Status'], ...filtered.map((member) => [member.memberCode, member.name, member.phone, member.plan, member.planEnd ?? '', member.status])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 stagger-1">
        <div>
          <h1 className="text-page-title text-text-primary">Members</h1>
          <p className="text-body text-text-secondary mt-2">
            Manage all {counts.total} members — active, expiring, and expired subscriptions.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} strokeWidth={1.5} />
            Export CSV
          </button>
          <Link href="/members/new" className="btn btn-primary">
            <Plus size={16} strokeWidth={1.5} />
            Add Member
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-between-cards stagger-2">
        <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setFilterStatus('all')}>
          <p className="stat-card-label">Total</p>
          <p className="stat-card-value mt-2">{counts.total}</p>
        </div>
        <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setFilterStatus('active')}>
          <p className="stat-card-label">Active</p>
          <p className="stat-card-value mt-2 text-success">{counts.active}</p>
        </div>
        <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setFilterStatus('expiring')}>
          <p className="stat-card-label">Expiring Soon</p>
          <p className="stat-card-value mt-2 text-warning">{counts.expiring}</p>
        </div>
        <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setFilterStatus('expired')}>
          <p className="stat-card-label">Expired</p>
          <p className="stat-card-value mt-2 text-danger">{counts.expired}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 stagger-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, phone, or member code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'expiring', 'expired'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`filter-chip ${filterStatus === f ? 'active' : ''}`}
            >
              <Filter size={12} className="mr-1" />
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 rounded bg-gray-100 animate-pulse" />)}</div>
      ) : isError ? (
        <div className="card empty-state"><p className="empty-state-title">Could not load members</p><button className="btn btn-primary" onClick={() => refetch()}>Retry</button></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <p className="empty-state-title">
              {search ? `No members match "${search}"` : 'No members in this category'}
            </p>
            <p className="empty-state-description">
              {search ? 'Try a different search term.' : 'Members will appear here once added.'}
            </p>
            <Link href="/members/new" className="btn btn-primary">
              <Plus size={16} strokeWidth={1.5} />
              Add Member
            </Link>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden stagger-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <th className="table-header text-left pl-6">#</th>
                  <th className="table-header text-left">Member</th>
                  <th className="table-header text-left">Phone</th>
                  <th className="table-header text-left">Plan</th>
                  <th className="table-header text-left">Expiry</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-left">Visits</th>
                  <th className="table-header text-right pr-6"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => (
                  <tr key={m.id} className="table-row group">
                    <td className="px-4 pl-6 text-caption text-text-muted">{idx + 1}</td>
                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        <div className={`avatar text-badge ${
                          m.status === 'expired' ? 'bg-red-500' :
                          m.status === 'expiring' ? 'bg-amber-500' : ''
                        }`}>
                          {m.name[0]}
                        </div>
                        <div>
                          <Link href={`/members/${m.id}`} className="text-table-row font-medium text-text-primary hover:underline">
                            {m.name}
                          </Link>
                          <p className="text-caption text-text-muted font-mono">{m.memberCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 text-table-row text-text-secondary">{m.phone}</td>
                    <td className="px-4 text-table-row text-text-secondary">{m.plan}</td>
                    <td className="px-4 text-table-row text-text-secondary">{m.planEnd ? formatDate(m.planEnd) : '—'}</td>
                    <td className="px-4">
                      <span className={`badge ${
                        m.status === 'active' ? 'badge-active' :
                        m.status === 'expiring' ? 'badge-expiring' : 'badge-expired'
                      }`}>
                        {m.status === 'active' ? 'Active' :
                         m.status === 'expiring' ? 'Expiring' : 'Expired'}
                      </span>
                    </td>
                    <td className="px-4 text-table-row text-text-secondary font-mono">{m.totalVisits}</td>
                    <td className="px-4 pr-6 text-right">
                      <Link href={`/members/${m.id}`} className="row-actions text-primary hover:underline text-badge flex items-center gap-1 justify-end">
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-card-pad py-3 border-t border-divider bg-stat-card">
            <span className="text-caption text-text-muted">
              Showing {filtered.length} of {counts.total} members
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

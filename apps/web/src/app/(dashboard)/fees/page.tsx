'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard, Search, IndianRupee, CheckCircle2, AlertCircle,
  Clock, Filter, ArrowUpRight
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

type FeeTab = 'all' | 'due' | 'overdue' | 'paid';
type FeeRow = {
  id: string;
  subscriptionId?: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  plan: string;
  amount: number;
  dueDate: string;
  status: 'due' | 'overdue' | 'paid';
  paidAt: string | null;
  method: 'cash' | 'upi' | 'card' | 'netbanking' | 'razorpay' | null;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FeeTab>('all');
  const [search, setSearch] = useState('');
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectMethod, setCollectMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [justCollected, setJustCollected] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fees'],
    queryFn: async () => {
      const [dueResponse, paidResponse] = await Promise.all([
        apiClient.get('/payments/due'),
        apiClient.get('/payments', { params: { limit: 100 } }),
      ]);
      const now = Date.now();
      const due: FeeRow[] = dueResponse.data.members.map((item: any) => ({
        id: `due-${item.subscriptionId}`,
        subscriptionId: item.subscriptionId,
        memberId: item.memberId,
        memberName: item.memberName,
        memberCode: item.memberCode,
        plan: item.planName,
        amount: Number(item.amount),
        dueDate: item.expiredOn,
        status: new Date(item.expiredOn).getTime() < now ? 'overdue' : 'due',
        paidAt: null,
        method: null,
      }));
      const paid: FeeRow[] = paidResponse.data.payments.map((item: any) => ({
        id: item.id,
        memberId: item.memberId,
        memberName: item.member.user.name,
        memberCode: item.member.memberCode,
        plan: 'Payment',
        amount: Number(item.totalAmount),
        dueDate: item.paidAt,
        status: 'paid',
        paidAt: item.paidAt,
        method: item.paymentMethod,
      }));
      return [...due, ...paid];
    },
  });
  const fees = data ?? [];
  const collectMutation = useMutation({
    mutationFn: (fee: FeeRow) => apiClient.post('/payments/collect', {
      memberId: fee.memberId,
      subscriptionId: fee.subscriptionId,
      amount: fee.amount,
      paymentMethod: collectMethod,
    }),
    onSuccess: async (_response, fee) => {
      setJustCollected(fee.id);
      setCollectingId(null);
      await queryClient.invalidateQueries({ queryKey: ['fees'] });
      window.setTimeout(() => setJustCollected(null), 2000);
    },
  });

  const filtered = useMemo(() => {
    let list = fees;
    if (activeTab !== 'all') {
      list = list.filter((f) => f.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) => f.memberName.toLowerCase().includes(q) || f.memberCode.includes(q)
      );
    }
    return list;
  }, [fees, activeTab, search]);

  const stats = useMemo(() => ({
    totalDue: fees.filter(f => f.status === 'due').reduce((s, f) => s + f.amount, 0),
    totalOverdue: fees.filter(f => f.status === 'overdue').reduce((s, f) => s + f.amount, 0),
    totalCollected: fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
    dueCount: fees.filter(f => f.status === 'due').length,
    overdueCount: fees.filter(f => f.status === 'overdue').length,
    paidCount: fees.filter(f => f.status === 'paid').length,
  }), [fees]);

  const handleCollect = (feeId: string) => {
    const fee = fees.find((item) => item.id === feeId);
    if (fee) collectMutation.mutate(fee);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="stagger-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-page-title text-text-primary">Fee Management</h1>
          <p className="text-body text-text-secondary mt-2">
          Track and collect member fees  •  {formatDate(new Date().toISOString())}
          </p>
        </div>
        <Link href="/payments/collect" className="btn btn-primary">
          <CreditCard size={16} /> Collect Fee
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-between-cards stagger-2">
        <div className="stat-card border-l-4 border-l-warning">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label">Due This Month</span>
            <Clock size={18} className="text-warning" />
          </div>
          <p className="stat-card-value font-mono text-warning">{formatCurrency(stats.totalDue)}</p>
          <p className="text-caption text-text-muted mt-1">{stats.dueCount} members</p>
        </div>

        <div className="stat-card border-l-4 border-l-danger">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label">Overdue</span>
            <AlertCircle size={18} className="text-danger" />
          </div>
          <p className="stat-card-value font-mono text-danger">{formatCurrency(stats.totalOverdue)}</p>
          <p className="text-caption text-text-muted mt-1">{stats.overdueCount} members</p>
        </div>

        <div className="stat-card border-l-4 border-l-success">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label">Collected</span>
            <CheckCircle2 size={18} className="text-success" />
          </div>
          <p className="stat-card-value font-mono text-success">{formatCurrency(stats.totalCollected)}</p>
          <p className="text-caption text-text-muted mt-1">{stats.paidCount} transactions</p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col md:flex-row gap-3 stagger-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by member name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'due', 'overdue', 'paid'] as FeeTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`filter-chip ${activeTab === tab ? 'active' : ''}`}
            >
              <Filter size={12} className="mr-1" />
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'due' && stats.dueCount > 0 ? ` (${stats.dueCount})` : ''}
              {tab === 'overdue' && stats.overdueCount > 0 ? ` (${stats.overdueCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 rounded bg-gray-100 animate-pulse" />)}</div>
      ) : isError ? (
        <div className="card empty-state"><p className="empty-state-title">Could not load fees</p><button className="btn btn-primary" onClick={() => refetch()}>Retry</button></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <IndianRupee className="empty-state-icon" />
            <p className="empty-state-title">No fees found</p>
            <p className="empty-state-description">
              {search ? `No results for "${search}"` : 'All fees have been collected! 🎉'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden stagger-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <th className="table-header text-left pl-6">Member</th>
                  <th className="table-header text-left">Plan</th>
                  <th className="table-header text-left">Amount</th>
                  <th className="table-header text-left">Due Date</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fee) => {
                  const isCollecting = collectingId === fee.id;
                  const wasJustCollected = justCollected === fee.id;

                  return (
                    <tr key={fee.id} className={`table-row ${wasJustCollected ? 'bg-success-bg' : ''}`}>
                      <td className="px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`avatar text-badge ${
                            fee.status === 'overdue' ? 'bg-red-500' :
                            fee.status === 'due' ? 'bg-amber-500' : ''
                          }`}>
                            {fee.memberName[0]}
                          </div>
                          <div>
                            <p className="text-table-row font-medium text-text-primary">{fee.memberName}</p>
                            <p className="text-caption text-text-muted font-mono">{fee.memberCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 text-table-row text-text-secondary">{fee.plan}</td>
                      <td className="px-4 text-table-row text-text-primary font-mono font-medium">{formatCurrency(fee.amount)}</td>
                      <td className="px-4 text-table-row text-text-secondary">{formatDate(fee.dueDate)}</td>
                      <td className="px-4">
                        {wasJustCollected ? (
                          <span className="badge badge-paid flex items-center gap-1 w-fit">
                            <CheckCircle2 size={12} /> Collected!
                          </span>
                        ) : (
                          <span className={`badge ${
                            fee.status === 'paid' ? 'badge-paid' :
                            fee.status === 'overdue' ? 'badge-overdue' : 'badge-fee-due'
                          }`}>
                            {fee.status === 'paid' ? 'Paid' : fee.status === 'overdue' ? 'Overdue' : 'Due'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 pr-6 text-right">
                        {fee.status !== 'paid' && !wasJustCollected && (
                          <>
                            {isCollecting ? (
                              <div className="flex items-center gap-2 justify-end">
                                <div className="flex gap-1">
                                  {(['cash', 'upi', 'card'] as const).map((method) => (
                                    <button
                                      key={method}
                                      onClick={() => setCollectMethod(method)}
                                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                        collectMethod === method
                                          ? 'bg-primary text-white'
                                          : 'bg-stat-card text-text-secondary hover:bg-border-default'
                                      }`}
                                    >
                                      {method.toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleCollect(fee.id)}
                                  disabled={collectMutation.isPending}
                                  className="btn btn-primary h-7 px-3 text-badge"
                                >
                                  <CheckCircle2 size={12} /> Confirm
                                </button>
                                <button
                                  onClick={() => setCollectingId(null)}
                                  className="text-caption text-text-muted hover:text-text-primary"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setCollectingId(fee.id)}
                                className="btn btn-primary h-8 px-3 text-badge"
                              >
                                <CreditCard size={12} /> Mark Collected
                              </button>
                            )}
                          </>
                        )}
                        {fee.status === 'paid' && !wasJustCollected && (
                          <span className="text-caption text-text-muted capitalize flex items-center gap-1 justify-end">
                            <ArrowUpRight size={12} /> {fee.method}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

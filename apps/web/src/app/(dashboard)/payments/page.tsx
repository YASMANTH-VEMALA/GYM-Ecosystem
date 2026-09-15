'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, CreditCard,
  Download, IndianRupee, Search, TriangleAlert, Wallet, X,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

type DueMember = {
  memberId: string;
  memberName: string;
  planName: string;
  expiredOn: string;
  amount: number;
};

type PaymentRow = {
  id: string;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  invoiceNumber: string;
  paidAt: string;
  member: {
    id: string;
    memberCode: string;
    user: { name: string; phone: string };
  };
  subscription?: { plan: { name: string } } | null;
};

type HistoryResponse = {
  payments: PaymentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: { totalAmount: number };
};

type DatePreset = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

function currency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PaymentsRevenuePage() {
  const today = useMemo(() => new Date(), []);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preset, setPreset] = useState<DatePreset>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const rangeIsValid = !from || !to || from <= to;
  const filters = useMemo(() => ({
    search: search || undefined,
    method: method || undefined,
    from: from || undefined,
    to: to || undefined,
  }), [search, method, from, to]);

  const { data: dueData, isLoading: dueLoading } = useQuery({
    queryKey: ['payments-due'],
    queryFn: () => apiClient.get('/payments/due').then((response) => response.data),
  });

  const history = useQuery<HistoryResponse>({
    queryKey: ['payments-history', filters, page, limit],
    queryFn: () => apiClient.get('/payments', {
      params: { ...filters, page, limit },
    }).then((response) => response.data),
    enabled: rangeIsValid,
    placeholderData: (previous) => previous,
  });

  const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd = isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const monthToDate = useQuery<HistoryResponse>({
    queryKey: ['payments-month-to-date', monthStart, monthEnd],
    queryFn: () => apiClient.get('/payments', {
      params: { from: monthStart, to: monthEnd, page: 1, limit: 1 },
    }).then((response) => response.data),
  });

  const dueMembers: DueMember[] = dueData?.members || [];
  const payments = history.data?.payments || [];
  const overdueMembers = dueMembers.filter((member) => new Date(member.expiredOn) < today);
  const renewalAmount = dueMembers.reduce((sum, member) => sum + Number(member.amount), 0);
  const overdueAmount = overdueMembers.reduce((sum, member) => sum + Number(member.amount), 0);
  const totalPages = history.data?.totalPages || 1;
  const hasFilters = Boolean(search || method || from || to);

  const applyPreset = (nextPreset: Exclude<DatePreset, 'custom'>) => {
    const year = today.getFullYear();
    const month = today.getMonth();
    setPreset(nextPreset);
    setPage(1);

    if (nextPreset === 'all') {
      setFrom('');
      setTo('');
    } else if (nextPreset === 'this-month') {
      setFrom(isoDate(new Date(year, month, 1)));
      setTo(isoDate(new Date(year, month + 1, 0)));
    } else if (nextPreset === 'last-month') {
      setFrom(isoDate(new Date(year, month - 1, 1)));
      setTo(isoDate(new Date(year, month, 0)));
    } else {
      setFrom(isoDate(new Date(year, 0, 1)));
      setTo(isoDate(new Date(year, 11, 31)));
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setMethod('');
    setFrom('');
    setTo('');
    setPreset('all');
    setPage(1);
  };

  const exportCsv = async () => {
    if (!history.data?.total || !rangeIsValid) return;
    setExporting(true);
    setExportError('');
    try {
      const response = await apiClient.get('/payments/export', { params: filters, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `payments-${from || 'all'}-${to || isoDate(today)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Could not export the selected payment history. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-page-title text-text-primary">Payments & Revenue</h1>
          <p className="text-body text-text-secondary mt-2">Search and review the complete payment history for this gym branch.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting || !history.data?.total || !rangeIsValid}>
            <Download size={16} strokeWidth={1.5} /> {exporting ? 'Exporting...' : 'Export filtered CSV'}
          </button>
          <Link href="/payments/collect" className="btn btn-primary">
            <CreditCard size={16} strokeWidth={1.5} /> Collect Fee
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-between-cards sm:grid-cols-2 xl:grid-cols-4">
        {dueLoading || monthToDate.isLoading ? (
          <>{Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)}</>
        ) : (
          <>
            <div className="card border-l-4 border-l-info">
              <div className="flex items-start justify-between"><p className="text-caption uppercase tracking-[0.14em] text-text-muted">Revenue (MTD)</p><Wallet size={18} className="text-info" /></div>
              <p className="text-page-title mt-3 text-text-primary">{currency(monthToDate.data?.summary.totalAmount || 0)}</p>
              <p className="text-caption text-text-secondary mt-2">{monthToDate.data?.total || 0} payments this month</p>
            </div>
            <div className="card border-l-4 border-l-primary">
              <div className="flex items-start justify-between"><p className="text-caption uppercase tracking-[0.14em] text-text-muted">Filtered total</p><CalendarDays size={18} className="text-primary" /></div>
              <p className="text-page-title mt-3 text-text-primary">{currency(history.data?.summary.totalAmount || 0)}</p>
              <p className="text-caption text-text-secondary mt-2">Across {history.data?.total || 0} matching payments</p>
            </div>
            <div className="card border-l-4 border-l-warning">
              <div className="flex items-start justify-between"><p className="text-caption uppercase tracking-[0.14em] text-text-muted">Renewals due</p><IndianRupee size={18} className="text-warning" /></div>
              <p className="text-page-title mt-3 text-text-primary">{currency(renewalAmount)}</p>
              <p className="text-caption text-text-secondary mt-2">Across {dueMembers.length} memberships</p>
            </div>
            <div className="card border-l-4 border-l-danger">
              <div className="flex items-start justify-between"><p className="text-caption uppercase tracking-[0.14em] text-text-muted">Overdue</p><TriangleAlert size={18} className="text-danger" /></div>
              <p className="text-page-title mt-3 text-text-primary">{currency(overdueAmount)}</p>
              <p className="text-caption text-text-secondary mt-2">{overdueMembers.length} memberships need attention</p>
            </div>
          </>
        )}
      </div>

      <section className="card space-y-5" aria-label="Payment history filters">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-section-heading text-text-primary">Find past payments</h2><p className="text-caption text-text-secondary mt-1">Search by member, phone, code, or invoice.</p></div>
          <div className="flex flex-wrap gap-2">
            {([['all', 'All time'], ['this-month', 'This month'], ['last-month', 'Last month'], ['this-year', 'This year']] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => applyPreset(value)} className={`filter-chip ${preset === value ? 'active' : ''}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="payment-search" className="input-label">Member or invoice</label>
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input id="payment-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, phone, code, invoice..." className="input pl-10" />
            </div>
          </div>
          <div>
            <label htmlFor="payment-method" className="input-label">Payment method</label>
            <select id="payment-method" value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }} className="input">
              <option value="">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="netbanking">Net banking</option><option value="razorpay">Razorpay</option>
            </select>
          </div>
          <div>
            <label htmlFor="payment-from" className="input-label">From date</label>
            <input id="payment-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPreset('custom'); setPage(1); }} className="input" />
          </div>
          <div>
            <label htmlFor="payment-to" className="input-label">To date</label>
            <input id="payment-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPreset('custom'); setPage(1); }} className="input" />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-caption ${rangeIsValid ? 'text-text-secondary' : 'text-danger'}`} aria-live="polite">
            {rangeIsValid ? `${history.data?.total || 0} payments found${hasFilters ? ' for the selected filters' : ' across all time'}.` : 'The from date must be before or equal to the to date.'}
          </p>
          {hasFilters && <button type="button" onClick={clearFilters} className="btn btn-secondary h-9"><X size={14} /> Clear filters</button>}
        </div>
        {exportError && <p className="text-caption text-danger">{exportError}</p>}
      </section>

      <div className="card p-0 overflow-hidden">
        <div className="px-card-pad py-4 border-b border-divider flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-section-heading text-text-primary">Payment History</h2><p className="text-caption text-text-secondary mt-1">Newest matching transaction first</p></div>
          <div className="flex items-center gap-3">
            <label htmlFor="payment-page-size" className="text-caption text-text-muted">Rows</label>
            <select id="payment-page-size" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="input h-9 w-20 py-1">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
            </select>
            <Badge variant="default">{history.data?.total || 0}</Badge>
          </div>
        </div>

        {history.isLoading ? <TableSkeleton rows={6} cols={6} /> : history.isError ? (
          <EmptyState icon={TriangleAlert} title="Could not load payment history" description="Check the filters and try again." action={<button className="btn btn-secondary" onClick={() => history.refetch()}>Retry</button>} />
        ) : !rangeIsValid ? (
          <EmptyState icon={CalendarDays} title="Invalid date range" description="Choose a from date that is before the to date." />
        ) : payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-surface"><tr><th className="table-header text-left">Date & time</th><th className="table-header text-left">Member</th><th className="table-header text-left">Plan</th><th className="table-header text-left">Amount</th><th className="table-header text-left">Method</th><th className="table-header text-left">Invoice</th></tr></thead>
              <tbody>{payments.map((payment) => (
                <tr key={payment.id} className="table-row">
                  <td className="px-4 text-table-row text-text-secondary whitespace-nowrap">{displayDate(payment.paidAt)}</td>
                  <td className="px-4">
                    <Link href={`/members/${payment.member.id}`} className="text-table-row text-text-primary font-medium hover:text-primary">{payment.member.user.name}</Link>
                    <p className="text-caption text-text-muted font-mono mt-1">{payment.member.memberCode} · {payment.member.user.phone}</p>
                  </td>
                  <td className="px-4 text-table-row text-text-secondary">{payment.subscription?.plan.name || 'Direct payment'}</td>
                  <td className="px-4 text-table-row font-mono font-medium text-text-primary">{currency(Number(payment.totalAmount))}</td>
                  <td className="px-4"><Badge variant={payment.paymentMethod === 'upi' ? 'coach' : 'default'}>{payment.paymentMethod.toUpperCase()}</Badge></td>
                  <td className="px-4 text-table-row font-mono text-text-muted">{payment.invoiceNumber}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ArrowUpRight} title={hasFilters ? 'No matching payments' : 'No transactions yet'} description={hasFilters ? 'Try a wider date range or clear some filters.' : 'Payment entries will appear after collections are recorded.'} action={hasFilters ? <button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button> : <Link href="/payments/collect" className="btn btn-primary">Collect first payment</Link>} />
        )}

        {history.data && history.data.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-divider px-card-pad py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-text-secondary">Showing {(history.data.page - 1) * history.data.limit + 1}–{Math.min(history.data.page * history.data.limit, history.data.total)} of {history.data.total}</p>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary h-9 px-3" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || history.isFetching}><ChevronLeft size={15} /> Previous</button>
              <span className="px-3 text-caption text-text-secondary">Page {page} of {totalPages}</span>
              <button className="btn btn-secondary h-9 px-3" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || history.isFetching}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

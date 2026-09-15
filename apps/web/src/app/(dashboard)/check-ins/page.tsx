'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { CalendarCheck, Download, Calendar, TrendingUp, Clock, LogIn } from 'lucide-react';

interface CheckInRow {
  id: string;
  checkedInAt: string;
  source: 'kiosk' | 'app';
  member: {
    id: string;
    memberCode: string;
    user: { name: string; avatarUrl: string | null };
    subscriptions: { plan: { name: string } }[];
  };
}

export default function CheckInsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['check-ins', selectedDate],
    queryFn: () =>
      apiClient.get('/checkins/by-date', { params: { date: selectedDate } }).then((r) => r.data),
    refetchInterval: isToday ? 30000 : false,
  });

  const checkIns: CheckInRow[] = data?.checkIns || [];

  const enriched = useMemo(() => {
    const grouped = new Map<string, CheckInRow[]>();
    checkIns.forEach((ci) => {
      const key = ci.member.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ci);
    });

    return checkIns
      .map((ci) => {
        const memberCheckins = grouped.get(ci.member.id) || [];
        const sorted = memberCheckins.sort(
          (a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
        );
        const firstIn = sorted[0];
        const lastIn = sorted[sorted.length - 1];
        const timeIn = new Date(firstIn.checkedInAt);
        const durationMs =
          sorted.length > 1 ? new Date(lastIn.checkedInAt).getTime() - timeIn.getTime() : null;

        return { ...ci, timeIn, durationMs, isFirst: ci.id === firstIn.id };
      })
      .filter((ci) => ci.isFirst);
  }, [checkIns]);

  const stats = useMemo(() => {
    const kiosk = enriched.filter((c) => c.source === 'kiosk').length;
    const app = enriched.filter((c) => c.source === 'app').length;
    const avgDuration =
      enriched.filter((c) => c.durationMs).reduce((sum, c) => sum + (c.durationMs || 0), 0) /
        enriched.filter((c) => c.durationMs).length || null;

    return { total: enriched.length, kiosk, app, avgDuration };
  }, [enriched]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  const exportCSV = () => {
    const headers = ['Member', 'Code', 'Time In', 'Duration', 'Source', 'Plan'];
    const rows = enriched.map((ci) => [
      ci.member.user.name,
      ci.member.memberCode,
      formatTime(ci.timeIn),
      formatDuration(ci.durationMs),
      ci.source === 'kiosk' ? 'Kiosk' : 'Mobile App',
      ci.member.subscriptions?.[0]?.plan?.name || '—',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `check-ins-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 stagger-1">
        <div>
          <h1 className="text-page-title text-text-primary">Check-ins</h1>
          <p className="text-body text-text-secondary mt-2">Track member attendance in real-time from kiosk & mobile app</p>
          {isToday && (
            <p className="text-caption text-text-secondary mt-1">🔄 Auto-refreshes every 30 seconds</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Calendar size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              id="checkins-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input pl-9 font-mono"
            />
          </div>
          <button
            onClick={exportCSV}
            disabled={!enriched.length}
            className="btn btn-secondary"
          >
            <Download size={16} strokeWidth={1.5} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && enriched.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-2">
          <div className="card p-4">
            <p className="text-caption text-text-secondary font-medium mb-2">Total Check-ins</p>
            <p className="text-heading text-text-primary">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-caption text-text-secondary font-medium mb-2">From Kiosk</p>
            <p className="text-heading text-text-primary">{stats.kiosk}</p>
          </div>
          <div className="card p-4">
            <p className="text-caption text-text-secondary font-medium mb-2">From Mobile</p>
            <p className="text-heading text-text-primary">{stats.app}</p>
          </div>
          <div className="card p-4">
            <p className="text-caption text-text-secondary font-medium mb-2">Avg Duration</p>
            <p className="text-body text-text-primary font-mono">{formatDuration(stats.avgDuration)}</p>
          </div>
        </div>
      )}

      <div className="stagger-3">
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : !enriched.length ? (
          <div className="card">
            <EmptyState
              icon={CalendarCheck}
              title="No check-ins"
              description={isToday ? 'No members have checked in yet today.' : `No check-ins found for ${selectedDate}.`}
              action={
                <a href="/kiosk" target="_blank" className="btn btn-primary">
                  <LogIn size={16} strokeWidth={1.5} />
                  Open Kiosk
                </a>
              }
            />
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-divider">
                    <th className="table-header text-left">#</th>
                    <th className="table-header text-left">Member</th>
                    <th className="table-header text-left">Time In</th>
                    <th className="table-header text-left">Duration</th>
                    <th className="table-header text-left">Source</th>
                    <th className="table-header text-left">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {enriched.map((ci, idx) => (
                    <tr key={ci.id} className="hover:bg-page transition-colors duration-200">
                      <td className="px-4 py-3">
                        <span className="text-caption font-mono text-text-muted">{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {ci.member.user.avatarUrl ? (
                            <img src={ci.member.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold text-xs">
                              {ci.member.user.name?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-body font-medium text-text-primary">{ci.member.user.name}</p>
                            <p className="text-caption text-text-muted font-mono">{ci.member.memberCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body font-mono text-text-secondary">
                        {formatTime(ci.timeIn)}
                      </td>
                      <td className="px-4 py-3 text-body font-mono text-text-secondary">
                        {formatDuration(ci.durationMs)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ci.source === 'kiosk' ? 'info' : 'default'}>
                          {ci.source === 'kiosk' ? '🔲 Kiosk' : '📱 Mobile'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-body text-text-secondary">
                        {ci.member.subscriptions?.[0]?.plan?.name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

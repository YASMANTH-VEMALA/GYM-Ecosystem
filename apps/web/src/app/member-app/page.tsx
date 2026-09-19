'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  Activity,
  Bell,
  BellOff,
  BellRing,
  CalendarCheck,
  ChevronRight,
  CircleCheck,
  CircleX,
  Dumbbell,
  FileText,
  Gift,
  LogOut,
  LoaderCircle,
  Mail,
  QrCode,
  RefreshCw,
  Salad,
  Sparkles,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { getTheme } from '@/lib/notification-themes';
import { useAuth } from '@/providers/auth-provider';
import { BottomNav, type Tab } from '@/components/member-app/BottomNav';
import { QRModal } from '@/components/member-app/QRModal';
import { PullToRefresh } from '@/components/member-app/PullToRefresh';
import { PWAInstallBanner } from '@/components/member-app/PWAInstallBanner';
import {
  HomeTabSkeleton,
  NotificationsTabSkeleton,
  ProgressTabSkeleton,
} from '@/components/member-app/MemberSkeleton';

type MemberProfile = {
  member: {
    id: string;
    memberCode: string;
    name: string;
    phone: string;
    email: string | null;
    avatarUrl: string | null;
    joinedAt: string;
  };
  gym: { name: string; logoUrl: string | null; primaryColor: string | null };
  subscription: {
    planName: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    status: string;
  } | null;
  stats: { totalVisits: number; monthVisits: number; checkedInToday: boolean };
  attendanceLast7Days: string[];
  feeStatus: 'paid' | 'due' | 'overdue';
};

type WorkoutAssignment = {
  workoutPlan: {
    name: string;
    description: string | null;
    days: Array<{
      id: string;
      dayName: string | null;
      dayNumber: number;
      exercises: Array<{
        id: string;
        sets: number;
        reps: string;
        exercise: { name: string };
      }>;
    }>;
  };
};

type DietAssignment = {
  dietChart: {
    name: string;
    description: string | null;
    meals: Array<{
      id: string;
      mealName: string;
      mealType: string;
      timeSuggestion: string | null;
      description: string | null;
      calories: number | null;
    }>;
  };
};

type BodyStat = {
  id: string;
  recordedAt: string;
  weightKg: string | number | null;
  bodyFatPct: string | number | null;
  chestCm: string | number | null;
  waistCm: string | number | null;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  metadata?: {
    theme?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
  } | null;
};

type CheckInPayload = { gymId: string; token: string };
type CheckInNotice = { type: 'success' | 'error'; message: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const fallbackAccent = '#ffcb1c';
const pendingCheckInKey = 'gymos-pending-checkin';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeAccent(value?: string | null) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackAccent;
}

function isCheckInPayload(value: unknown): value is CheckInPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<CheckInPayload>;
  return typeof payload.gymId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.gymId)
    && typeof payload.token === 'string'
    && /^[0-9a-f]{64}$/i.test(payload.token);
}

function payloadFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const payload = { gymId: params.get('gymId'), token: params.get('token') ?? params.get('hash') };
  return isCheckInPayload(payload) ? payload : null;
}

function friendlyCheckInError(error: unknown) {
  const message = isAxiosError(error) && typeof error.response?.data?.error === 'string'
    ? error.response.data.error.toLowerCase()
    : '';
  if (message.includes('already checked')) return 'You are already checked in today.';
  if (message.includes('invalid qr')) return 'This QR code is no longer valid. Ask reception for the new code.';
  if (message.includes('member not found')) return 'This QR code belongs to a different gym.';
  return 'Check-in failed. Check your connection and try again.';
}

export default function MemberAppPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('home');
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [pendingCheckIn, setPendingCheckIn] = useState<CheckInPayload | null>(null);
  const [checkInNotice, setCheckInNotice] = useState<CheckInNotice | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSTutorial, setShowIOSTutorial] = useState(false);
  const checkInStarted = useRef(false);

  useEffect(() => {
    const payload = payloadFromUrl();
    if (payload) window.sessionStorage.setItem(pendingCheckInKey, JSON.stringify(payload));
    if (new URLSearchParams(window.location.search).get('tab') === 'notifications') setTab('notifications');
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsStandalone(standalone);
    setIsIOS(ios);
    setShowInstallBanner(!standalone && window.localStorage.getItem('gymos-install-dismissed') !== 'true');

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setShowInstallBanner(false);
      window.localStorage.removeItem('gymos-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const installMemberApp = useCallback(async () => {
    if (isIOS) {
      setShowIOSTutorial(true);
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }, [installPrompt, isIOS]);

  const dismissInstallBanner = useCallback(() => {
    window.localStorage.setItem('gymos-install-dismissed', 'true');
    setShowInstallBanner(false);
  }, []);

  const profile = useQuery({
    queryKey: ['member-app', 'profile'],
    enabled: Boolean(user),
    retry: false,
    queryFn: () => apiClient.get<MemberProfile>('/members/me').then((response) => response.data),
  });
  const memberId = profile.data?.member.id;
  const workout = useQuery({
    queryKey: ['member-app', 'workout'],
    enabled: Boolean(memberId),
    queryFn: () => apiClient.get<{ assignment: WorkoutAssignment | null }>('/workouts/me/active').then((response) => response.data.assignment),
  });
  const diet = useQuery({
    queryKey: ['member-app', 'diet'],
    enabled: Boolean(memberId),
    queryFn: () => apiClient.get<{ assignment: DietAssignment | null }>('/diets/me/active').then((response) => response.data.assignment),
  });
  const progress = useQuery({
    queryKey: ['member-app', 'progress', memberId],
    enabled: tab === 'progress' && Boolean(memberId),
    queryFn: () => apiClient.get<{ stats: BodyStat[] }>(`/bodystats/${memberId}`, { params: { limit: 50 } }).then((response) => response.data),
  });
  const notifications = useQuery({
    queryKey: ['member-app', 'notifications'],
    enabled: tab === 'notifications' && Boolean(memberId),
    queryFn: () => apiClient.get<{ notifications: Notification[] }>('/notifications/me', { params: { limit: 50 } }).then((response) => response.data),
  });
  const referrals = useQuery({
    queryKey: ['member-app', 'referrals'],
    enabled: tab === 'referrals' && Boolean(memberId),
    queryFn: () => apiClient.get('/referrals/my-code').then((r) => r.data),
  });
  const referralStats = useQuery({
    queryKey: ['member-app', 'referral-stats'],
    enabled: tab === 'referrals' && Boolean(memberId),
    queryFn: () => apiClient.get('/referrals/my-stats').then((r) => r.data),
  });
  const checkIn = useMutation({
    mutationFn: (payload: CheckInPayload) => apiClient.post('/checkins/qr', payload),
    onSuccess: async () => {
      window.sessionStorage.removeItem(pendingCheckInKey);
      window.history.replaceState({}, '', '/member-app');
      setCheckInNotice({ type: 'success', message: 'You are checked in. Have a great workout!' });
      await queryClient.invalidateQueries({ queryKey: ['member-app', 'profile'] });
    },
    onError: (error) => setCheckInNotice({ type: 'error', message: friendlyCheckInError(error) }),
  });

  useEffect(() => {
    if (!profile.data || user?.role !== 'member' || checkInStarted.current) return;
    const rawPayload = window.sessionStorage.getItem(pendingCheckInKey);
    if (!rawPayload) return;
    try {
      const payload: unknown = JSON.parse(rawPayload);
      if (!isCheckInPayload(payload)) {
        window.sessionStorage.removeItem(pendingCheckInKey);
        return;
      }
      setPendingCheckIn(payload);
      checkInStarted.current = true;
    } catch {
      window.sessionStorage.removeItem(pendingCheckInKey);
    }
  }, [checkIn, profile.data, user?.role]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['member-app'] });
  }, [queryClient]);

  if (authLoading || (!user && !profile.isError) || profile.isLoading) {
    return <MemberShell><HomeTabSkeleton /></MemberShell>;
  }

  if (profile.isError || !profile.data) {
    const isNotMember = isAxiosError(profile.error) && profile.error.response?.status === 404;
    return (
      <MemberShell>
        <div className="flex min-h-[80svh] items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ffcb1c]/20 text-[#060517]"><User size={26} /></div>
            <h1 className="mt-4 text-xl font-bold text-[#060517]">{isNotMember ? 'Member account required' : 'Unable to load your account'}</h1>
            <p className="mt-2 text-xs leading-relaxed text-[#9c9ca3]">{isNotMember ? 'This space is only available to members linked to a gym.' : 'Check your connection and try again.'}</p>
            <button onClick={() => isNotMember ? router.replace('/dashboard') : profile.refetch()} className="mt-5 h-12 w-full rounded-xl px-5 text-xs font-semibold text-white bg-[#060517] shadow-sm active:scale-[0.97]">
              {isNotMember ? 'Open dashboard' : 'Try again'}
            </button>
          </div>
        </div>
      </MemberShell>
    );
  }

  const data = profile.data;
  const accent = safeAccent(data.gym.primaryColor);

  return (
    <MemberShell>
      {/* ─── Top App Header ─── */}
      <header className="sticky top-0 z-30 border-b border-[#f0f0f2] bg-white/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-[#060517] bg-transparent">
            {data.gym.logoUrl ? (
              <img src={data.gym.logoUrl} alt={data.gym.name} className="h-full w-full object-contain" />
            ) : (
              <Dumbbell size={22} className="text-[#060517]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#060517]">{data.gym.name}</p>
            <p className="truncate text-[11px] text-[#9c9ca3]">Hello, {data.member.name.split(' ')[0]}</p>
          </div>
          <button onClick={() => setQrOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e6e6e7] bg-[#f9f9fc] text-[#060517] shadow-xs active:scale-[0.94] hover:bg-white" aria-label="Open membership QR code">
            <QrCode size={19} />
          </button>
        </div>
      </header>

      <PWAInstallBanner
        isInstallable={Boolean(installPrompt)}
        isStandalone={isStandalone}
        isIOS={isIOS}
        showBanner={showInstallBanner}
        showIOSTutorial={showIOSTutorial}
        brandColor={accent}
        onInstallClick={() => void installMemberApp()}
        onDismiss={dismissInstallBanner}
        onCloseTutorial={() => setShowIOSTutorial(false)}
      />

      {(pendingCheckIn || checkIn.isPending || checkInNotice) && (
        <div className="px-5 pt-4">
          <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xs ${checkInNotice?.type === 'error' ? 'border-[#ef4444]/20 bg-[#ef4444]/10 text-[#ef4444]' : checkInNotice?.type === 'success' ? 'border-[#10b981]/20 bg-[#10b981]/10 text-[#10b981]' : 'border-[#ffcb1c]/40 bg-[#ffcb1c]/15 text-[#060517]'}`}>
            {checkIn.isPending ? <LoaderCircle className="mt-0.5 shrink-0 animate-spin text-[#9c9ca3]" size={19} /> : checkInNotice?.type === 'success' ? <CircleCheck className="mt-0.5 shrink-0 text-[#10b981]" size={19} /> : checkInNotice?.type === 'error' ? <CircleX className="mt-0.5 shrink-0 text-[#ef4444]" size={19} /> : <CalendarCheck className="mt-0.5 shrink-0 text-[#060517]" size={19} />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#060517]">{checkIn.isPending ? 'Checking you in…' : checkInNotice?.type === 'success' ? 'Check-in complete' : checkInNotice?.type === 'error' ? 'Could not check in' : 'Mark today’s attendance?'}</p>
              {checkInNotice ? <p className="mt-1 text-[11px] leading-relaxed text-[#666]">{checkInNotice.message}</p> : <p className="mt-1 text-[11px] leading-relaxed text-[#666]">Confirm that you are at {data.gym.name} now.</p>}
            </div>
            {checkInNotice?.type === 'error' && pendingCheckIn && <button onClick={() => { setCheckInNotice(null); checkIn.mutate(pendingCheckIn); }} className="h-8 shrink-0 rounded-lg bg-[#060517] text-white px-3 text-[11px] font-semibold active:scale-95 shadow-xs">Retry</button>}
            {!checkInNotice && !checkIn.isPending && pendingCheckIn && <div className="flex shrink-0 flex-col gap-1"><button onClick={() => checkIn.mutate(pendingCheckIn)} className="h-9 rounded-lg px-3 text-[11px] font-semibold text-white bg-[#060517] shadow-xs active:scale-95">Mark present</button><button onClick={() => { window.sessionStorage.removeItem(pendingCheckInKey); window.history.replaceState({}, '', '/member-app'); setPendingCheckIn(null); }} className="h-6 text-[10px] text-[#9c9ca3] active:scale-95">Not now</button></div>}
          </div>
        </div>
      )}

      <PullToRefresh onRefresh={refresh} brandColor={accent}>
        <div key={tab} className="animate-fade-in flex-1">
          {tab === 'home' && <HomeTab data={data} workout={workout.data} diet={diet.data} loadingPlans={workout.isLoading || diet.isLoading} accent={accent} onShowQr={() => setQrOpen(true)} />}
          {tab === 'notifications' && (
            <NotificationsTab
              items={notifications.data?.notifications}
              loading={notifications.isLoading}
              error={notifications.isError}
              retry={() => notifications.refetch()}
              onSelectNotification={setSelectedNotification}
            />
          )}
          {tab === 'progress' && <ProgressTab items={progress.data?.stats} loading={progress.isLoading} error={progress.isError} retry={() => progress.refetch()} accent={accent} />}
          {tab === 'referrals' && (
            <ReferralsTab
              codeData={referrals.data}
              statsData={referralStats.data}
              loading={referrals.isLoading || referralStats.isLoading}
              accent={accent}
            />
          )}
          {tab === 'profile' && <ProfileTab data={data} accent={accent} onShowQr={() => setQrOpen(true)} onLogout={logout} />}
        </div>
      </PullToRefresh>

      <BottomNav
        activeTab={tab}
        onTabChange={setTab}
        unreadCount={notifications.data?.notifications?.length ?? 0}
        brandColor={accent}
      />
      <QRModal isOpen={qrOpen} onClose={() => setQrOpen(false)} memberCode={data.member.memberCode} />
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </MemberShell>
  );
}

function MemberShell({ children }: { children: ReactNode }) {
  return <main className="app-phone-container font-['Poppins',sans-serif] bg-[#f9f9fc] text-[#060517]">{children}</main>;
}

// ─── Referrals Tab ──────────────────────────────────────────────────────────

type ReferralCodeData = {
  campaign: {
    id: string;
    name: string;
    description?: string | null;
    rewardDescription?: string | null;
    refereeRewardDescription?: string | null;
    maxReferralsPerMember?: number | null;
    endsAt?: string | null;
  } | null;
  referralCode: string | null;
  referralLink: string | null;
};

type ReferralStatsData = {
  stats: { total: number; pending: number; converted: number; rewarded: number };
  referrals: Array<{
    id: string;
    status: string;
    referralCode: string;
    createdAt: string;
    campaign: { name: string };
    referredMember?: { user: { name: string } } | null;
  }>;
};

function ReferralsTab({
  codeData,
  statsData,
  loading,
  accent,
}: {
  codeData?: ReferralCodeData;
  statsData?: ReferralStatsData;
  loading: boolean;
  accent: string;
}) {
  const [copied, setCopied] = useState(false);

  const effectiveReferralLink = useMemo(() => {
    if (!codeData?.referralCode) return codeData?.referralLink ?? '';
    if (typeof window !== 'undefined') {
      try {
        const parsed = new URL(codeData.referralLink || '');
        if (parsed.hostname.includes('.') || parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1')) {
          return parsed.toString();
        }
      } catch {
        // Fallback below
      }
      return `${window.location.origin}/admission?ref=${codeData.referralCode}`;
    }
    return codeData.referralLink ?? '';
  }, [codeData]);

  const copyCode = async () => {
    if (!codeData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(codeData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
    }
  };

  const shareLink = async () => {
    if (!effectiveReferralLink) return;
    if (navigator.share) {
      await navigator.share({
        title: 'Join my gym!',
        text: `Use my referral code ${codeData?.referralCode} to join!`,
        url: effectiveReferralLink,
      }).catch(() => {/* user cancelled */});
    } else {
      await navigator.clipboard.writeText(effectiveReferralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusColor = (s: string) => ({
    pending: '#9c9ca3',
    converted: '#f59e0b',
    rewarded: '#10b981',
    expired: '#ef4444',
  }[s] ?? '#9c9ca3');

  const statusLabel = (s: string) => ({
    pending: 'Pending',
    converted: 'Converted ✓',
    rewarded: 'Rewarded 🎉',
    expired: 'Expired',
  }[s] ?? s);

  if (loading) {
    return (
      <div className="px-5 pt-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse-shimmer" />
        ))}
      </div>
    );
  }

  if (!codeData?.campaign) {
    return (
      <div className="flex min-h-[70svh] flex-col items-center justify-center px-8 text-center gap-4">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{ background: `${accent}22` }}
        >
          <Gift size={28} style={{ color: accent }} />
        </div>
        <h2 className="text-base font-bold text-[#060517]">No active referral campaign</h2>
        <p className="text-xs text-[#9c9ca3] leading-relaxed max-w-xs">
          Your gym hasn't started a referral campaign yet. Check back soon!
        </p>
      </div>
    );
  }

  const { campaign, referralCode, referralLink } = codeData;
  const stats = statsData?.stats;

  return (
    <div className="pb-28 overflow-y-auto scrollbar-hide">
      <div className="px-5 pt-6 space-y-5">

        {/* Campaign banner */}
        <div
          className="rounded-2xl p-4 space-y-1"
          style={{ background: `linear-gradient(135deg, ${accent}22 0%, ${accent}08 100%)`, border: `1px solid ${accent}33` }}
        >
          <div className="flex items-center gap-2">
            <Gift size={15} style={{ color: accent }} />
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>{campaign.name}</span>
          </div>
          {campaign.rewardDescription && (
            <p className="text-sm font-bold text-[#060517] leading-snug">{campaign.rewardDescription}</p>
          )}
          {campaign.refereeRewardDescription && (
            <p className="text-xs text-[#666] leading-relaxed">New member also gets: {campaign.refereeRewardDescription}</p>
          )}
          {campaign.endsAt && (
            <p className="text-[11px] text-[#9c9ca3]">Ends {new Date(campaign.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          )}
        </div>

        {/* Referral Code card */}
        <div className="rounded-2xl bg-white border border-[#e6e6e7] p-5 shadow-xs space-y-4">
          <p className="text-[11px] font-semibold text-[#9c9ca3] uppercase tracking-wide">Your Referral Code</p>
          <div
            className="rounded-xl flex items-center justify-center py-5"
            style={{ background: `${accent}11` }}
          >
            <span className="text-4xl font-black tracking-[0.15em] select-all" style={{ color: '#060517' }}>
              {referralCode}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 h-10 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{
                background: copied ? '#10b981' : accent,
                color: copied ? 'white' : '#060517',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 h-10 rounded-xl text-xs font-semibold bg-[#060517] text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            >
              Share Link
            </button>
          </div>
          {effectiveReferralLink && (
            <p className="text-[10px] text-[#9c9ca3] text-center break-all">{effectiveReferralLink}</p>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: stats.total, color: '#060517' },
              { label: 'Converted', value: stats.converted, color: '#f59e0b' },
              { label: 'Rewarded', value: stats.rewarded, color: '#10b981' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white border border-[#e6e6e7] p-3 text-center shadow-xs">
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-[#9c9ca3] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Referral history */}
        {statsData?.referrals && statsData.referrals.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[#9c9ca3] uppercase tracking-wide mb-3">Your Referrals</p>
            <div className="space-y-2">
              {statsData.referrals.map((r) => (
                <div key={r.id} className="rounded-xl bg-white border border-[#e6e6e7] px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#060517] truncate">
                      {r.referredMember?.user.name ?? 'Pending join...'}
                    </p>
                    <p className="text-[11px] text-[#9c9ca3] mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold rounded-full px-2.5 py-1 shrink-0"
                    style={{
                      color: statusColor(r.status),
                      background: `${statusColor(r.status)}18`,
                    }}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.total === 0 && (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-[#060517]">No referrals yet</p>
            <p className="text-xs text-[#9c9ca3] mt-1">Share your code and watch your referrals grow!</p>
          </div>
        )}

      </div>
    </div>
  );
}

function HomeTab({ data, workout, diet, loadingPlans, accent, onShowQr }: { data: MemberProfile; workout?: WorkoutAssignment | null; diet?: DietAssignment | null; loadingPlans: boolean; accent: string; onShowQr: () => void }) {
  const attendance = useMemo(() => {
    const checked = new Set(data.attendanceLast7Days);
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date();
      value.setDate(value.getDate() - (6 - index));
      return {
        key: localDateKey(value),
        label: value.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3).toUpperCase(),
        checked: checked.has(localDateKey(value)),
        isToday: index === 6,
      };
    });
  }, [data.attendanceLast7Days]);

  const feeTone = data.feeStatus === 'paid' ? 'text-[#10b981]' : data.feeStatus === 'due' ? 'text-[#F59E0B]' : 'text-[#EF4444]';

  const daysRemaining = data.subscription?.daysRemaining ?? 0;
  const progressPercent = Math.max(8, Math.min(100, Math.round((daysRemaining / 30) * 100)));
  const todayFormatted = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4 px-5 pb-24 pt-3">
      {/* ─── User Panel (from Template .user-panel) ─── */}
      <div className="bg-white rounded-2xl p-4 border border-[#f0f0f2] shadow-xs flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-1">
          <div className="h-8 w-8 rounded-lg border border-[#e6e6e7] flex items-center justify-center text-[#060517]">
            <Sparkles size={15} className="text-[#ffcb1c]" />
          </div>
          <div className="relative">
            <div
              className="h-14 w-14 rounded-full overflow-hidden border-2 border-white shadow-[0_0_12px_3px_#f6f6f7] flex items-center justify-center font-bold text-sm text-[#060517]"
              style={{ backgroundColor: accent }}
            >
              {data.member.avatarUrl ? (
                <img src={data.member.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                data.member.name.slice(0, 1).toUpperCase()
              )}
            </div>
          </div>
          <button
            onClick={onShowQr}
            className="h-8 w-8 rounded-lg border border-[#e6e6e7] flex items-center justify-center text-[#060517] active:scale-95 cursor-pointer hover:bg-[#f9f9fc]"
            aria-label="Open QR"
          >
            <QrCode size={15} />
          </button>
        </div>
        <p className="text-sm font-semibold text-[#060517] mt-1">{data.member.name}</p>
        <p className="text-[11px] font-medium text-[#9c9ca3]">@{data.member.memberCode}</p>
      </div>

      {/* ─── Lessons / Subscription Card (from Template .lessons) ─── */}
      <div className="bg-white rounded-2xl p-4 border border-[#f0f0f2] shadow-xs flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#060517] truncate">
              {data.subscription?.planName ?? 'Membership'}
            </p>
            <span className="text-[11px] font-medium text-[#9c9ca3] shrink-0">
              {data.subscription ? `${data.subscription.daysRemaining} days left` : 'No plan'}
            </span>
          </div>
          {/* Yellow range progress bar */}
          <div className="w-full h-1.5 bg-[#e6e6e7] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ffcb1c] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <button
          onClick={onShowQr}
          className="h-9 w-9 bg-[#060517] rounded-xl flex items-center justify-center text-white shrink-0 active:scale-95 cursor-pointer shadow-xs"
          title="Show membership QR"
        >
          <QrCode size={16} className="text-[#ffcb1c]" />
        </button>
      </div>

      {/* ─── Classes Today (from Template .classes-today) ─── */}
      <div className="bg-white rounded-2xl p-4 border border-[#f0f0f2] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7]">
          <p className="text-xs font-semibold text-[#060517]">Today, {todayFormatted}</p>
          <CalendarCheck size={16} className="text-[#ffcb1c]" />
        </div>
        <div className="mt-3 space-y-2.5">
          <div className="border-l-[3px] border-[#ffcb1c] pl-3 py-0.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#060517]">
              <span>Daily Attendance</span>
              <span className="text-[11px] font-normal text-[#9c9ca3]">
                {data.stats.checkedInToday ? 'Checked in' : 'Not checked in'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#9c9ca3] mt-0.5">
              <span>{data.gym.name}</span>
              <span>{data.stats.checkedInToday ? 'Present' : 'Tap to scan'}</span>
            </div>
          </div>
          {workout?.workoutPlan?.days?.[0] && (
            <div className="border-l-[3px] border-[#9c9ca3] pl-3 py-0.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#060517]">
                <span>{workout.workoutPlan.days[0].dayName || 'Workout Routine'}</span>
                <span className="text-[11px] font-normal text-[#9c9ca3]">
                  {workout.workoutPlan.days[0].exercises.length} exercises
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#9c9ca3] mt-0.5">
                <span className="truncate max-w-[200px]">
                  {workout.workoutPlan.days[0].exercises.slice(0, 2).map((e) => e.exercise.name).join(', ')}
                </span>
                <span>Active Plan</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Metrics 3-Column Row ─── */}
      <div className="grid grid-cols-3 gap-2.5">
        <Metric value={data.stats.totalVisits} label="All visits" />
        <Metric value={data.stats.monthVisits} label="This month" />
        <Metric value={data.feeStatus} label="Fees" valueClassName={feeTone} />
      </div>

      {/* ─── Last 7 Days Attendance (from Template .days) ─── */}
      <section className="bg-white rounded-2xl p-4 border border-[#f0f0f2] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#060517]">Attendance</p>
          <span className="text-[10px] font-medium text-[#9c9ca3]">Last 7 days</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {attendance.map((day) => (
            <div
              key={day.key}
              className={`flex-1 flex flex-col items-center py-2 rounded-lg text-center transition-all ${
                day.checked
                  ? 'bg-[#ffcb1c] text-[#060517] font-bold shadow-xs'
                  : 'text-[#9c9ca3] hover:bg-[#f9f9fc]'
              }`}
            >
              <span className="text-[9px] font-semibold tracking-wider">{day.label}</span>
              <span className="mt-1 text-[11px] leading-none">
                {day.checked ? '✓' : '·'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Invite a Friend Banner (from Template .invite-friend) ─── */}
      <div
        onClick={onShowQr}
        className="bg-[#ffcb1c] rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform text-[#060517]"
      >
        <div>
          <p className="text-xs font-bold leading-tight">Invite a gym buddy!</p>
          <p className="text-[11px] font-medium opacity-85 mt-0.5">Show QR to train together & get rewards</p>
        </div>
        <div className="h-9 w-9 bg-[#060517] text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
          <QrCode size={17} className="text-[#ffcb1c]" />
        </div>
      </div>

      {/* ─── Plan Section (Workout and Diet) ─── */}
      <section>
        <SectionHeading icon={Dumbbell} title="Your plan" hint="Workout and nutrition" />
        <div className="mt-2.5 space-y-2.5">
          {loadingPlans ? <CardSkeleton count={2} /> : <>
            <PlanCard icon={Dumbbell} title={workout?.workoutPlan.name ?? 'No workout assigned'} subtitle={workout ? `${workout.workoutPlan.days.length} training days` : 'Ask your coach for a plan'} accent={accent}>
              {workout?.workoutPlan.days.map((day) => (
                <div key={day.id} className="border-t border-[#f5f5f7] py-2.5 first:border-0">
                  <p className="text-xs font-bold text-[#060517]">{day.dayName || `Day ${day.dayNumber}`}</p>
                  <p className="mt-0.5 text-[11px] text-[#9c9ca3]">{day.exercises.map((entry) => entry.exercise.name).join(' · ') || 'Recovery day'}</p>
                </div>
              ))}
            </PlanCard>
            <PlanCard icon={Salad} title={diet?.dietChart.name ?? 'No diet chart assigned'} subtitle={diet ? `${diet.dietChart.meals.length} meals in your day` : 'Ask your coach for a nutrition plan'} accent={accent}>
              {diet?.dietChart.meals.map((meal) => (
                <div key={meal.id} className="flex gap-3 border-t border-[#f5f5f7] py-2.5 first:border-0">
                  <span className="w-14 shrink-0 text-[11px] font-semibold text-[#9c9ca3]">{meal.timeSuggestion || meal.mealType}</span>
                  <div>
                    <p className="text-xs font-bold text-[#060517]">{meal.mealName}</p>
                    {(meal.description || meal.calories) && <p className="mt-0.5 text-[11px] text-[#9c9ca3]">{meal.description || `${meal.calories} kcal`}</p>}
                  </div>
                </div>
              ))}
            </PlanCard>
          </>}
        </div>
      </section>
    </div>
  );
}

function NotificationsTab({
  items,
  loading,
  error,
  retry,
  onSelectNotification,
}: {
  items?: Notification[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  onSelectNotification: (item: Notification) => void;
}) {
  if (loading) return <NotificationsTabSkeleton />;
  if (error) return <QueryError title="Could not load alerts" retry={retry} />;

  return (
    <div className="px-5 pb-24 pt-4">
      <PageTitle title="Notifications" subtitle="Updates and greetings from your gym" />
      {/* Only shown here when NOT yet enabled. Once turned on, it is hidden here and accessible in Profile/Settings */}
      <div className="mt-3">
        <PushNotificationCard hideWhenEnabled={true} />
      </div>

      {items?.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const theme = getTheme(item.metadata?.theme);
            const attachmentUrl = item.metadata?.attachmentUrl;
            const attachmentType = item.metadata?.attachmentType;
            const isImg = attachmentUrl && (attachmentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(attachmentUrl));

            return (
              <article
                key={item.id}
                onClick={() => onSelectNotification(item)}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-[#f0f0f2] bg-white shadow-xs active:scale-[0.98] transition-transform"
              >
                {theme && (
                  <div
                    className="flex items-center justify-between px-4 py-2 text-white"
                    style={{ background: theme.gradient }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span>{theme.emoji}</span>
                      <span>{theme.label}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm select-none">
                      <span>{theme.particles[0]}</span>
                      <span>{theme.particles[1]}</span>
                      <span>{theme.particles[2]}</span>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {!theme && (
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f5f5f7] text-[#9c9ca3]">
                        {item.channel === 'push' ? <Bell size={15} /> : <Mail size={15} />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-xs font-bold text-[#060517] leading-snug">{item.title}</h2>
                        <time className="shrink-0 text-[10px] text-[#9c9ca3] mt-0.5">{formatDate(item.sentAt ?? item.createdAt)}</time>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[#666] line-clamp-2">{item.body}</p>
                    </div>
                  </div>

                  {attachmentUrl && isImg && (
                    <div className="mt-3 overflow-hidden rounded-xl bg-[#f5f5f7]" style={{ maxHeight: '180px' }}>
                      <img
                        src={attachmentUrl}
                        alt=""
                        className="w-full h-full object-cover block"
                        style={{ maxHeight: '180px', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  {attachmentUrl && !isImg && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#f0f0f2] bg-[#f9f9fc] px-3 py-2">
                      <FileText size={14} className="shrink-0 text-[#9c9ca3]" />
                      <span className="truncate text-xs text-[#666]">{item.metadata?.attachmentName || 'Attached file'}</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1 text-[10px] text-[#9c9ca3]">
                    <ChevronRight size={12} />
                    <span>Tap to read</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Bell} title="No notifications yet" message="Updates, celebrations, and festive greetings from your gym will appear here." />
      )}
    </div>
  );
}

function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const theme = getTheme(notification.metadata?.theme);
  const attachmentUrl = notification.metadata?.attachmentUrl;
  const attachmentType = notification.metadata?.attachmentType;
  const isImg = attachmentUrl && (attachmentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(attachmentUrl));
  const isDoc = attachmentUrl && !isImg;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[430px] max-h-[85vh] flex flex-col bg-white rounded-t-[1.5rem] border-t border-[#e6e6e7] shadow-2xl text-[#060517] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="flex justify-center pt-2.5 pb-1 bg-white shrink-0">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header with Theme Gradient or Default Gradient */}
        <div
          className="shrink-0 px-5 py-3.5 flex items-center justify-between"
          style={{ background: theme ? theme.gradient : 'linear-gradient(135deg, #ffcb1c, #ffd137)' }}
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <span className="text-xl shrink-0 leading-none">{theme?.emoji || '📣'}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/70 leading-tight">
                {theme?.label || 'Gym Notification'}
              </p>
              <h3 className="text-sm font-bold text-[#060517] truncate leading-tight mt-0.5">{notification.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-black/20 hover:bg-black/30 p-1.5 text-white active:scale-95 transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Subheader */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-[#f0f0f2] text-xs text-[#9c9ca3] bg-white">
          <span className="font-medium">
            {notification.channel === 'push' ? '🔔 Push' : notification.channel === 'email' ? '✉️ Email' : '🔔 ✉️ Push & Email'}
          </span>
          <time className="font-medium">{formatDate(notification.sentAt ?? notification.createdAt)}</time>
        </div>

        {/* Scrollable Content with min-h-0 so flex child can shrink properly */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          <div className="text-xs leading-relaxed text-[#333] whitespace-pre-wrap">
            {notification.body}
          </div>

          {/* Adaptive Image Container: capped max height, centered, never overflows */}
          {attachmentUrl && isImg && (
            <div className="w-full rounded-2xl bg-[#f5f5f7] border border-[#e6e6e7] flex items-center justify-center p-1.5 overflow-hidden">
              <img
                src={attachmentUrl}
                alt={notification.title}
                className="w-full max-h-[260px] object-contain rounded-xl block"
              />
            </div>
          )}

          {/* Document Attachment */}
          {attachmentUrl && isDoc && (
            <button
              type="button"
              onClick={() => window.open(attachmentUrl, '_blank')}
              className="w-full flex items-center gap-3 rounded-xl border border-[#f0f0f2] bg-[#f9f9fc] px-4 py-3 text-left hover:bg-[#f2f2f5] active:scale-[0.99] transition-all"
            >
              <FileText size={20} className="shrink-0 text-[#9c9ca3]" />
              <span className="truncate text-xs font-semibold text-[#060517] flex-1">
                {notification.metadata?.attachmentName || 'Attached document'}
              </span>
              <ChevronRight size={16} className="shrink-0 text-[#9c9ca3]" />
            </button>
          )}
        </div>

        {/* Pinned Bottom Close Button */}
        <div className="shrink-0 border-t border-[#f0f0f2] px-5 py-3 pb-[max(14px,env(safe-area-inset-bottom))] bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-[#060517] text-xs font-semibold text-white active:scale-[0.97] shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function applicationServerKey(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`;
  const bytes = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

function PushNotificationCard({ hideWhenEnabled = false }: { hideWhenEnabled?: boolean } = {}) {
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const status = useQuery({
    queryKey: ['member-app', 'push-status'],
    queryFn: () => apiClient.get<{ configured: boolean; publicKey: string | null; subscriptions: number }>('/push/status').then((response) => response.data),
    retry: false,
  });
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setDeviceEnabled(Boolean(subscription))).catch(() => undefined);
  }, [supported]);

  const toggle = useMutation({
    mutationFn: async () => {
      if (!supported) throw new Error('Push notifications are not supported on this device');
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await apiClient.delete('/push/subscribe', { data: { endpoint: current.endpoint } });
        await current.unsubscribe();
        setDeviceEnabled(false);
        setMessage('Notifications disabled on this device.');
        return;
      }
      if (!status.data?.configured || !status.data.publicKey) throw new Error('Push notifications are not configured yet');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted');
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(status.data.publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('The browser returned an incomplete push subscription');
      await apiClient.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
      setDeviceEnabled(true);
      setMessage('Notifications enabled. You can now receive alerts when the app is closed.');
    },
    onError: (error) => setMessage((error as Error).message),
  });

  const Icon = deviceEnabled ? BellRing : BellOff;
  if (hideWhenEnabled && deviceEnabled) return null;
  return (
    <section className="mt-4 rounded-2xl border border-[#f0f0f2] bg-white p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${deviceEnabled ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#f5f5f7] text-[#9c9ca3]'}`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#060517]">{deviceEnabled ? 'Screen notifications enabled' : 'Get screen notifications'}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#9c9ca3]">Receive gym alerts even when this app and browser are closed.</p>
        </div>
      </div>
      {message && <p className="mt-2.5 text-[11px] leading-relaxed text-[#666]">{message}</p>}
      <button
        type="button"
        disabled={status.isLoading || toggle.isPending || !supported || !status.data?.configured}
        onClick={() => toggle.mutate()}
        className="mt-3.5 h-10 w-full rounded-xl bg-[#060517] px-4 text-xs font-semibold text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-40 btn-tap"
      >
        {toggle.isPending ? 'Updating...' : deviceEnabled ? 'Disable on this device' : 'Enable notifications'}
      </button>
      {!supported && <p className="mt-2 text-[11px] text-[#F59E0B]">Install the PWA to enable push notifications.</p>}
      {status.data && !status.data.configured && <p className="mt-2 text-[11px] text-[#F59E0B]">Push delivery needs VAPID keys on the server.</p>}
    </section>
  );
}

function ProgressTab({ items, loading, error, retry, accent }: { items?: BodyStat[]; loading: boolean; error: boolean; retry: () => void; accent: string }) {
  if (loading) return <ProgressTabSkeleton />;
  if (error) return <QueryError title="Could not load progress" retry={retry} />;
  const latest = items?.[0];
  return (
    <div className="px-5 pb-24 pt-4">
      <PageTitle title="Progress" subtitle="Your latest body measurements" />
      {latest ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Measurement label="Weight" value={latest.weightKg} unit="kg" accent={accent} />
            <Measurement label="Body fat" value={latest.bodyFatPct} unit="%" accent={accent} />
            <Measurement label="Chest" value={latest.chestCm} unit="cm" accent={accent} />
            <Measurement label="Waist" value={latest.waistCm} unit="cm" accent={accent} />
          </div>
          <section className="mt-5">
            <SectionHeading icon={TrendingUp} title="History" hint={`${items?.length ?? 0} measurements`} />
            <div className="mt-2.5 overflow-hidden rounded-2xl border border-[#f0f0f2] bg-white shadow-xs">
              {items?.map((item) => (
                <div key={item.id} className="flex min-h-14 items-center justify-between border-b border-[#f5f5f7] px-4 last:border-0">
                  <span className="text-xs text-[#9c9ca3]">{formatDate(item.recordedAt)}</span>
                  <span className="text-xs font-bold text-[#060517]">{item.weightKg ? `${item.weightKg} kg` : 'Measurements updated'}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState icon={Activity} title="No measurements yet" message="Your progress will appear after your coach records your first measurements." />
      )}
    </div>
  );
}

function ProfileTab({ data, accent, onShowQr, onLogout }: { data: MemberProfile; accent: string; onShowQr: () => void; onLogout: () => Promise<void> }) {
  return (
    <div className="px-5 pb-24 pt-6">
      <div className="flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full text-2xl font-bold text-[#060517] shadow-md border-2 border-white" style={{ backgroundColor: accent }}>
          {data.member.avatarUrl ? <img src={data.member.avatarUrl} alt="" className="h-full w-full object-cover" /> : data.member.name.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-3 text-base font-bold text-[#060517]">{data.member.name}</h1>
        <p className="mt-0.5 font-mono text-xs text-[#9c9ca3]">Code: {data.member.memberCode}</p>
      </div>
      <button onClick={onShowQr} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-white bg-[#060517] shadow-sm active:scale-[0.97]">
        <QrCode size={16} className="text-[#ffcb1c]" /> Show membership QR
      </button>
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#f0f0f2] bg-white shadow-xs">
        <ProfileRow label="Phone" value={data.member.phone} />
        <ProfileRow label="Email" value={data.member.email ?? 'Not added'} />
        <ProfileRow label="Member since" value={formatDate(data.member.joinedAt)} />
        <ProfileRow label="Current plan" value={data.subscription?.planName ?? 'No active plan'} />
      </section>
      <button onClick={() => void onLogout()} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 text-xs font-semibold text-[#ef4444] active:scale-[0.97]">
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}

function Metric({ value, label, valueClassName = '' }: { value: string | number; label: string; valueClassName?: string }) {
  return (
    <div className="rounded-2xl border border-[#f0f0f2] bg-white p-3.5 shadow-xs text-center">
      <p className={`truncate text-base font-bold capitalize tabular-nums text-[#060517] ${valueClassName}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-[#9c9ca3]">{label}</p>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, hint }: { icon: ElementType; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-[#060517]" />
      <h2 className="flex-1 text-xs font-bold text-[#060517]">{title}</h2>
      <span className="text-[10px] text-[#9c9ca3]">{hint}</span>
    </div>
  );
}

function PlanCard({ icon: Icon, title, subtitle, accent, children }: { icon: ElementType; title: string; subtitle: string; accent: string; children?: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-[#f0f0f2] bg-white px-4 shadow-xs">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 py-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl font-bold bg-[#ffcb1c]/20 text-[#060517]">
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-[#060517]">{title}</span>
          <span className="mt-0.5 block text-[11px] text-[#9c9ca3]">{subtitle}</span>
        </span>
        {children && <ChevronRight size={16} className="text-[#9c9ca3] transition-transform group-open:rotate-90" />}
      </summary>
      {children && <div className="pb-3">{children}</div>}
    </details>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-[#060517]">{title}</h1>
      <p className="mt-0.5 text-xs text-[#9c9ca3]">{subtitle}</p>
    </div>
  );
}

function Measurement({ label, value, unit, accent }: { label: string; value: string | number | null; unit: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[#f0f0f2] bg-white p-4 shadow-xs">
      <p className="text-[11px] font-semibold text-[#9c9ca3]">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-[#060517]">
        {value ?? '—'}{value != null && <span className="ml-1 text-xs font-normal text-[#9c9ca3]">{unit}</span>}
      </p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#f5f5f7] px-4 last:border-0 text-xs">
      <span className="text-[#9c9ca3]">{label}</span>
      <span className="max-w-[60%] truncate text-right font-semibold text-[#060517]">{value}</span>
    </div>
  );
}

function CardSkeleton({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, index) => <div key={index} className="h-16 rounded-2xl bg-gray-200/70 animate-pulse" />)}</>;
}

function EmptyState({ icon: Icon, title, message }: { icon: ElementType; title: string; message: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ffcb1c]/15 text-[#060517]"><Icon size={22} /></div>
      <h2 className="mt-3 text-sm font-bold text-[#060517]">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#9c9ca3]">{message}</p>
    </div>
  );
}

function QueryError({ title, retry }: { title: string; retry: () => void }) {
  return (
    <div className="px-5 py-20 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ffcb1c]/15 text-[#060517]"><RefreshCw size={22} /></div>
      <h1 className="mt-3 text-sm font-bold text-[#060517]">{title}</h1>
      <p className="mt-1 text-xs text-[#9c9ca3]">Check your connection and try again.</p>
      <button onClick={retry} className="mt-4 h-10 rounded-xl bg-[#060517] px-5 text-xs font-semibold text-white shadow-xs active:scale-[0.97]">Try again</button>
    </div>
  );
}

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
  LogOut,
  LoaderCircle,
  Mail,
  QrCode,
  RefreshCw,
  Salad,
  TrendingUp,
  User,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
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
};

type CheckInPayload = { gymId: string; token: string };
type CheckInNotice = { type: 'success' | 'error'; message: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const fallbackAccent = '#E85D04';
const pendingCheckInKey = 'gymos-pending-checkin';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-[#888]"><User size={26} /></div>
            <h1 className="mt-4 text-xl font-semibold">{isNotMember ? 'Member account required' : 'Unable to load your account'}</h1>
            <p className="mt-2 text-sm leading-6 text-[#888]">{isNotMember ? 'This space is only available to members linked to a gym.' : 'Check your connection and try again.'}</p>
            <button onClick={() => isNotMember ? router.replace('/dashboard') : profile.refetch()} className="mt-5 h-12 rounded-xl px-5 text-sm font-medium text-white active:scale-[0.97]" style={{ backgroundColor: fallbackAccent }}>
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
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0F0F0F]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl text-white" style={{ backgroundColor: accent }}>
            {data.gym.logoUrl ? <img src={data.gym.logoUrl} alt="" className="h-full w-full object-cover" /> : <Dumbbell size={19} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{data.gym.name}</p>
            <p className="truncate text-xs text-[#888]">Hello, {data.member.name.split(' ')[0]}</p>
          </div>
          <button onClick={() => setQrOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#F5F5F0] active:scale-[0.94]" aria-label="Open membership QR code">
            <QrCode size={20} />
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
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${checkInNotice?.type === 'error' ? 'border-[#EF4444]/20 bg-[#EF4444]/10' : checkInNotice?.type === 'success' ? 'border-[#22C55E]/20 bg-[#22C55E]/10' : 'border-white/[0.07] bg-[#1A1A1A]'}`}>
            {checkIn.isPending ? <LoaderCircle className="mt-0.5 shrink-0 animate-spin text-[#888]" size={19} /> : checkInNotice?.type === 'success' ? <CircleCheck className="mt-0.5 shrink-0 text-[#22C55E]" size={19} /> : checkInNotice?.type === 'error' ? <CircleX className="mt-0.5 shrink-0 text-[#EF4444]" size={19} /> : <CalendarCheck className="mt-0.5 shrink-0" size={19} style={{ color: accent }} />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{checkIn.isPending ? 'Checking you in…' : checkInNotice?.type === 'success' ? 'Check-in complete' : checkInNotice?.type === 'error' ? 'Could not check in' : 'Mark today’s attendance?'}</p>
              {checkInNotice ? <p className="mt-1 text-xs leading-5 text-[#888]">{checkInNotice.message}</p> : <p className="mt-1 text-xs leading-5 text-[#888]">Confirm that you are at {data.gym.name} now.</p>}
            </div>
            {checkInNotice?.type === 'error' && pendingCheckIn && <button onClick={() => { setCheckInNotice(null); checkIn.mutate(pendingCheckIn); }} className="h-9 shrink-0 rounded-lg bg-white/[0.08] px-3 text-xs font-medium active:scale-95">Retry</button>}
            {!checkInNotice && !checkIn.isPending && pendingCheckIn && <div className="flex shrink-0 flex-col gap-1"><button onClick={() => checkIn.mutate(pendingCheckIn)} className="h-10 rounded-lg px-3 text-xs font-medium text-white active:scale-95" style={{ backgroundColor: accent }}>Mark present</button><button onClick={() => { window.sessionStorage.removeItem(pendingCheckInKey); window.history.replaceState({}, '', '/member-app'); setPendingCheckIn(null); }} className="h-7 text-[11px] text-[#888] active:scale-95">Not now</button></div>}
          </div>
        </div>
      )}

      <PullToRefresh onRefresh={refresh} brandColor={accent}>
        <div key={tab} className="member-tab-enter">
          {tab === 'home' && <HomeTab data={data} workout={workout.data} diet={diet.data} loadingPlans={workout.isLoading || diet.isLoading} accent={accent} onShowQr={() => setQrOpen(true)} />}
          {tab === 'notifications' && <NotificationsTab items={notifications.data?.notifications} loading={notifications.isLoading} error={notifications.isError} retry={() => notifications.refetch()} />}
          {tab === 'progress' && <ProgressTab items={progress.data?.stats} loading={progress.isLoading} error={progress.isError} retry={() => progress.refetch()} accent={accent} />}
          {tab === 'profile' && <ProfileTab data={data} accent={accent} onShowQr={() => setQrOpen(true)} onLogout={logout} />}
        </div>
      </PullToRefresh>

      <BottomNav activeTab={tab} onTabChange={setTab} unreadCount={0} brandColor={accent} />
      <QRModal isOpen={qrOpen} onClose={() => setQrOpen(false)} memberCode={data.member.memberCode} />
    </MemberShell>
  );
}

function MemberShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex h-svh w-full max-w-[430px] flex-col overflow-hidden bg-[#0F0F0F] font-['DM_Sans'] text-[#F5F5F0] shadow-2xl shadow-black">{children}</main>;
}

function HomeTab({ data, workout, diet, loadingPlans, accent, onShowQr }: { data: MemberProfile; workout?: WorkoutAssignment | null; diet?: DietAssignment | null; loadingPlans: boolean; accent: string; onShowQr: () => void }) {
  const attendance = useMemo(() => {
    const checked = new Set(data.attendanceLast7Days);
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date();
      value.setDate(value.getDate() - (6 - index));
      return { key: localDateKey(value), label: value.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1), checked: checked.has(localDateKey(value)) };
    });
  }, [data.attendanceLast7Days]);
  const feeTone = data.feeStatus === 'paid' ? 'text-[#22C55E]' : data.feeStatus === 'due' ? 'text-[#F59E0B]' : 'text-[#EF4444]';

  return (
    <div className="space-y-6 px-5 pb-8 pt-5">
      <section className="relative overflow-hidden rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}B8)` }}>
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <p className="text-sm text-white/75">Your membership</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.subscription?.planName ?? 'No active plan'}</h1>
        <p className="mt-2 text-sm text-white/80">{data.subscription ? `${data.subscription.daysRemaining} days remaining · Ends ${formatDate(data.subscription.endDate)}` : 'Contact reception to activate your membership.'}</p>
        <button onClick={onShowQr} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-[#111] active:scale-[0.97]">
          <QrCode size={18} /> Show membership QR
        </button>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <Metric value={data.stats.totalVisits} label="All visits" />
        <Metric value={data.stats.monthVisits} label="This month" />
        <Metric value={data.feeStatus} label="Fees" valueClassName={feeTone} />
      </div>

      <section>
        <SectionHeading icon={CalendarCheck} title="Last 7 days" hint={data.stats.checkedInToday ? 'Checked in today' : 'Not checked in today'} />
        <div className="mt-3 flex justify-between rounded-2xl border border-white/[0.07] bg-[#1A1A1A] p-4">
          {attendance.map((day) => <div key={day.key} className="flex flex-col items-center gap-2"><span className="text-[11px] text-[#888]">{day.label}</span><span className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: day.checked ? `${accent}25` : 'rgba(255,255,255,0.04)', color: day.checked ? accent : '#555' }}>{day.checked ? <CircleCheck size={17} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span></div>)}
        </div>
      </section>

      <section>
        <SectionHeading icon={Dumbbell} title="Your plan" hint="Workout and nutrition" />
        <div className="mt-3 space-y-3">
          {loadingPlans ? <CardSkeleton count={2} /> : <>
            <PlanCard icon={Dumbbell} title={workout?.workoutPlan.name ?? 'No workout assigned'} subtitle={workout ? `${workout.workoutPlan.days.length} training days` : 'Ask your coach for a plan'} accent={accent}>
              {workout?.workoutPlan.days.map((day) => <div key={day.id} className="border-t border-white/[0.06] py-3 first:border-0"><p className="text-sm font-medium">{day.dayName || `Day ${day.dayNumber}`}</p><p className="mt-1 text-xs text-[#888]">{day.exercises.map((entry) => entry.exercise.name).join(' · ') || 'Recovery day'}</p></div>)}
            </PlanCard>
            <PlanCard icon={Salad} title={diet?.dietChart.name ?? 'No diet chart assigned'} subtitle={diet ? `${diet.dietChart.meals.length} meals in your day` : 'Ask your coach for a nutrition plan'} accent={accent}>
              {diet?.dietChart.meals.map((meal) => <div key={meal.id} className="flex gap-3 border-t border-white/[0.06] py-3 first:border-0"><span className="w-14 shrink-0 text-xs text-[#888]">{meal.timeSuggestion || meal.mealType}</span><div><p className="text-sm font-medium">{meal.mealName}</p>{(meal.description || meal.calories) && <p className="mt-1 text-xs text-[#888]">{meal.description || `${meal.calories} kcal`}</p>}</div></div>)}
            </PlanCard>
          </>}
        </div>
      </section>
    </div>
  );
}

function NotificationsTab({ items, loading, error, retry }: { items?: Notification[]; loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <NotificationsTabSkeleton />;
  if (error) return <QueryError title="Could not load alerts" retry={retry} />;
  return <div className="px-5 pb-8 pt-7"><PageTitle title="Notifications" subtitle="Updates from your gym" /><PushNotificationCard />{items?.length ? <div className="mt-5 space-y-3">{items.map((item) => <article key={item.id} className="flex min-h-20 gap-3 rounded-2xl border border-white/[0.07] bg-[#1A1A1A] p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-[#888]">{item.channel === 'push' ? <Bell size={18} /> : <Mail size={18} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="text-sm font-medium">{item.title}</h2><time className="shrink-0 text-[10px] text-[#555]">{formatDate(item.sentAt ?? item.createdAt)}</time></div><p className="mt-1 text-xs leading-5 text-[#888]">{item.body}</p></div></article>)}</div> : <EmptyState icon={Bell} title="No notifications yet" message="Updates and reminders from your gym will appear here." />}</div>;
}

function applicationServerKey(value: string) {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`;
  const bytes = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

function PushNotificationCard() {
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
  return <section className="mt-5 rounded-2xl border border-white/[0.07] bg-[#1A1A1A] p-4"><div className="flex items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${deviceEnabled ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-white/[0.05] text-[#888]'}`}><Icon size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{deviceEnabled ? 'Screen notifications enabled' : 'Get screen notifications'}</p><p className="mt-1 text-xs leading-5 text-[#888]">Receive gym alerts even when this app and browser are closed.</p></div></div>{message && <p className="mt-3 text-xs leading-5 text-[#AAA]">{message}</p>}<button type="button" disabled={status.isLoading || toggle.isPending || !supported || !status.data?.configured} onClick={() => toggle.mutate()} className="mt-4 h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-[#111] disabled:cursor-not-allowed disabled:opacity-40">{toggle.isPending ? 'Updating...' : deviceEnabled ? 'Disable on this device' : 'Enable notifications'}</button>{!supported && <p className="mt-3 text-xs text-[#F59E0B]">Install the PWA and use a supported browser to enable notifications.</p>}{status.data && !status.data.configured && <p className="mt-3 text-xs text-[#F59E0B]">Push delivery needs VAPID keys on the server.</p>}</section>;
}

function ProgressTab({ items, loading, error, retry, accent }: { items?: BodyStat[]; loading: boolean; error: boolean; retry: () => void; accent: string }) {
  if (loading) return <ProgressTabSkeleton />;
  if (error) return <QueryError title="Could not load progress" retry={retry} />;
  const latest = items?.[0];
  return <div className="px-5 pb-8 pt-7"><PageTitle title="Progress" subtitle="Your latest body measurements" />{latest ? <><div className="mt-5 grid grid-cols-2 gap-3"><Measurement label="Weight" value={latest.weightKg} unit="kg" accent={accent} /><Measurement label="Body fat" value={latest.bodyFatPct} unit="%" accent={accent} /><Measurement label="Chest" value={latest.chestCm} unit="cm" accent={accent} /><Measurement label="Waist" value={latest.waistCm} unit="cm" accent={accent} /></div><section className="mt-6"><SectionHeading icon={TrendingUp} title="History" hint={`${items?.length ?? 0} measurements`} /><div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1A1A1A]">{items?.map((item) => <div key={item.id} className="flex min-h-16 items-center justify-between border-b border-white/[0.05] px-4 last:border-0"><span className="text-sm text-[#888]">{formatDate(item.recordedAt)}</span><span className="text-sm font-medium">{item.weightKg ? `${item.weightKg} kg` : 'Measurements updated'}</span></div>)}</div></section></> : <EmptyState icon={Activity} title="No measurements yet" message="Your progress will appear after your coach records your first measurements." />}</div>;
}

function ProfileTab({ data, accent, onShowQr, onLogout }: { data: MemberProfile; accent: string; onShowQr: () => void; onLogout: () => Promise<void> }) {
  return <div className="px-5 pb-8 pt-7"><div className="flex flex-col items-center text-center"><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full text-2xl font-semibold text-white" style={{ backgroundColor: accent }}>{data.member.avatarUrl ? <img src={data.member.avatarUrl} alt="" className="h-full w-full object-cover" /> : data.member.name.slice(0, 1).toUpperCase()}</div><h1 className="mt-4 text-xl font-semibold">{data.member.name}</h1><p className="mt-1 font-mono text-xs tracking-wider text-[#888]">{data.member.memberCode}</p></div><button onClick={onShowQr} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-white active:scale-[0.97]" style={{ backgroundColor: accent }}><QrCode size={19} /> Show membership QR</button><section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1A1A1A]"><ProfileRow label="Phone" value={data.member.phone} /><ProfileRow label="Email" value={data.member.email ?? 'Not added'} /><ProfileRow label="Member since" value={formatDate(data.member.joinedAt)} /><ProfileRow label="Current plan" value={data.subscription?.planName ?? 'No active plan'} /></section><button onClick={() => void onLogout()} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/10 text-sm font-medium text-[#EF4444] active:scale-[0.97]"><LogOut size={18} /> Sign out</button></div>;
}

function Metric({ value, label, valueClassName = '' }: { value: string | number; label: string; valueClassName?: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-[#1A1A1A] p-3"><p className={`truncate text-lg font-semibold capitalize tabular-nums ${valueClassName}`}>{value}</p><p className="mt-1 text-[11px] text-[#888]">{label}</p></div>;
}

function SectionHeading({ icon: Icon, title, hint }: { icon: ElementType; title: string; hint: string }) {
  return <div className="flex items-center gap-2"><Icon size={18} className="text-[#888]" /><h2 className="flex-1 text-base font-medium">{title}</h2><span className="text-[11px] text-[#555]">{hint}</span></div>;
}

function PlanCard({ icon: Icon, title, subtitle, accent, children }: { icon: ElementType; title: string; subtitle: string; accent: string; children?: ReactNode }) {
  return <details className="group rounded-2xl border border-white/[0.07] bg-[#1A1A1A] px-4"><summary className="flex min-h-20 cursor-pointer list-none items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: `${accent}20`, color: accent }}><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-[#888]">{subtitle}</span></span>{children && <ChevronRight size={18} className="text-[#555] transition-transform group-open:rotate-90" />}</summary>{children && <div className="pb-2">{children}</div>}</details>;
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h1 className="text-[22px] font-semibold">{title}</h1><p className="mt-1 text-sm text-[#888]">{subtitle}</p></div>;
}

function Measurement({ label, value, unit, accent }: { label: string; value: string | number | null; unit: string; accent: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-[#1A1A1A] p-4"><p className="text-xs text-[#888]">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums" style={{ color: value != null ? accent : '#555' }}>{value ?? '—'}{value != null && <span className="ml-1 text-xs font-normal text-[#888]">{unit}</span>}</p></div>;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <div className="flex min-h-16 items-center justify-between gap-4 border-b border-white/[0.05] px-4 last:border-0"><span className="text-sm text-[#888]">{label}</span><span className="max-w-[60%] truncate text-right text-sm">{value}</span></div>;
}

function CardSkeleton({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, index) => <div key={index} className="h-20 rounded-2xl bg-white/[0.05] animate-pulse" />)}</>;
}

function EmptyState({ icon: Icon, title, message }: { icon: ElementType; title: string; message: string }) {
  return <div className="py-20 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-[#555]"><Icon size={25} /></div><h2 className="mt-4 text-base font-medium">{title}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#888]">{message}</p></div>;
}

function QueryError({ title, retry }: { title: string; retry: () => void }) {
  return <div className="px-5 py-24 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-[#888]"><RefreshCw size={24} /></div><h1 className="mt-4 text-lg font-medium">{title}</h1><p className="mt-2 text-sm text-[#888]">Check your connection and try again.</p><button onClick={retry} className="mt-5 h-12 rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-5 text-sm font-medium active:scale-[0.97]">Try again</button></div>;
}

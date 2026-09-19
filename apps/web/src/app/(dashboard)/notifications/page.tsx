'use client';

import { DragEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GripVertical,
  ImageIcon,
  IndianRupee,
  Loader2,
  Mail,
  Maximize2,
  Paperclip,
  Search,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import {
  NOTIFICATION_THEMES,
  NotificationTheme,
  getTheme,
  DEFAULT_THEME_ID,
} from '@/lib/notification-themes';

type Channel = 'email' | 'push' | 'both';
type Audience = 'all' | 'payment_due' | 'overdue' | 'active' | 'expiring_soon';
type Recipient = {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  pushEnabled: boolean;
  audience: 'active' | 'expiring_soon' | 'overdue' | 'inactive';
  paymentDue: boolean;
  planName: string | null;
  dueDate: string | null;
  amount: number | null;
};
type ApiNotification = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  metadata: {
    failureReason?: string;
    theme?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
  } | null;
  member: { user: { name: string } } | null;
};

type UploadedAttachment = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

const mergeTags = [
  ['{name}', 'Full name'],
  ['{firstName}', 'First name'],
  ['{memberCode}', 'Member code'],
  ['{plan}', 'Plan'],
  ['{amount}', 'Amount due'],
  ['{dueDate}', 'Due date'],
] as const;

const audiences: Array<{ key: Audience; label: string; icon: typeof Users }> = [
  { key: 'all', label: 'All members', icon: Users },
  { key: 'payment_due', label: 'Payment due', icon: IndianRupee },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { key: 'expiring_soon', label: 'Expiring soon', icon: Clock },
  { key: 'active', label: 'Active', icon: UserCheck },
];

function relativeTime(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function matchesAudience(recipient: Recipient, audience: Audience) {
  return audience === 'all' || (audience === 'payment_due' ? recipient.paymentDue : recipient.audience === audience);
}

function personalize(value: string, recipient?: Recipient) {
  if (!recipient) return value;
  const replacements: Record<string, string> = {
    '{name}': recipient.name,
    '{firstName}': recipient.name.trim().split(/\s+/)[0] ?? recipient.name,
    '{memberCode}': recipient.memberCode,
    '{plan}': recipient.planName ?? 'your membership',
    '{amount}': recipient.amount === null ? 'the amount due' : `₹${recipient.amount.toLocaleString('en-IN')}`,
    '{dueDate}': recipient.dueDate ? new Date(recipient.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the due date',
  };
  return Object.entries(replacements).reduce((result, [tag, replacement]) => result.replaceAll(tag, replacement), value);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<'history' | 'compose'>('history');
  const [historySearch, setHistorySearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [channel, setChannel] = useState<Channel>('both');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Theme state (default to gym_update or null)
  const [selectedThemeId, setSelectedThemeId] = useState<string>('gym_update');
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [themeFilter, setThemeFilter] = useState<'all' | 'festivals' | 'celebrations' | 'reminders'>('all');

  // Attachment state
  const [attachment, setAttachment] = useState<UploadedAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Full view modal state
  const [activeHistoryNotification, setActiveHistoryNotification] = useState<ApiNotification | null>(null);

  const selectedTheme = useMemo(() => getTheme(selectedThemeId) || getTheme(DEFAULT_THEME_ID)!, [selectedThemeId]);

  const history = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<{ notifications: ApiNotification[] }>('/notifications', { params: { limit: 200 } }).then((response) => response.data.notifications),
  });

  const recipients = useQuery({
    queryKey: ['notification-recipients'],
    queryFn: () => apiClient.get<{ recipients: Recipient[] }>('/notifications/recipients').then((response) => response.data.recipients),
  });

  const send = useMutation({
    mutationFn: () => apiClient.post('/notifications', {
      title,
      body,
      channel,
      target: 'selected',
      targetIds: selectedIds,
      theme: selectedThemeId,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.filename,
      attachmentType: attachment?.mimeType,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setTitle('');
      setBody('');
      setSelectedIds([]);
      setAttachment(null);
      setSelectedThemeId('gym_update');
      setView('history');
    },
  });

  const recipientList = recipients.data ?? [];
  const audienceMembers = useMemo(() => recipientList.filter((item) => matchesAudience(item, audience)), [audience, recipientList]);
  const visibleRecipients = useMemo(() => {
    const term = recipientSearch.trim().toLowerCase();
    return audienceMembers.filter((item) => !term || item.name.toLowerCase().includes(term) || item.memberCode.toLowerCase().includes(term) || item.email?.toLowerCase().includes(term));
  }, [audienceMembers, recipientSearch]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedRecipients = useMemo(() => recipientList.filter((item) => selectedSet.has(item.id)), [recipientList, selectedSet]);
  const previewRecipient = selectedRecipients[0];
  const allVisibleSelected = visibleRecipients.length > 0 && visibleRecipients.every((item) => selectedSet.has(item.id));

  const filteredHistory = useMemo(() => (history.data ?? []).filter((item) => {
    const term = historySearch.toLowerCase();
    return !term || item.title.toLowerCase().includes(term) || item.body.toLowerCase().includes(term) || item.member?.user.name.toLowerCase().includes(term);
  }), [history.data, historySearch]);

  const stats = {
    total: history.data?.length ?? 0,
    delivered: history.data?.filter((item) => item.status === 'delivered').length ?? 0,
    pending: history.data?.filter((item) => ['pending', 'scheduled'].includes(item.status)).length ?? 0,
    failed: history.data?.filter((item) => item.status === 'failed').length ?? 0,
  };

  const audienceCount = (key: Audience) => recipientList.filter((item) => matchesAudience(item, key)).length;
  const toggleRecipient = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleVisible = () => setSelectedIds((current) => {
    const visibleIds = new Set(visibleRecipients.map((item) => item.id));
    return allVisibleSelected ? current.filter((id) => !visibleIds.has(id)) : Array.from(new Set([...current, ...visibleIds]));
  });

  const insertTag = (token: string) => {
    const textarea = messageRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    setBody(`${body.slice(0, start)}${token}${body.slice(end)}`);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const dropTag = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const token = event.dataTransfer.getData('text/plain');
    if (mergeTags.some(([value]) => value === token)) insertTag(token);
  };

  const selectTheme = (theme: NotificationTheme, autoFill = false) => {
    setSelectedThemeId(theme.id);
    if (autoFill || !title.trim() || !body.trim()) {
      setTitle(theme.defaultTitle);
      setBody(theme.defaultBody);
    }
  };

  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<UploadedAttachment>('/notifications/attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachment(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to upload attachment.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const missingEmail = selectedRecipients.filter((item) => !item.email).length;
  const missingPush = selectedRecipients.filter((item) => !item.pushEnabled).length;

  const filteredThemes = useMemo(() => {
    if (themeFilter === 'festivals') {
      return NOTIFICATION_THEMES.filter((t) => ['diwali', 'sankranti', 'ganesh', 'eid', 'christmas', 'newyear', 'holi'].includes(t.id));
    }
    if (themeFilter === 'celebrations') {
      return NOTIFICATION_THEMES.filter((t) => ['birthday', 'celebration', 'achievement', 'milestone', 'welcome', 'challenge'].includes(t.id));
    }
    if (themeFilter === 'reminders') {
      return NOTIFICATION_THEMES.filter((t) => ['fee_reminder', 'overdue', 'miss_you', 'motivation', 'fitness', 'wellness', 'gym_update'].includes(t.id));
    }
    return NOTIFICATION_THEMES;
  }, [themeFilter]);

  const isImageAttachment = attachment?.mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(attachment?.url ?? '');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-page-title text-text-primary">Notifications & Announcements</h1>
          <p className="mt-2 text-body text-text-secondary">
            Send themed emails and mobile push notifications with photos, festive graphics, and document attachments
          </p>
        </div>
        <button
          onClick={() => setView(view === 'compose' ? 'history' : 'compose')}
          className={`btn ${view === 'compose' ? 'btn-secondary' : 'btn-primary'}`}
        >
          {view === 'compose' ? <><Bell size={16} /> View history</> : <><Send size={16} /> Compose notification</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-between-cards md:grid-cols-4">
        {[
          ['Total Sent', stats.total, ''],
          ['Delivered', stats.delivered, 'text-success'],
          ['Scheduled / Pending', stats.pending, 'text-warning'],
          ['Failed', stats.failed, 'text-danger'],
        ].map(([label, value, color]) => (
          <div className="stat-card" key={label as string}>
            <p className="stat-card-label">{label}</p>
            <p className={`stat-card-value mt-2 font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {view === 'history' ? (
        <>
          {/* Top Featured 20 Themes Showcase in History View */}
          <div className="card space-y-4 border border-divider bg-stat-card/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-card-heading text-text-primary flex items-center gap-2">
                  <Sparkles size={18} className="text-warning" /> 20 Themed Notification Templates
                </h2>
                <p className="text-caption text-text-secondary mt-0.5">
                  Click any template to compose a themed festive announcement or member celebration with animations & attachments
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedThemeId('diwali');
                  const t = getTheme('diwali');
                  if (t) { setTitle(t.defaultTitle); setBody(t.defaultBody); }
                  setView('compose');
                }}
                className="text-caption font-semibold text-primary hover:underline self-start sm:self-auto"
              >
                Compose with theme &rarr;
              </button>
            </div>

            {/* Quick row of theme chips */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {NOTIFICATION_THEMES.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    selectTheme(t, true);
                    setView('compose');
                  }}
                  className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-divider bg-card-bg p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg shadow-sm group-hover:scale-110 transition-transform"
                    style={{ background: t.gradient }}
                  >
                    <span>{t.emoji}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-text-primary">{t.label}</p>
                    <p className="truncate text-[11px] text-text-muted">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="input pl-10"
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search past notifications by title, content, or member name..."
            />
          </div>

          {/* History List */}
          {history.isLoading ? (
            <div className="card space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : history.isError ? (
            <div className="card empty-state">
              <p className="empty-state-title">Could not load notifications</p>
              <button className="btn btn-primary" onClick={() => history.refetch()}>Retry</button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="card empty-state">
              <Bell className="empty-state-icon" />
              <p className="empty-state-title">No notifications yet</p>
              <p className="empty-state-description">Send your first festive or update notification to your members.</p>
            </div>
          ) : (
            <div className="card divide-y divide-divider overflow-hidden p-0">
              {filteredHistory.map((item) => {
                const itemTheme = getTheme(item.metadata?.theme);
                const hasAttachment = Boolean(item.metadata?.attachmentUrl);
                const isImage = hasAttachment && (item.metadata?.attachmentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(item.metadata?.attachmentUrl ?? ''));

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveHistoryNotification(item)}
                    className="group flex cursor-pointer items-start gap-3.5 px-card-pad py-4.5 transition-colors hover:bg-stat-card/50"
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ background: itemTheme ? itemTheme.gradient : 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                    >
                      {itemTheme ? (
                        <span className="text-base">{itemTheme.emoji}</span>
                      ) : item.channel === 'push' ? (
                        <Bell size={16} />
                      ) : (
                        <Mail size={16} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body font-semibold text-text-primary group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <span className="badge badge-receptionist">
                          {item.channel === 'push' ? 'Push only' : item.channel === 'email' ? 'Email only' : 'Email + Push'}
                        </span>
                        {itemTheme && (
                          <span className="badge" style={{ backgroundColor: `${itemTheme.accent}20`, color: itemTheme.accent }}>
                            {itemTheme.emoji} {itemTheme.label}
                          </span>
                        )}
                        {hasAttachment && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-stat-card px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-divider">
                            <Paperclip size={11} />
                            {item.metadata?.attachmentName || 'Attachment'}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-caption leading-relaxed text-text-secondary">{item.body}</p>

                      {/* Attached Image (Uncropped preview) */}
                      {hasAttachment && isImage && (
                        <div
                          className="relative mt-3 overflow-hidden rounded-xl border border-divider bg-black/5 p-1 max-w-lg cursor-pointer group/img"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHistoryNotification(item);
                          }}
                        >
                          <img
                            src={item.metadata!.attachmentUrl}
                            alt={item.metadata?.attachmentName || 'Attachment image'}
                            className="w-full h-auto max-h-[320px] object-contain rounded-lg mx-auto"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-white backdrop-blur-[2px] rounded-lg">
                            <Maximize2 size={14} /> Click to view full image
                          </div>
                        </div>
                      )}

                      <p className="mt-2 text-caption text-text-muted flex items-center gap-1.5">
                        <span>{item.member?.user.name ?? 'All members'}</span>
                        <span>&bull;</span>
                        <span>{relativeTime(item.sentAt ?? item.createdAt)}</span>
                      </p>

                      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary group-hover:underline">
                        <Maximize2 size={11} /> Click to view full notification
                      </div>

                      {item.status === 'failed' && item.metadata?.failureReason && (
                        <p className="mt-2 break-words text-caption text-danger bg-danger/5 p-2 rounded-lg border border-danger/20">
                          {item.metadata.failureReason}
                        </p>
                      )}
                    </div>

                    <span className={`badge shrink-0 ${item.status === 'delivered' ? 'badge-active' : item.status === 'failed' ? 'badge-overdue' : 'badge-expiring'}`}>
                      {item.status === 'delivered' ? <CheckCircle2 size={11} /> : item.status === 'failed' ? <XCircle size={11} /> : <Clock size={11} />} {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Compose View */
        <div className="grid grid-cols-1 gap-between-cards xl:grid-cols-3">
          <div className="card space-y-6 xl:col-span-2">
            <div>
              <h2 className="text-section-heading">Compose Notification</h2>
              <p className="mt-1 text-caption text-text-muted">
                Select from 20 festive or occasion themes, upload festival graphics or documents, and send to members.
              </p>
            </div>

            {/* Delivery Channel */}
            <div>
              <label className="input-label">Channel</label>
              <div className="flex flex-wrap gap-2">
                {([['both', 'Email + Push'], ['email', 'Email only'], ['push', 'Push only']] as const).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setChannel(key)}
                    className={`filter-chip ${channel === key ? 'active' : ''}`}
                  >
                    {key === 'email' ? <Mail size={13} /> : <Bell size={13} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 20 Themes Selection Section */}
            <div className="space-y-3 rounded-xl border border-divider p-4 bg-stat-card/20">
              <div className="flex items-center justify-between">
                <div>
                  <label className="input-label mb-0 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-warning" /> Notification Theme (20 Available)
                  </label>
                  <p className="text-caption text-text-muted mt-0.5">
                    Emails and member apps will show this exact theme style, animated particles, and celebratory graphics
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllThemes(!showAllThemes)}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  {showAllThemes ? 'Show less' : 'View all 20'}
                </button>
              </div>

              {/* Theme Filter Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(
                  [
                    ['all', 'All 20 Themes'],
                    ['festivals', 'Festivals & Holidays (Diwali, Sankranti, Ganesh...)'],
                    ['celebrations', 'Celebrations & Wins (Birthday, Milestone...)'],
                    ['reminders', 'Fitness & Reminders (Fee, Goal, Miss You...)'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setThemeFilter(key)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      themeFilter === key
                        ? 'border-primary bg-primary/10 font-semibold text-primary'
                        : 'border-divider bg-card-bg text-text-secondary hover:bg-stat-card'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Grid of themes */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 transition-all ${showAllThemes ? 'max-h-[500px] overflow-y-auto pr-1' : 'max-h-[220px] overflow-hidden'}`}>
                {filteredThemes.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => selectTheme(theme, true)}
                      className={`group relative flex flex-col p-2.5 rounded-xl border text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30 shadow-md bg-card-bg'
                          : 'border-divider bg-card-bg/60 hover:bg-card-bg hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-base shadow-sm group-hover:scale-105 transition-transform"
                          style={{ background: theme.gradient }}
                        >
                          {theme.emoji}
                        </span>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px]">
                            <Check size={11} />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-text-primary truncate w-full">{theme.label}</span>
                      <span className="text-[10px] text-text-muted truncate w-full">{theme.description}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Theme Highlight Banner */}
              {selectedTheme && (
                <div
                  className="relative overflow-hidden rounded-xl p-3.5 text-white shadow-md animate-theme-glow flex items-center justify-between"
                  style={{ background: selectedTheme.gradient }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedTheme.emoji}</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Active Theme</p>
                      <h4 className="text-sm font-bold">{selectedTheme.label}</h4>
                    </div>
                  </div>

                  {/* Animated Particle Badges */}
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-lg animate-particle-1">{selectedTheme.particles[0]}</span>
                    <span className="text-lg animate-particle-2">{selectedTheme.particles[1]}</span>
                    <span className="text-lg animate-particle-3">{selectedTheme.particles[2]}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedThemeId('gym_update')}
                      className="ml-2 rounded-lg bg-black/20 p-1.5 text-white/80 hover:bg-black/40 hover:text-white transition-colors"
                      title="Reset to default theme"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Recipients Section */}
            <section className="rounded-xl border border-divider">
              <div className="border-b border-divider p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <label className="input-label">Recipients</label>
                    <p className="text-caption text-text-muted">Filter a group, then select everyone or customize with checkboxes.</p>
                  </div>
                  <span className="badge badge-active w-fit">
                    <Check size={11} /> {selectedIds.length} selected
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {audiences.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setAudience(key);
                        setRecipientSearch('');
                      }}
                      className={`filter-chip ${audience === key ? 'active' : ''}`}
                    >
                      <Icon size={12} /> {label} ({audienceCount(key)})
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      className="input pl-9"
                      value={recipientSearch}
                      onChange={(event) => setRecipientSearch(event.target.value)}
                      placeholder="Search name, email, or member code..."
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary shrink-0"
                    disabled={visibleRecipients.length === 0}
                    onClick={toggleVisible}
                  >
                    {allVisibleSelected ? 'Clear visible' : `Select visible (${visibleRecipients.length})`}
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {recipients.isLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-12 animate-pulse rounded bg-gray-100" />
                    ))}
                  </div>
                ) : recipients.isError ? (
                  <div className="empty-state py-8">
                    <p className="empty-state-title">Could not load recipients</p>
                    <button className="btn btn-primary" onClick={() => recipients.refetch()}>Retry</button>
                  </div>
                ) : visibleRecipients.length === 0 ? (
                  <div className="empty-state py-8">
                    <Users className="empty-state-icon" />
                    <p className="empty-state-title">No matching members</p>
                    <p className="empty-state-description">Try another audience or clear the search.</p>
                  </div>
                ) : (
                  visibleRecipients.map((recipient) => (
                    <label
                      key={recipient.id}
                      className="flex min-h-[60px] cursor-pointer items-center gap-3 border-b border-divider px-4 py-3 last:border-0 hover:bg-stat-card"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={selectedSet.has(recipient.id)}
                        onChange={() => toggleRecipient(recipient.id)}
                      />
                      <div className="avatar text-badge">{recipient.name[0]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-text-primary">{recipient.name}</p>
                        <p className="truncate text-caption text-text-muted">
                          {recipient.memberCode} &bull; {recipient.email ?? 'No email'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${recipient.audience === 'overdue' ? 'badge-overdue' : recipient.audience === 'expiring_soon' ? 'badge-expiring' : recipient.audience === 'active' ? 'badge-active' : ''}`}>
                          {recipient.audience.replace('_', ' ')}
                        </span>
                        {recipient.pushEnabled && <Bell size={13} className="text-success" aria-label="Push enabled" />}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </section>

            {/* Subject Input */}
            <div>
              <label className="input-label">Subject</label>
              <input
                className="input font-medium"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Subject of the notification or festival greeting..."
              />
            </div>

            {/* Message Body Input with Merge Tags */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="input-label">Message</label>
                <span className="text-caption text-text-muted">Click or drag merge tags into the message</span>
              </div>
              <div className="mb-2 flex flex-wrap gap-2">
                {mergeTags.map(([token, label]) => (
                  <button
                    key={token}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', token);
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => insertTag(token)}
                    className="flex cursor-grab items-center gap-1 rounded-lg border border-divider bg-stat-card px-2.5 py-1.5 text-caption text-text-secondary active:cursor-grabbing hover:border-primary/40"
                  >
                    <GripVertical size={12} /> {label} <span className="font-mono text-primary font-semibold">{token}</span>
                  </button>
                ))}
              </div>
              <textarea
                ref={messageRef}
                className="input h-auto py-3 leading-relaxed"
                rows={6}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropTag}
                placeholder="Write your greeting or announcement. Merge tags like {firstName} are replaced individually for every member."
              />
            </div>

            {/* Attachment Upload Section (Image or Document) */}
            <div className="space-y-2 rounded-xl border border-divider p-4 bg-stat-card/10">
              <div className="flex items-center justify-between">
                <div>
                  <label className="input-label mb-0 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-primary" /> Attach Image or Document
                  </label>
                  <p className="text-caption text-text-muted mt-0.5">
                    Attach festive photos (Sankranti, Ganesh, Diwali), posters, schedules, or PDF documents (up to 10 MB)
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx"
                className="sr-only"
                onChange={(e) => void handleFileUpload(e.target.files?.[0])}
              />

              {!attachment ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    void handleFileUpload(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    isDraggingFile
                      ? 'border-primary bg-primary/10'
                      : 'border-divider hover:border-primary/50 hover:bg-stat-card/40'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {isUploading ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <UploadCloud size={22} />
                    )}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-text-primary">
                    {isUploading ? 'Uploading file...' : 'Click to select or drag & drop file'}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Supports PNG, JPG, WebP, GIF, PDF, DOC (max 10 MB)
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-divider bg-card-bg p-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    {isImageAttachment ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-divider bg-black/5">
                        <img
                          src={attachment.url}
                          alt="Attachment preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText size={24} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-text-primary">{attachment.filename}</p>
                      <p className="text-[11px] text-text-muted">
                        {formatBytes(attachment.size)} &bull; {attachment.mimeType}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary !py-1.5 !px-2.5 text-xs"
                      title="Download or preview file"
                    >
                      <Download size={13} /> View
                    </a>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="btn btn-danger !py-1.5 !px-2.5 text-xs"
                      title="Remove attachment"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-caption text-danger">{uploadError}</p>
              )}
            </div>

            {/* Warning Notices */}
            {selectedIds.length > 0 && ((channel !== 'push' && missingEmail > 0) || (channel !== 'email' && missingPush > 0)) && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-caption text-text-secondary">
                {channel !== 'push' && missingEmail > 0 ? `${missingEmail} selected member${missingEmail === 1 ? '' : 's'} do not have an email. ` : ''}
                {channel !== 'email' && missingPush > 0 ? `${missingPush} selected member${missingPush === 1 ? '' : 's'} have not enabled push notifications.` : ''}
              </div>
            )}

            {send.isError && (
              <p className="text-caption text-danger">Delivery failed. Check the recipients and selected channel, then try again.</p>
            )}

            {/* Send Button */}
            <button
              className="btn btn-primary w-full shadow-lg"
              disabled={!title.trim() || !body.trim() || selectedIds.length === 0 || send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sending notification to {selectedIds.length} member{selectedIds.length === 1 ? '' : 's'}...
                </>
              ) : (
                <>
                  <Send size={16} /> Send to {selectedIds.length} member{selectedIds.length === 1 ? '' : 's'}
                </>
              )}
            </button>
          </div>

          {/* Live Preview Sidebar */}
          <aside className="card h-fit border border-divider bg-card-bg text-text-primary xl:sticky xl:top-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div>
                <h3 className="text-card-heading flex items-center gap-1.5">
                  <Sparkles size={16} className="text-primary" /> Live Member Preview
                </h3>
                <p className="text-caption text-text-muted">
                  Showing view for {previewRecipient?.name ?? 'selected member'}
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
                style={{ background: selectedTheme.gradient }}
              >
                {selectedTheme.emoji} {selectedTheme.label}
              </span>
            </div>

            {/* Styled Themed Email / Card Frame */}
            <div className="overflow-hidden rounded-2xl border border-divider shadow-md bg-white">
              {/* Themed Header with Floating Particles */}
              <div
                className="relative p-5 text-center text-white"
                style={{ background: selectedTheme.gradient }}
              >
                {/* Floating Emojis */}
                <div className="flex justify-center items-center gap-2 mb-2 text-xl select-none">
                  <span className="animate-particle-1">{selectedTheme.particles[0]}</span>
                  <span className="animate-particle-2">{selectedTheme.particles[1]}</span>
                  <span className="animate-particle-3">{selectedTheme.particles[2]}</span>
                  <span className="animate-particle-1">{selectedTheme.particles[3]}</span>
                  <span className="animate-particle-2">{selectedTheme.particles[4]}</span>
                </div>

                {/* Gym Name Badge */}
                <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  GymOS Member Announcement
                </span>

                {/* Subject */}
                <h4 className="mt-2 text-base font-bold text-white drop-shadow-sm">
                  {selectedTheme.emoji} {personalize(title, previewRecipient) || 'Notification Subject'}
                </h4>
                <p className="text-[11px] text-white/80 font-medium">
                  {selectedTheme.label} &bull; {selectedTheme.description}
                </p>
              </div>

              {/* Themed Content Body */}
              <div className="p-4 space-y-3 bg-white text-gray-800">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                  {personalize(body, previewRecipient) || 'Your personalized message will appear here for each recipient.'}
                </p>

                {/* Attached Image inside Preview */}
                {attachment && isImageAttachment && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                    <img
                      src={attachment.url}
                      alt="Attachment"
                      className="w-full max-h-48 object-cover"
                    />
                    <div className="bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500 truncate">
                      📷 {attachment.filename}
                    </div>
                  </div>
                )}

                {/* Attached Document inside Preview */}
                {attachment && !isImageAttachment && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={18} className="text-gray-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-800">{attachment.filename}</p>
                        <p className="text-[10px] text-gray-500">{formatBytes(attachment.size)}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: selectedTheme.accent }}
                    >
                      Download
                    </span>
                  </div>
                )}

                {/* Simulated Email Footer */}
                <div className="border-t border-gray-100 pt-3 text-center text-[10px] text-gray-400">
                  Sent via GymOS &bull; {selectedTheme.emoji} {selectedTheme.label}
                </div>
              </div>
            </div>

            {/* Recipient & Metadata stats */}
            <div className="space-y-2 text-caption text-text-secondary">
              <div className="flex justify-between">
                <span>Audience</span>
                <span className="font-semibold text-text-primary">{selectedIds.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span>Channel</span>
                <span className="capitalize font-semibold text-text-primary">
                  {channel === 'both' ? 'Email + Push' : channel}
                </span>
              </div>
              {previewRecipient && (
                <div className="flex justify-between gap-3">
                  <span>Sample member</span>
                  <span className="truncate font-semibold text-text-primary">
                    {previewRecipient.name} ({previewRecipient.memberCode})
                  </span>
                </div>
              )}
            </div>

            {selectedRecipients.length > 0 && (
              <div className="border-t border-divider pt-3">
                <p className="text-caption text-text-muted">Selected Members ({selectedRecipients.length})</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedRecipients.slice(0, 8).map((recipient) => (
                    <span key={recipient.id} className="rounded-md bg-stat-card border border-divider px-2 py-0.5 text-[11px]">
                      {recipient.name}
                    </span>
                  ))}
                  {selectedRecipients.length > 8 && (
                    <span className="rounded-md bg-stat-card border border-divider px-2 py-0.5 text-[11px] text-text-muted">
                      +{selectedRecipients.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

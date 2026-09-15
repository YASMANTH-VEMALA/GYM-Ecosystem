'use client';

import { DragEvent, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Check, CheckCircle2, Clock, Gift, GripVertical, IndianRupee, Mail, Megaphone, Search, Send, UserCheck, Users, XCircle, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

type Channel = 'email' | 'push' | 'both';
type Audience = 'all' | 'payment_due' | 'overdue' | 'active' | 'expiring_soon';
type Recipient = {
  id: string; memberCode: string; name: string; email: string | null; pushEnabled: boolean;
  audience: 'active' | 'expiring_soon' | 'overdue' | 'inactive'; paymentDue: boolean;
  planName: string | null; dueDate: string | null; amount: number | null;
};
type ApiNotification = {
  id: string; title: string; body: string; channel: string; status: string; sentAt: string | null; createdAt: string;
  metadata: { failureReason?: string } | null; member: { user: { name: string } } | null;
};

const templates = [
  { icon: AlertTriangle, label: 'Fee Reminder', audience: 'payment_due' as Audience, title: 'Membership fee reminder', body: 'Hi {firstName}, your {plan} fee of {amount} is due on {dueDate}. Please contact the gym reception.' },
  { icon: Megaphone, label: 'Gym Update', audience: 'all' as Audience, title: 'Important gym update', body: 'Hi {firstName}, we have an important update for you.' },
  { icon: Gift, label: 'Birthday Wish', audience: 'all' as Audience, title: 'Happy birthday, {firstName}!', body: 'Happy birthday, {name}! Wishing you a healthy and active year ahead.' },
  { icon: Zap, label: 'Inactivity Nudge', audience: 'all' as Audience, title: 'We miss you, {firstName}!', body: 'Hi {firstName}, we have not seen you recently. Come back and keep your momentum going.' },
];
const mergeTags = [
  ['{name}', 'Full name'], ['{firstName}', 'First name'], ['{memberCode}', 'Member code'],
  ['{plan}', 'Plan'], ['{amount}', 'Amount due'], ['{dueDate}', 'Due date'],
] as const;
const audiences: Array<{ key: Audience; label: string; icon: typeof Users }> = [
  { key: 'all', label: 'All members', icon: Users }, { key: 'payment_due', label: 'Payment due', icon: IndianRupee },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle }, { key: 'expiring_soon', label: 'Expiring soon', icon: Clock },
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

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<'history' | 'compose'>('history');
  const [historySearch, setHistorySearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [channel, setChannel] = useState<Channel>('both');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const history = useQuery({ queryKey: ['notifications'], queryFn: () => apiClient.get<{ notifications: ApiNotification[] }>('/notifications', { params: { limit: 200 } }).then((response) => response.data.notifications) });
  const recipients = useQuery({ queryKey: ['notification-recipients'], queryFn: () => apiClient.get<{ recipients: Recipient[] }>('/notifications/recipients').then((response) => response.data.recipients) });
  const send = useMutation({
    mutationFn: () => apiClient.post('/notifications', { title, body, channel, target: 'selected', targetIds: selectedIds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setTitle(''); setBody(''); setSelectedIds([]); setView('history');
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
    window.requestAnimationFrame(() => { textarea?.focus(); textarea?.setSelectionRange(start + token.length, start + token.length); });
  };
  const dropTag = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const token = event.dataTransfer.getData('text/plain');
    if (mergeTags.some(([value]) => value === token)) insertTag(token);
  };
  const missingEmail = selectedRecipients.filter((item) => !item.email).length;
  const missingPush = selectedRecipients.filter((item) => !item.pushEnabled).length;

  return <div className="space-y-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><h1 className="text-page-title text-text-primary">Notifications</h1><p className="mt-2 text-body text-text-secondary">Send personalized email and installed-app push notifications</p></div>
      <button onClick={() => setView(view === 'compose' ? 'history' : 'compose')} className={`btn ${view === 'compose' ? 'btn-secondary' : 'btn-primary'}`}>{view === 'compose' ? <><Bell size={16} /> View history</> : <><Send size={16} /> Compose new</>}</button>
    </div>

    <div className="grid grid-cols-2 gap-between-cards md:grid-cols-4">
      {[['Total', stats.total, ''], ['Delivered', stats.delivered, 'text-success'], ['Pending', stats.pending, 'text-warning'], ['Failed', stats.failed, 'text-danger']].map(([label, value, color]) => <div className="stat-card" key={label}><p className="stat-card-label">{label}</p><p className={`stat-card-value mt-2 font-mono ${color}`}>{value}</p></div>)}
    </div>

    {view === 'history' ? <>
      <div><h2 className="mb-3 text-card-heading text-text-primary">Templates</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-4">{templates.map((template) => { const Icon = template.icon; return <button key={template.label} onClick={() => { setTitle(template.title); setBody(template.body); setAudience(template.audience); setView('compose'); }} className="card flex items-center gap-3 p-4 text-left hover:shadow-card-hover"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Icon size={18} className="text-primary" /></div><span className="text-body font-medium">{template.label}</span></button>; })}</div></div>
      <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input className="input pl-10" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search notifications..." /></div>
      {history.isLoading ? <div className="card space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded bg-gray-100" />)}</div> : history.isError ? <div className="card empty-state"><p className="empty-state-title">Could not load notifications</p><button className="btn btn-primary" onClick={() => history.refetch()}>Retry</button></div> : filteredHistory.length === 0 ? <div className="card empty-state"><Bell className="empty-state-icon" /><p className="empty-state-title">No notifications yet</p><p className="empty-state-description">Send your first member update.</p></div> : <div className="card divide-y divide-divider overflow-hidden p-0">{filteredHistory.map((item) => <div key={item.id} className="flex items-start gap-3 px-card-pad py-4">{item.channel === 'push' ? <Bell size={16} className="mt-1 text-primary" /> : <Mail size={16} className="mt-1 text-primary" />}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-body font-medium">{item.title}</p><span className="badge badge-receptionist">{item.channel === 'push' ? 'Push' : 'Email'}</span></div><p className="mt-1 text-caption text-text-secondary">{item.body}</p><p className="mt-2 text-caption text-text-muted">{item.member?.user.name ?? 'Gym owner'} · {relativeTime(item.sentAt ?? item.createdAt)}</p>{item.status === 'failed' && item.metadata?.failureReason && <p className="mt-2 break-words text-caption text-danger">{item.metadata.failureReason}</p>}</div><span className={`badge ${item.status === 'delivered' ? 'badge-active' : item.status === 'failed' ? 'badge-overdue' : 'badge-expiring'}`}>{item.status === 'delivered' ? <CheckCircle2 size={11} /> : item.status === 'failed' ? <XCircle size={11} /> : <Clock size={11} />} {item.status}</span></div>)}</div>}
    </> : <div className="grid grid-cols-1 gap-between-cards xl:grid-cols-3">
      <div className="card space-y-6 xl:col-span-2">
        <div><h2 className="text-section-heading">Compose notification</h2><p className="mt-1 text-caption text-text-muted">Choose a group, check the exact members, then personalize the message.</p></div>
        <div><label className="input-label">Channel</label><div className="flex flex-wrap gap-2">{([['both', 'Email + Push'], ['push', 'Push only'], ['email', 'Email only']] as const).map(([key, label]) => <button type="button" key={key} onClick={() => setChannel(key)} className={`filter-chip ${channel === key ? 'active' : ''}`}>{key === 'email' ? <Mail size={13} /> : <Bell size={13} />}{label}</button>)}</div></div>

        <section className="rounded-xl border border-divider">
          <div className="border-b border-divider p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><label className="input-label">Recipients</label><p className="text-caption text-text-muted">Filter a group, then select everyone or customize with checkboxes.</p></div><span className="badge badge-active w-fit"><Check size={11} /> {selectedIds.length} selected</span></div>
            <div className="mt-4 flex flex-wrap gap-2">{audiences.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => { setAudience(key); setRecipientSearch(''); }} className={`filter-chip ${audience === key ? 'active' : ''}`}><Icon size={12} /> {label} ({audienceCount(key)})</button>)}</div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input className="input pl-9" value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search name, email, or member code..." /></div><button type="button" className="btn btn-secondary shrink-0" disabled={visibleRecipients.length === 0} onClick={toggleVisible}>{allVisibleSelected ? 'Clear visible' : `Select visible (${visibleRecipients.length})`}</button></div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {recipients.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded bg-gray-100" />)}</div> : recipients.isError ? <div className="empty-state py-8"><p className="empty-state-title">Could not load recipients</p><button className="btn btn-primary" onClick={() => recipients.refetch()}>Retry</button></div> : visibleRecipients.length === 0 ? <div className="empty-state py-8"><Users className="empty-state-icon" /><p className="empty-state-title">No matching members</p><p className="empty-state-description">Try another audience or clear the search.</p></div> : visibleRecipients.map((recipient) => <label key={recipient.id} className="flex min-h-[60px] cursor-pointer items-center gap-3 border-b border-divider px-4 py-3 last:border-0 hover:bg-stat-card"><input type="checkbox" className="h-4 w-4 accent-primary" checked={selectedSet.has(recipient.id)} onChange={() => toggleRecipient(recipient.id)} /><div className="avatar text-badge">{recipient.name[0]}</div><div className="min-w-0 flex-1"><p className="truncate text-body font-medium text-text-primary">{recipient.name}</p><p className="truncate text-caption text-text-muted">{recipient.memberCode} · {recipient.email ?? 'No email'}</p></div><div className="flex items-center gap-2"><span className={`badge ${recipient.audience === 'overdue' ? 'badge-overdue' : recipient.audience === 'expiring_soon' ? 'badge-expiring' : recipient.audience === 'active' ? 'badge-active' : ''}`}>{recipient.audience.replace('_', ' ')}</span>{recipient.pushEnabled && <Bell size={13} className="text-success" aria-label="Push enabled" />}</div></label>)}
          </div>
        </section>

        <div><label className="input-label">Subject</label><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What is this notification about?" /></div>
        <div>
          <div className="flex items-center justify-between gap-3"><label className="input-label">Message</label><span className="text-caption text-text-muted">Click or drag a field into the message</span></div>
          <div className="mb-2 flex flex-wrap gap-2">{mergeTags.map(([token, label]) => <button key={token} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', token); event.dataTransfer.effectAllowed = 'copy'; }} onClick={() => insertTag(token)} className="flex cursor-grab items-center gap-1 rounded-lg border border-divider bg-stat-card px-2.5 py-1.5 text-caption text-text-secondary active:cursor-grabbing"><GripVertical size={12} /> {label} <span className="font-mono text-primary">{token}</span></button>)}</div>
          <textarea ref={messageRef} className="input h-auto py-3" rows={7} value={body} onChange={(event) => setBody(event.target.value)} onDragOver={(event) => event.preventDefault()} onDrop={dropTag} placeholder="Write a clear message. Personalized fields are filled separately for every member." />
        </div>

        {selectedIds.length > 0 && ((channel !== 'push' && missingEmail > 0) || (channel !== 'email' && missingPush > 0)) && <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-caption text-text-secondary">{channel !== 'push' && missingEmail > 0 ? `${missingEmail} selected member${missingEmail === 1 ? '' : 's'} do not have an email. ` : ''}{channel !== 'email' && missingPush > 0 ? `${missingPush} selected member${missingPush === 1 ? '' : 's'} have not enabled push notifications.` : ''}</div>}
        {send.isError && <p className="text-caption text-danger">Delivery failed. Check the recipients and selected channel, then try again.</p>}
        <button className="btn btn-primary w-full" disabled={!title.trim() || !body.trim() || selectedIds.length === 0 || send.isPending} onClick={() => send.mutate()}>{send.isPending ? `Sending to ${selectedIds.length} member${selectedIds.length === 1 ? '' : 's'}...` : <><Send size={16} /> Send to {selectedIds.length} member{selectedIds.length === 1 ? '' : 's'}</>}</button>
      </div>

      <aside className="card h-fit border-white/10 bg-[#111] text-white xl:sticky xl:top-6">
        <h3 className="mb-1 text-card-heading">Live preview</h3><p className="text-caption text-white/40">Previewing {previewRecipient?.name ?? 'the first selected member'}</p>
        <div className="mt-4 rounded-xl border border-white/10 p-4"><p className="font-medium">{personalize(title, previewRecipient) || 'Notification subject'}</p><p className="mt-2 whitespace-pre-wrap text-sm text-white/60">{personalize(body, previewRecipient) || 'Your personalized message will appear here.'}</p></div>
        <div className="mt-4 space-y-2 text-caption text-white/50"><div className="flex justify-between"><span>Audience</span><span className="text-white/80">{selectedIds.length} selected</span></div><div className="flex justify-between"><span>Channel</span><span className="capitalize text-white/80">{channel === 'both' ? 'Email + Push' : channel}</span></div>{previewRecipient && <div className="flex justify-between gap-3"><span>Sample member</span><span className="truncate text-white/80">{previewRecipient.memberCode}</span></div>}</div>
        {selectedRecipients.length > 0 && <div className="mt-5 border-t border-white/10 pt-4"><p className="text-caption text-white/40">Selected members</p><div className="mt-2 flex flex-wrap gap-2">{selectedRecipients.slice(0, 8).map((recipient) => <span key={recipient.id} className="rounded-md bg-white/10 px-2 py-1 text-caption">{recipient.name}</span>)}{selectedRecipients.length > 8 && <span className="rounded-md bg-white/10 px-2 py-1 text-caption">+{selectedRecipients.length - 8} more</span>}</div></div>}
      </aside>
    </div>}
  </div>;
}

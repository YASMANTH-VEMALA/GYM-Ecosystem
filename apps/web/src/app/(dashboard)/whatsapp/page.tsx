'use client';

import React, { useState } from 'react';
import {
  MessageSquareCode,
  UserPlus,
  CreditCard,
  Calendar,
  Gift,
  Building2,
  Tag,
  UserX,
  ChevronRight,
  Plus,
  ArrowLeft,
  X,
  Send,
  Check,
  CheckCheck,
  Smile,
  Mic,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaType = 'image' | 'video' | 'document' | 'none';

type TemplateData = {
  id?: string;
  name: string;
  category: string;
  content: string;
  mediaType: MediaType;
  mediaUrl?: string;
};

type AutomationItem = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  defaultTemplate: TemplateData;
};

// ─── Variable pills ────────────────────────────────────────────────────────────

const VARIABLE_TAGS = [
  { tag: '{name}', label: 'Member Name' },
  { tag: '{days}', label: 'Days Remaining' },
  { tag: '{payment_link}', label: 'Payment Link' },
  { tag: '{gym_name}', label: 'Gym Name' },
  { tag: '{plan_name}', label: 'Plan Name' },
  { tag: '{expiry_date}', label: 'Expiry Date' },
];

// ─── Inline Icons (clean, consistent stroke) ───────────────────────────────────

function AutoIcon({ type }: { type: string }) {
  const cls = 'text-[var(--color-primary)]';
  switch (type) {
    case 'welcome':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
    case 'payment':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case 'expiry':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>;
    case 'birthday':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1"/><line x1="2" y1="21" x2="22" y2="21"/><path d="M7 8v2"/><path d="M12 8v2"/><path d="M17 8v2"/><path d="M7 4s0-2 3-2 3 4 3 4"/></svg>;
    case 'closed':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'offers':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case 'missed':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>;
    default:
      return <MessageSquareCode width={20} height={20} className={cls} />;
  }
}

// ─── Seed automations ──────────────────────────────────────────────────────────

const INITIAL_AUTOMATIONS: AutomationItem[] = [
  {
    id: 'auto-welcome', title: 'Welcome Message', description: 'Send to new members upon joining', icon: <AutoIcon type="welcome" />, enabled: true,
    defaultTemplate: { id: 'auto-welcome', name: 'Welcome Onboarding', category: 'Welcome Message', content: 'Welcome to {gym_name}, {name}! 🏋️\n\nYour fitness journey starts now. Access workouts and scan your QR code at the gym entrance.\n\nLet\'s crush those fitness goals together!', mediaType: 'image', mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop' },
  },
  {
    id: 'auto-payment', title: 'Payment Reminder', description: 'Auto reminders before due date', icon: <AutoIcon type="payment" />, enabled: true,
    defaultTemplate: { id: 'auto-payment', name: 'Payment Due Alert', category: 'Payment Reminder', content: 'Dear {name},\n\nYour gym fee renewal is due in {days} days.\n\nPay now to keep your access uninterrupted: {payment_link}\n\nThank you, {gym_name}', mediaType: 'none' },
  },
  {
    id: 'auto-expiry', title: 'Membership Expiry', description: '7 days, 3 days, 1 day & on expiry', icon: <AutoIcon type="expiry" />, enabled: true,
    defaultTemplate: { id: 'auto-expiry', name: 'Membership Reminder', category: 'Membership Expiry', content: 'Hi {name},\n\nYour gym membership is expiring in {days} days. Renew now and continue your fitness journey!\n\nPay Now: {payment_link}', mediaType: 'image', mediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop' },
  },
  {
    id: 'auto-birthday', title: 'Birthday Wishes', description: 'Personalized birthday messages with perks', icon: <AutoIcon type="birthday" />, enabled: true,
    defaultTemplate: { id: 'auto-birthday', name: 'Birthday Greeting', category: 'Birthday Wishes', content: 'Happy Birthday {name}! 🎂\n\nWishing you health and incredible fitness milestones. Enjoy a complimentary PT session at {gym_name} this week!', mediaType: 'none' },
  },
  {
    id: 'auto-closed', title: 'Gym Closed Notice', description: 'Holiday / special events announcements', icon: <AutoIcon type="closed" />, enabled: false,
    defaultTemplate: { id: 'auto-closed', name: 'Holiday Closure', category: 'Gym Closed Notice', content: 'Attention {gym_name} Members:\n\nOur facility will be closed tomorrow for scheduled deep maintenance. Normal hours resume the following morning. Stay safe!', mediaType: 'none' },
  },
  {
    id: 'auto-offers', title: 'Offers & Promotions', description: 'Seasonal & renewal offers', icon: <AutoIcon type="offers" />, enabled: true,
    defaultTemplate: { id: 'auto-offers', name: 'Seasonal Upgrade Offer', category: 'Offers & Promotions', content: 'Exclusive Offer for {name}!\n\nUpgrade to Annual Platinum this weekend — get 2 months free + nutrition guidance.\n\nClaim offer: {payment_link}', mediaType: 'image', mediaUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1200&auto=format&fit=crop' },
  },
  {
    id: 'auto-missed', title: 'Missed Attendance', description: 'Follow-up if inactive for 5+ days', icon: <AutoIcon type="missed" />, enabled: true,
    defaultTemplate: { id: 'auto-missed', name: 'Attendance Follow-up', category: 'Missed Attendance', content: 'Hey {name}, we noticed you haven\'t visited {gym_name} in a while. Everything alright?\n\nConsistency is the secret to progress — come in today!', mediaType: 'none' },
  },
];

// ─── Message Template Editor (Screen 10) ──────────────────────────────────────

function MessageTemplateEditor({
  initialTemplate,
  onBack,
  onSave,
}: {
  initialTemplate: TemplateData;
  onBack: () => void;
  onSave: (t: TemplateData) => void;
}) {
  const [name, setName] = useState(initialTemplate.name);
  const [category, setCategory] = useState(initialTemplate.category);
  const [content, setContent] = useState(initialTemplate.content);
  const [mediaType, setMediaType] = useState<MediaType>(initialTemplate.mediaType);
  const [mediaUrl, setMediaUrl] = useState(initialTemplate.mediaUrl ?? 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop');
  const [testPhone, setTestPhone] = useState('+91 98765 43210');
  const [testSent, setTestSent] = useState(false);

  const rendered = content
    .replace(/{name}/g, 'Rahul Sharma')
    .replace(/{days}/g, '3')
    .replace(/{payment_link}/g, 'gymlink.io/pay')
    .replace(/{gym_name}/g, 'IronFit Gym')
    .replace(/{plan_name}/g, 'Annual Gold')
    .replace(/{expiry_date}/g, '25 Sep 2025');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...initialTemplate, id: initialTemplate.id ?? `tpl-${Date.now()}`, name, category, content, mediaType, mediaUrl });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn btn-secondary h-9 w-9 p-0">
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-page-title text-text-primary">
              {initialTemplate.id ? 'Edit Template' : 'New Message Template'}
            </h1>
            <p className="text-body text-text-secondary mt-0.5">Configure automated WhatsApp messages with dynamic member variables.</p>
          </div>
        </div>
        <button form="template-form" type="submit" className="btn btn-primary">
          <Save size={15} strokeWidth={1.5} /> Save Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form */}
        <form id="template-form" onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          <div className="card space-y-4">
            <div>
              <label className="input-label">Template Name *</label>
              <input required className="input" placeholder="e.g. Membership Reminder" value={name}
                onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                {['Membership Expiry', 'Welcome Message', 'Payment Reminder', 'Birthday Wishes', 'Gym Closed Notice', 'Offers & Promotions', 'Missed Attendance'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <label className="input-label mb-0">Message Content *</label>
              <span className="text-caption text-text-muted font-mono">{content.length} / 1000</span>
            </div>

            {/* Variable pills */}
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_TAGS.map(v => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => setContent(c => c + (c.endsWith(' ') ? '' : ' ') + v.tag)}
                  className="px-2.5 py-1 rounded-md border border-[#EBEBEB] bg-[#F9F9F8] text-[12px] text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-blue-50 transition-colors font-mono"
                  title={v.label}
                >
                  + {v.tag}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={7}
              maxLength={1000}
              className="input h-auto py-3 resize-none leading-relaxed"
              placeholder="Hi {name}, your membership expires in {days} days..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          {/* Media */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-section-heading text-text-primary">Media Attachment</p>
              <span className="text-caption text-text-muted">Optional header for the message</span>
            </div>
            <div className="flex gap-2">
              {(['image', 'video', 'document', 'none'] as const).map(mt => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setMediaType(mt)}
                  className={`btn flex-1 capitalize text-[13px] ${mediaType === mt ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {mt === 'none' ? 'None' : mt === 'image' ? '🖼 Image' : mt === 'video' ? '🎬 Video' : '📄 Document'}
                </button>
              ))}
            </div>

            {mediaType === 'image' && (
              <div className="space-y-3">
                {mediaUrl && (
                  <div className="relative h-40 rounded-xl overflow-hidden border border-[#EBEBEB]">
                    <img src={mediaUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <label className="input-label">Image URL</label>
                  <input className="input text-[12px] font-mono" placeholder="https://images.unsplash.com/..."
                    value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Live Phone Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="input-label mb-0">Live WhatsApp Preview</p>
            <span className="text-caption text-success flex items-center gap-1">
              <Sparkles size={12} /> Real-time
            </span>
          </div>

          {/* Phone shell */}
          <div className="w-[300px] mx-auto rounded-[32px] border-[6px] border-[#0A0A0A] bg-[#ECE5DD] overflow-hidden shadow-2xl">
            {/* WhatsApp header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#128C7E]">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">G</div>
              <div className="flex-1">
                <p className="text-white text-[12px] font-semibold leading-tight">IronFit Gym</p>
                <p className="text-white/70 text-[10px]">Official Business Account</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-green-300" />
            </div>

            {/* Chat body */}
            <div className="p-3 min-h-[300px] flex flex-col justify-end space-y-2 bg-[#ECE5DD]">
              <p className="text-center text-[10px] text-[#8A8A8A] bg-white/60 rounded px-2 py-0.5 mx-auto">Today</p>

              {/* Green message bubble */}
              <div className="max-w-[92%] self-end bg-[#DCF8C6] rounded-2xl rounded-tr-sm p-2.5 shadow-sm space-y-1.5">
                {mediaType === 'image' && mediaUrl && (
                  <img src={mediaUrl} alt="media" className="w-full rounded-lg object-cover h-28 mb-1" />
                )}
                <p className="text-[11px] text-[#0A0A0A] leading-relaxed whitespace-pre-line">{rendered}</p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-[#8A8A8A]">
                  <span>10:24 AM</span>
                  <CheckCheck size={11} className="text-[#34B7F1]" />
                </div>
              </div>
            </div>

            {/* Input row */}
            <div className="flex items-center gap-2 px-2 py-2 bg-[#F0F0F0]">
              <Smile size={18} className="text-[#8A8A8A]" />
              <div className="flex-1 h-7 rounded-full bg-white px-3 flex items-center text-[11px] text-[#8A8A8A] border border-[#E0E0E0]">
                Type a message
              </div>
              <Mic size={18} className="text-[#8A8A8A]" />
            </div>
          </div>

          {/* Test send */}
          <div className="card space-y-3">
            <p className="input-label mb-0">Send Test WhatsApp</p>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="+91 phone number"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
              />
              <button
                type="button"
                onClick={() => { setTestSent(true); setTimeout(() => setTestSent(false), 3000); }}
                className="btn btn-primary"
              >
                {testSent ? <Check size={15} /> : <Send size={15} strokeWidth={1.5} />}
                {testSent ? 'Sent' : 'Test'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main WhatsApp Automation Page (Screen 9) ──────────────────────────────────

export default function WhatsAppAutomationPage() {
  const [automations, setAutomations] = useState<AutomationItem[]>(INITIAL_AUTOMATIONS);
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns' | 'settings'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);

  const toggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleSave = (updated: TemplateData) => {
    setAutomations(prev =>
      prev.map(a => a.defaultTemplate.id === updated.id ? { ...a, defaultTemplate: updated } : a)
    );
    setEditingTemplate(null);
  };

  if (editingTemplate) {
    return (
      <MessageTemplateEditor
        initialTemplate={editingTemplate}
        onBack={() => setEditingTemplate(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title text-text-primary">WhatsApp Automation</h1>
          <p className="text-body text-text-secondary mt-1">
            Automate member communications, payment alerts, and retention messages via WhatsApp Business API.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-active">WATI / Meta API Connected</span>
          <button
            className="btn btn-primary"
            onClick={() => setEditingTemplate({ name: 'New Template', category: 'Offers & Promotions', content: 'Hi {name},\n\n', mediaType: 'none' })}
          >
            <Plus size={15} strokeWidth={1.5} /> + New Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#EBEBEB]">
        {(['templates', 'campaigns', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Templates Tab — Screen 9 */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <h3 className="text-section-heading text-text-primary">Automated Message Triggers</h3>
              <span className="text-caption text-text-muted">Click any row to edit its message template</span>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left pl-6">Automation</th>
                  <th className="table-header text-left">Description</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {automations.map(item => (
                  <tr
                    key={item.id}
                    className="table-row group cursor-pointer"
                    onClick={() => setEditingTemplate(item.defaultTemplate)}
                  >
                    <td className="px-4 pl-6">
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-table-row font-medium text-text-primary">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 text-table-row text-text-secondary">{item.description}</td>
                    <td className="px-4 text-center" onClick={e => toggle(item.id, e)}>
                      {item.enabled
                        ? <span className="badge badge-active cursor-pointer">Active</span>
                        : <span className="badge badge-expired cursor-pointer">Paused</span>}
                    </td>
                    <td className="px-4 pr-6 text-right">
                      <span className="row-actions text-primary text-badge flex items-center gap-1 justify-end">
                        Edit Template <ChevronRight size={14} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom CTA */}
          <button
            className="btn btn-secondary w-full"
            onClick={() => setEditingTemplate({ name: 'Custom Campaign', category: 'Offers & Promotions', content: 'Hi {name},\n\n', mediaType: 'none' })}
          >
            <Plus size={15} strokeWidth={1.5} /> + Create New Campaign
          </button>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <p className="stat-card-label">Sent This Month</p>
              <p className="stat-card-value mt-2">4,280</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">Delivery Rate</p>
              <p className="stat-card-value mt-2 text-success">99.2%</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">Read / Open Rate</p>
              <p className="stat-card-value mt-2 text-[var(--color-primary)]">88.4%</p>
            </div>
          </div>
          <div className="card">
            <div className="empty-state">
              <TrendingUp className="empty-state-icon" />
              <p className="empty-state-title">No campaigns created yet</p>
              <p className="empty-state-description">Create a broadcast campaign to reach all members at once.</p>
              <button
                className="btn btn-primary"
                onClick={() => setEditingTemplate({ name: 'Broadcast Campaign', category: 'Offers & Promotions', content: 'Hi {name},\n\n', mediaType: 'none' })}
              >
                <Plus size={15} strokeWidth={1.5} /> Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-4">
          <div className="card space-y-4">
            <h3 className="text-section-heading text-text-primary">API Integration</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Business Name', value: 'IronFit Gym Official' },
                { label: 'Sender Phone Number', value: '+91 98765 00000' },
                { label: 'Provider', value: 'WATI (WhatsApp Business API)' },
                { label: 'Monthly Quota', value: '10,000 messages / Unlimited Tier' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-none">
                  <span className="text-body text-text-secondary">{label}</span>
                  <span className="text-table-row font-medium text-text-primary font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-table-row font-medium text-text-primary">Opt-out Compliance</p>
                <p className="text-body text-text-secondary mt-0.5">Auto-respect STOP replies and remove from send lists.</p>
              </div>
              <span className="badge badge-active">Enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

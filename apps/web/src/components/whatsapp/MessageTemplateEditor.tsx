'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  FileText,
  Sparkles,
  Send,
  Save,
  CheckCheck,
  Smile,
  Paperclip,
  Mic,
  Copy,
  Check,
} from 'lucide-react';

export type TemplateData = {
  id?: string;
  name: string;
  category: string;
  content: string;
  mediaType: 'image' | 'video' | 'document' | 'none';
  mediaUrl?: string;
};

interface MessageTemplateEditorProps {
  initialTemplate?: TemplateData;
  onBack?: () => void;
  onSave: (template: TemplateData) => void;
}

const defaultTemplate: TemplateData = {
  name: 'Membership Reminder',
  category: 'Membership Expiry',
  content:
    'Hi {name},\n\nYour gym membership is expiring in {days} days. Renew now and continue your fitness journey!\n\nPay Now: {payment_link}',
  mediaType: 'image',
  mediaUrl:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop',
};

const placeholderTags = [
  { tag: '{name}', label: 'Member Name' },
  { tag: '{days}', label: 'Days Remaining' },
  { tag: '{payment_link}', label: 'Payment Link' },
  { tag: '{gym_name}', label: 'Gym Name' },
  { tag: '{plan_name}', label: 'Plan Name' },
  { tag: '{expiry_date}', label: 'Expiry Date' },
];

export function MessageTemplateEditor({
  initialTemplate = defaultTemplate,
  onBack,
  onSave,
}: MessageTemplateEditorProps) {
  const [name, setName] = useState(initialTemplate.name);
  const [category, setCategory] = useState(initialTemplate.category);
  const [content, setContent] = useState(initialTemplate.content);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | 'none'>(
    initialTemplate.mediaType
  );
  const [mediaUrl, setMediaUrl] = useState(
    initialTemplate.mediaUrl ||
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop'
  );
  const [isCopied, setIsCopied] = useState(false);
  const [testPhone, setTestPhone] = useState('+91 98765 43210');
  const [testSent, setTestSent] = useState(false);

  const charCount = content.length;
  const maxChars = 1000;

  const handleInsertTag = (tag: string) => {
    setContent((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tag + ' ');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialTemplate.id || `tpl-${Date.now()}`,
      name,
      category,
      content,
      mediaType,
      mediaUrl,
    });
  };

  const handleSendTest = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  // Preview content with variables filled in
  const previewRenderedContent = content
    .replace(/{name}/g, 'Rahul Sharma')
    .replace(/{days}/g, '3')
    .replace(/{payment_link}/g, 'https://gym.link/pay/r92')
    .replace(/{gym_name}/g, 'IronFit Gym')
    .replace(/{plan_name}/g, 'Annual Gold Tier')
    .replace(/{expiry_date}/g, '25 Sep 2025');

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              {initialTemplate.id ? 'Edit Message Template' : 'New Message Template'}
            </h2>
            <p className="text-xs text-slate-400">
              Configure automated WhatsApp messages with dynamic member variables.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-950 transition-all hover:scale-[1.02]"
        >
          <Save size={15} />
          Save Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Screen 10 Message Templates Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* Template Name */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Membership Reminder"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="Membership Expiry">Membership Expiry</option>
                <option value="Welcome Message">Welcome Message</option>
                <option value="Payment Reminder">Payment Reminder</option>
                <option value="Birthday Wishes">Birthday Wishes</option>
                <option value="Gym Closed Notice">Gym Closed Notice</option>
                <option value="Offers & Promotions">Offers & Promotions</option>
                <option value="Missed Attendance">Missed Attendance</option>
              </select>
            </div>
          </div>

          {/* Message Content */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Message Content *</label>
              <span className="text-[11px] font-mono text-slate-400">
                {charCount} / {maxChars}
              </span>
            </div>

            {/* Variable Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
              {placeholderTags.map((p) => (
                <button
                  type="button"
                  key={p.tag}
                  onClick={() => handleInsertTag(p.tag)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                >
                  +{p.tag}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={6}
              value={content}
              maxLength={maxChars}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hi {name}, your membership is expiring in {days} days..."
              className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed transition-colors resize-none"
            />
          </div>

          {/* Media (Optional) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">Media (Optional)</span>
              <span className="text-[11px] text-slate-400">WhatsApp media header</span>
            </div>

            {/* Media Type Tabs: Image, Video, Document */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  mediaType === 'image'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon size={14} /> Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  mediaType === 'video'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video size={14} /> Video
              </button>
              <button
                type="button"
                onClick={() => setMediaType('document')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  mediaType === 'document'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText size={14} /> Document
              </button>
            </div>

            {mediaType === 'image' && (
              <div className="space-y-3">
                <div className="relative h-44 rounded-xl overflow-hidden border border-slate-800 group">
                  <img
                    src={mediaUrl}
                    alt="Template banner preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                    <span className="text-[11px] text-white font-medium bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      Banner Preview: STAY FIT STAY STRONG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Image URL / Preset</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://images..."
                    className="w-full h-9 px-3 rounded-lg bg-slate-950/80 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Screen 10 Bottom Action Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-950 transition-all hover:scale-[1.01]"
          >
            Save Template
          </button>
        </form>

        {/* Right Preview: Live WhatsApp Device View */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-slate-300">Live WhatsApp Preview</span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles size={13} /> Real-time Simulation
            </span>
          </div>

          {/* Smartphone WhatsApp Mockup */}
          <div className="w-full max-w-[340px] mx-auto rounded-[36px] bg-[#111B21] border-[6px] border-slate-800 shadow-2xl overflow-hidden text-slate-200">
            {/* Phone Top Notch / Speaker */}
            <div className="h-5 bg-slate-900 flex items-center justify-center">
              <div className="h-1.5 w-16 bg-slate-800 rounded-full" />
            </div>

            {/* WhatsApp Chat Header */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-[#202C33] border-b border-[#2A3942]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                  GF
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 leading-tight">IronFit Gym</h4>
                  <span className="text-[10px] text-emerald-400">Official Business Account</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Chat Body Wallpaper */}
            <div className="p-3 min-h-[380px] bg-[#0B141A] relative flex flex-col justify-end space-y-3">
              {/* Date Stamp */}
              <div className="mx-auto px-2.5 py-0.5 rounded-md bg-[#182229] text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                Today
              </div>

              {/* Message Bubble */}
              <div className="max-w-[90%] self-end bg-[#005C4B] rounded-2xl rounded-tr-sm p-2 text-slate-100 shadow-md space-y-1.5">
                {mediaType === 'image' && mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-1.5">
                    <img
                      src={mediaUrl}
                      alt="Banner"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <p className="text-xs leading-relaxed whitespace-pre-line text-slate-100 font-sans">
                  {previewRenderedContent}
                </p>

                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/70 pt-0.5 font-mono">
                  <span>10:24 AM</span>
                  <CheckCheck size={13} className="text-cyan-300" />
                </div>
              </div>
            </div>

            {/* Chat Input Bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#202C33]">
              <Smile size={18} className="text-slate-400" />
              <div className="flex-1 h-7 rounded-full bg-[#2A3942] px-3 flex items-center text-[11px] text-slate-400">
                Type a message
              </div>
              <Mic size={18} className="text-slate-400" />
            </div>
          </div>

          {/* Test WhatsApp Send Panel */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <span className="text-xs font-medium text-slate-300 block">Send Sample WhatsApp</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 Phone"
                className="flex-1 h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendTest}
                className="px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {testSent ? <Check size={14} className="text-emerald-400" /> : <Send size={14} />}
                {testSent ? 'Sent!' : 'Test'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

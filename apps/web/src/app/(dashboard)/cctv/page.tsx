'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Users,
  Lightbulb,
  ShieldAlert,
  Maximize2,
  Camera,
  CheckCircle2,
  Eye,
  Sparkles,
  X,
  Play,
  Video,
  Clock,
  Plus,
  Settings2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Bell,
  BellOff,
  Edit3,
  Save,
  ChevronDown,
  MapPin,
  Wifi,
  WifiOff,
  SlidersHorizontal,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraFeed = {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: 'online' | 'offline';
  fps: number;
  occupancyCount: number;
  imageUrl: string;
  enabled: boolean;
  alertsEnabled: boolean;
};

type AlertSeverity = 'high' | 'medium' | 'low';
type AlertIconType = 'unattended' | 'crowded' | 'lights' | 'security';

type SmartAlert = {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  severity: AlertSeverity;
  iconType: AlertIconType;
  acknowledged: boolean;
  clipThumbnail: string;
};

type AlertRule = {
  id: string;
  label: string;
  enabled: boolean;
  sensitivity: number; // 0–100
};

// ─── Inline alert icons ────────────────────────────────────────────────────────

function AlertIcon({ type }: { type: AlertIconType }) {
  switch (type) {
    case 'unattended':
      return <AlertTriangle size={18} className="text-warning" strokeWidth={1.5} />;
    case 'crowded':
      return <Users size={18} className="text-danger" strokeWidth={1.5} />;
    case 'lights':
      return <Lightbulb size={18} className="text-[#D97706]" strokeWidth={1.5} />;
    case 'security':
      return <ShieldAlert size={18} className="text-[var(--color-primary)]" strokeWidth={1.5} />;
  }
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (severity === 'high') return <span className="badge badge-overdue">HIGH</span>;
  if (severity === 'medium') return <span className="badge badge-expiring">MEDIUM</span>;
  return <span className="badge badge-active">LOW</span>;
}

// ─── Camera live feed card ─────────────────────────────────────────────────────

function CameraCard({
  cam,
  onExpand,
  managerMode,
  onToggleCamera,
  onEdit,
  onDelete,
}: {
  cam: CameraFeed;
  onExpand: () => void;
  managerMode: boolean;
  onToggleCamera: (id: string) => void;
  onEdit: (cam: CameraFeed) => void;
  onDelete: (id: string) => void;
}) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-GB'));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border bg-black group shadow-sm hover:shadow-card-hover transition-shadow ${
        cam.enabled ? 'border-[#EBEBEB]' : 'border-dashed border-[#D1D5DB] opacity-60'
      }`}
    >
      {/* Image / feed */}
      <div className="relative aspect-video w-full overflow-hidden">
        {cam.enabled ? (
          <img
            src={cam.imageUrl}
            alt={cam.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-[#1A1A1A] flex flex-col items-center justify-center gap-2">
            <WifiOff size={28} className="text-[#555]" />
            <span className="text-[#555] text-[11px] font-medium">Camera Disabled</span>
          </div>
        )}

        {/* Top bar — Camera name & LIVE pill */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent">
          <span className="text-white text-[12px] font-medium tracking-wide">{cam.name}</span>
          {cam.enabled && (
            <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              Live
            </div>
          )}
        </div>

        {/* Bottom bar — timestamp & fps */}
        {cam.enabled && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white/80 text-[10px] font-mono">{time}</span>
            <span className="text-white/80 text-[10px] font-mono">
              {cam.fps} FPS · {cam.occupancyCount} occupants
            </span>
          </div>
        )}

        {/* Hover controls */}
        {!managerMode && cam.enabled && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={onExpand}
              className="btn btn-secondary h-9 w-9 p-0 bg-white/90 hover:bg-white"
              title="Fullscreen"
            >
              <Maximize2 size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => alert(`Snapshot captured — ${cam.name}`)}
              className="btn btn-secondary h-9 w-9 p-0 bg-white/90 hover:bg-white"
              title="Snapshot"
            >
              <Camera size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Manager Mode Overlay */}
        {managerMode && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => onToggleCamera(cam.id)}
              className="btn h-9 px-3 text-[12px] bg-white/90 hover:bg-white text-gray-800 gap-1.5"
              title={cam.enabled ? 'Disable Camera' : 'Enable Camera'}
            >
              {cam.enabled ? <ToggleRight size={15} className="text-success" /> : <ToggleLeft size={15} className="text-danger" />}
              {cam.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={() => onEdit(cam)}
              className="btn h-9 w-9 p-0 bg-white/90 hover:bg-white text-gray-800"
              title="Edit Camera"
            >
              <Edit3 size={15} />
            </button>
            <button
              onClick={() => onDelete(cam.id)}
              className="btn h-9 w-9 p-0 bg-red-500/90 hover:bg-red-500 text-white"
              title="Delete Camera"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-3 py-2 bg-white flex items-center justify-between border-t border-[#F3F4F6]">
        <p className="text-caption text-text-secondary">{cam.location}</p>
        <div className="flex items-center gap-1.5">
          {!cam.alertsEnabled && <BellOff size={12} className="text-text-muted" />}
          <span className={`badge ${cam.enabled ? 'badge-active' : 'badge-overdue'}`}>
            {cam.enabled ? (cam.status === 'online' ? 'Online' : 'Offline') : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Camera Modal ───────────────────────────────────────────────────

function CameraFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CameraFeed | null;
  onSave: (data: Omit<CameraFeed, 'id' | 'status' | 'fps' | 'occupancyCount'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [zone, setZone] = useState(initial?.zone ?? 'Zone A');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [alertsEnabled, setAlertsEnabled] = useState(initial?.alertsEnabled ?? true);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;
    onSave({ name, location, zone, imageUrl: imageUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop', alertsEnabled, enabled });
  };

  const zones = ['Zone A – Functional & Turf', 'Zone B – Free Weights & Racks', 'Zone C – Treadmills & Rowers', 'Zone D – Turnstiles & Reception', 'Zone E – Studio / Spinning', 'Zone F – Locker Room Corridor'];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
        <div className="card max-w-md w-full space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-[var(--color-primary)]" strokeWidth={1.5} />
              <h3 className="text-section-heading text-text-primary">
                {initial ? 'Edit Camera' : 'Add New Camera'}
              </h3>
            </div>
            <button className="btn btn-secondary h-8 w-8 p-0" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Camera Name */}
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Camera Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Main Entrance Cam"
                required
                className="w-full px-3 py-2 text-[13px] border border-[#EBEBEB] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-text-primary bg-white"
              />
            </div>

            {/* Location Description */}
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Location Description <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Zone D – Turnstiles & Reception"
                required
                className="w-full px-3 py-2 text-[13px] border border-[#EBEBEB] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-text-primary bg-white"
              />
            </div>

            {/* Zone Selector */}
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Zone</label>
              <div className="relative">
                <select
                  value={zone}
                  onChange={e => setZone(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-[#EBEBEB] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-text-primary bg-white appearance-none pr-8"
                >
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Feed URL (optional) */}
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                Feed URL / Image URL <span className="text-[#9CA3AF]">(optional)</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://your-rtsp-stream-or-image-url"
                className="w-full px-3 py-2 text-[13px] border border-[#EBEBEB] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-text-primary bg-white"
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  enabled
                    ? 'bg-[#F0FDF4] border-[#86EFAC] text-success'
                    : 'bg-[#FEF2F2] border-[#FCA5A5] text-danger'
                }`}
              >
                {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                Camera {enabled ? 'Active' : 'Disabled'}
              </button>
              <button
                type="button"
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  alertsEnabled
                    ? 'bg-[#EFF6FF] border-[#93C5FD] text-[var(--color-primary)]'
                    : 'bg-[#F9FAFB] border-[#EBEBEB] text-text-muted'
                }`}
              >
                {alertsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                Alerts {alertsEnabled ? 'On' : 'Off'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1 gap-1.5">
                <Save size={14} strokeWidth={1.5} />
                {initial ? 'Save Changes' : 'Add Camera'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Alert Rules Panel ────────────────────────────────────────────────────────

function AlertRulesPanel({
  rules,
  onChange,
}: {
  rules: AlertRule[];
  onChange: (rules: AlertRule[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(rules.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const setSensitivity = (id: string, val: number) =>
    onChange(rules.map(r => (r.id === id ? { ...r, sensitivity: val } : r)));

  return (
    <div className="space-y-3">
      {rules.map(rule => (
        <div
          key={rule.id}
          className={`rounded-xl border p-4 transition-colors ${
            rule.enabled ? 'border-[#EBEBEB] bg-white' : 'border-dashed border-[#D1D5DB] bg-[#F9FAFB]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[13px] font-medium ${rule.enabled ? 'text-text-primary' : 'text-text-muted'}`}>
              {rule.label}
            </span>
            <button
              onClick={() => toggle(rule.id)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                rule.enabled ? 'bg-[var(--color-primary)]' : 'bg-[#D1D5DB]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  rule.enabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {rule.enabled && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-muted w-20">Sensitivity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={rule.sensitivity}
                onChange={e => setSensitivity(rule.id, Number(e.target.value))}
                className="flex-1 accent-[var(--color-primary)]"
              />
              <span className="text-[11px] font-mono text-text-secondary w-8 text-right">
                {rule.sensitivity}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const CAMERAS_SEED: CameraFeed[] = [
  { id: 'c1', name: 'Main Floor', location: 'Zone A – Functional & Turf', zone: 'Zone A', status: 'online', fps: 30, occupancyCount: 18, imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop', enabled: true, alertsEnabled: true },
  { id: 'c2', name: 'Weights Area', location: 'Zone B – Free Weights & Racks', zone: 'Zone B', status: 'online', fps: 30, occupancyCount: 14, imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1200&auto=format&fit=crop', enabled: true, alertsEnabled: true },
  { id: 'c3', name: 'Cardio Area', location: 'Zone C – Treadmills & Rowers', zone: 'Zone C', status: 'online', fps: 30, occupancyCount: 11, imageUrl: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=1200&auto=format&fit=crop', enabled: true, alertsEnabled: true },
  { id: 'c4', name: 'Entrance', location: 'Zone D – Turnstiles & Reception', zone: 'Zone D', status: 'online', fps: 30, occupancyCount: 3, imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200&auto=format&fit=crop', enabled: true, alertsEnabled: false },
];

const INITIAL_ALERTS: SmartAlert[] = [
  { id: 'a1', title: 'Equipment left unattended', location: 'Weights Area – Rack 4', timestamp: '2 min ago', severity: 'medium', iconType: 'unattended', acknowledged: false, clipThumbnail: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop' },
  { id: 'a2', title: 'Crowded area detected', location: 'Cardio Area – Peak Density', timestamp: '12 min ago', severity: 'high', iconType: 'crowded', acknowledged: false, clipThumbnail: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=600&auto=format&fit=crop' },
  { id: 'a3', title: 'Lights left on (after hours)', location: 'Studio 2 – Spinning Room', timestamp: '1 hr ago', severity: 'low', iconType: 'lights', acknowledged: true, clipThumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop' },
  { id: 'a4', title: 'Tailgating attempt at turnstile', location: 'Entrance – Gate 2', timestamp: '25 min ago', severity: 'high', iconType: 'security', acknowledged: false, clipThumbnail: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=600&auto=format&fit=crop' },
];

const INITIAL_RULES: AlertRule[] = [
  { id: 'r1', label: 'Crowded area (occupancy threshold)', enabled: true, sensitivity: 75 },
  { id: 'r2', label: 'Equipment left unattended', enabled: true, sensitivity: 60 },
  { id: 'r3', label: 'Lights left on (after hours)', enabled: true, sensitivity: 90 },
  { id: 'r4', label: 'Tailgating / unauthorized access', enabled: true, sensitivity: 85 },
  { id: 'r5', label: 'Suspicious loitering', enabled: false, sensitivity: 50 },
  { id: 'r6', label: 'Fall or accident detection', enabled: true, sensitivity: 70 },
];

// ─── Main CCTV Page ─────────────────────────────────────────────────────────────

export default function CCTVPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'alerts' | 'manage'>('live');
  const [cameras, setCameras] = useState<CameraFeed[]>(CAMERAS_SEED);
  const [alerts, setAlerts] = useState<SmartAlert[]>(INITIAL_ALERTS);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(INITIAL_RULES);
  const [selectedCamera, setSelectedCamera] = useState<CameraFeed | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SmartAlert | null>(null);
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [managerMode, setManagerMode] = useState(false);

  // Add / Edit camera modal
  const [showCameraForm, setShowCameraForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraFeed | null>(null);

  // Delete confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const unackCount = alerts.filter(a => !a.acknowledged).length;
  const onlineCams = cameras.filter(c => c.enabled && c.status === 'online').length;

  const acknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const handleAddCamera = (data: Omit<CameraFeed, 'id' | 'status' | 'fps' | 'occupancyCount'>) => {
    const newCam: CameraFeed = {
      ...data,
      id: `c${Date.now()}`,
      status: 'online',
      fps: 30,
      occupancyCount: 0,
    };
    setCameras(prev => [...prev, newCam]);
    setShowCameraForm(false);
  };

  const handleEditCamera = (data: Omit<CameraFeed, 'id' | 'status' | 'fps' | 'occupancyCount'>) => {
    if (!editingCamera) return;
    setCameras(prev =>
      prev.map(c => (c.id === editingCamera.id ? { ...c, ...data } : c))
    );
    setEditingCamera(null);
    setShowCameraForm(false);
  };

  const handleToggleCamera = (id: string) => {
    setCameras(prev => prev.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  };

  const handleDeleteCamera = (id: string) => {
    setCameras(prev => prev.filter(c => c.id !== id));
    setDeleteTargetId(null);
  };

  const openEdit = (cam: CameraFeed) => {
    setEditingCamera(cam);
    setShowCameraForm(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title text-text-primary">CCTV &amp; Smart Alerts</h1>
          <p className="text-body text-text-secondary mt-1">
            Real-time multi-camera monitoring with AI-powered behavioral detection alerts.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowAiBoxes(!showAiBoxes)}
            className={`btn ${showAiBoxes ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Sparkles size={15} strokeWidth={1.5} />
            AI Detection: {showAiBoxes ? 'ON' : 'OFF'}
          </button>
          {/* Manager Mode Toggle */}
          <button
            onClick={() => { setManagerMode(!managerMode); if (!managerMode) setActiveTab('manage'); }}
            className={`btn gap-2 ${managerMode ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]' : 'btn-secondary'}`}
          >
            <SlidersHorizontal size={15} strokeWidth={1.5} />
            {managerMode ? 'Exit Manager Mode' : 'Manager Controls'}
          </button>
          <span className="badge badge-active">{onlineCams} / {cameras.length} Feeds Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#EBEBEB]">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'live' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Live View
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'alerts' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Alerts
          {unackCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-[#FEF2F2] text-danger">
              {unackCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'manage' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          <Settings2 size={14} strokeWidth={1.5} />
          Manage
        </button>
      </div>

      {/* ── Live View Tab ── */}
      {activeTab === 'live' && (
        <div className="space-y-8">
          {/* Manager Mode Banner */}
          {managerMode && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl text-[13px] text-[#6D28D9]">
              <SlidersHorizontal size={15} />
              <span className="font-medium">Manager Mode Active</span>
              <span className="text-[#7C3AED]/70">— Hover over any camera to enable, disable, edit, or delete it.</span>
              <button
                onClick={() => { setShowCameraForm(true); setEditingCamera(null); }}
                className="ml-auto btn h-8 px-3 text-[12px] bg-[#7C3AED] text-white hover:bg-[#6D28D9] gap-1.5"
              >
                <Plus size={13} /> Add Camera
              </button>
            </div>
          )}

          {/* Camera Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cameras.map(cam => (
              <CameraCard
                key={cam.id}
                cam={cam}
                onExpand={() => setSelectedCamera(cam)}
                managerMode={managerMode}
                onToggleCamera={handleToggleCamera}
                onEdit={openEdit}
                onDelete={(id) => setDeleteTargetId(id)}
              />
            ))}
            {/* Empty Add Slot — only in manager mode */}
            {managerMode && (
              <button
                onClick={() => { setShowCameraForm(true); setEditingCamera(null); }}
                className="rounded-xl border-2 border-dashed border-[#DDD6FE] bg-[#FAF8FF] hover:bg-[#F5F3FF] transition-colors aspect-video flex flex-col items-center justify-center gap-2 text-[#7C3AED]"
              >
                <Plus size={28} strokeWidth={1.5} />
                <span className="text-[13px] font-medium">Add Camera</span>
              </button>
            )}
          </div>

          {/* Smart Alerts Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-text-secondary" strokeWidth={1.5} />
                <h2 className="text-section-heading text-text-primary">Smart Alerts</h2>
              </div>
              <span className="text-caption text-text-muted">{alerts.length} events detected</span>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left pl-6">Alert</th>
                    <th className="table-header text-left">Location</th>
                    <th className="table-header text-left">Time</th>
                    <th className="table-header text-left">Severity</th>
                    <th className="table-header text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(alert => (
                    <tr key={alert.id} className={`table-row group ${alert.acknowledged ? 'opacity-50' : ''}`}>
                      <td className="px-4 pl-6">
                        <div className="flex items-center gap-2.5">
                          <AlertIcon type={alert.iconType} />
                          <span className={`text-table-row font-medium ${alert.acknowledged ? 'text-text-muted' : 'text-text-primary'}`}>
                            {alert.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 text-table-row text-text-secondary">{alert.location}</td>
                      <td className="px-4 text-table-row text-text-muted font-mono">{alert.timestamp}</td>
                      <td className="px-4"><SeverityBadge severity={alert.severity} /></td>
                      <td className="px-4 pr-6 text-right">
                        <div className="row-actions flex items-center justify-end gap-2">
                          <button className="btn btn-secondary h-8 px-3 text-[12px]" onClick={() => setSelectedAlert(alert)}>
                            <Eye size={13} strokeWidth={1.5} /> View Clip
                          </button>
                          {!alert.acknowledged && (
                            <button className="btn btn-ghost h-8 px-3 text-[12px] text-success" onClick={() => acknowledge(alert.id)}>
                              <CheckCircle2 size={13} strokeWidth={1.5} /> Acknowledge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts Audit Tab ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <p className="stat-card-label">Total Alerts Today</p>
              <p className="stat-card-value mt-2">{alerts.length}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label text-danger">Unacknowledged</p>
              <p className="stat-card-value mt-2 text-danger">{unackCount}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label text-success">Resolved</p>
              <p className="stat-card-value mt-2 text-success">{alerts.length - unackCount}</p>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <h3 className="text-section-heading text-text-primary">Security Audit Log</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left pl-6">Alert</th>
                  <th className="table-header text-left">Location</th>
                  <th className="table-header text-left">Time</th>
                  <th className="table-header text-left">Severity</th>
                  <th className="table-header text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id} className="table-row">
                    <td className="px-4 pl-6">
                      <div className="flex items-center gap-2.5">
                        <AlertIcon type={alert.iconType} />
                        <span className="text-table-row font-medium text-text-primary">{alert.title}</span>
                      </div>
                    </td>
                    <td className="px-4 text-table-row text-text-secondary">{alert.location}</td>
                    <td className="px-4 text-table-row text-text-muted font-mono">{alert.timestamp}</td>
                    <td className="px-4"><SeverityBadge severity={alert.severity} /></td>
                    <td className="px-4">
                      {alert.acknowledged
                        ? <span className="badge badge-active">Resolved</span>
                        : <span className="badge badge-overdue">Action Required</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Manage Tab (Manager Controls) ── */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl text-[13px] text-[#6D28D9]">
            <SlidersHorizontal size={15} />
            <span>This section is for <strong>manager/admin use only</strong>. Configure cameras and AI alert rules here.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left — Camera Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-section-heading text-text-primary flex items-center gap-2">
                  <Video size={16} strokeWidth={1.5} className="text-text-secondary" />
                  Camera Management
                </h2>
                <button
                  onClick={() => { setShowCameraForm(true); setEditingCamera(null); }}
                  className="btn btn-primary h-8 px-3 text-[12px] gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9]"
                >
                  <Plus size={13} /> Add Camera
                </button>
              </div>

              <div className="space-y-2.5">
                {cameras.map(cam => (
                  <div
                    key={cam.id}
                    className={`card p-0 overflow-hidden transition-opacity ${cam.enabled ? '' : 'opacity-60'}`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Thumb */}
                      <div className="h-12 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#111]">
                        <img src={cam.imageUrl} alt={cam.name} className="h-full w-full object-cover opacity-80" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate">{cam.name}</p>
                        <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} /> {cam.location}
                        </p>
                      </div>
                      {/* Status & Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!cam.alertsEnabled && <BellOff size={13} className="text-text-muted" title="Alerts disabled" />}
                        <span className={`badge ${cam.enabled ? 'badge-active' : 'badge-overdue'}`}>
                          {cam.enabled ? 'On' : 'Off'}
                        </span>
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggleCamera(cam.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cam.enabled ? 'bg-[var(--color-primary)]' : 'bg-[#D1D5DB]'}`}
                          title={cam.enabled ? 'Disable camera' : 'Enable camera'}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cam.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                        <button onClick={() => openEdit(cam)} className="btn btn-secondary h-7 w-7 p-0" title="Edit">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => setDeleteTargetId(cam.id)} className="btn btn-secondary h-7 w-7 p-0 hover:border-danger hover:text-danger" title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — AI Alert Rules */}
            <div className="space-y-4">
              <h2 className="text-section-heading text-text-primary flex items-center gap-2">
                <Sparkles size={16} strokeWidth={1.5} className="text-text-secondary" />
                AI Detection Rules
              </h2>
              <p className="text-[12px] text-text-muted -mt-2">
                Toggle detection types and adjust sensitivity thresholds for each AI rule.
              </p>
              <AlertRulesPanel rules={alertRules} onChange={setAlertRules} />
            </div>
          </div>
        </div>
      )}

      {/* ── Camera Fullscreen Modal ── */}
      {selectedCamera && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedCamera(null)} />
          <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
            <div className="w-full max-w-4xl card p-0 overflow-hidden space-y-0">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBEBEB]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                  <h3 className="text-section-heading text-text-primary">{selectedCamera.name}</h3>
                  <span className="text-caption text-text-muted ml-1">({selectedCamera.location})</span>
                </div>
                <button className="btn btn-secondary h-8 w-8 p-0" onClick={() => setSelectedCamera(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="aspect-video w-full relative bg-black">
                <img src={selectedCamera.imageUrl} alt={selectedCamera.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded text-[11px] font-mono text-white">
                  LIVE FEED · {selectedCamera.fps} FPS · {selectedCamera.occupancyCount} Occupants
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Clip Modal ── */}
      {selectedAlert && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedAlert(null)} />
          <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
            <div className="card max-w-md w-full space-y-4">
              <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3">
                <h3 className="text-section-heading text-text-primary">Event Clip</h3>
                <button className="btn btn-secondary h-8 w-8 p-0" onClick={() => setSelectedAlert(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[#EBEBEB] bg-black">
                <img src={selectedAlert.clipThumbnail} alt="clip" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="btn btn-primary h-12 w-12 p-0 rounded-full shadow-lg">
                    <Play size={20} strokeWidth={1.5} className="ml-0.5" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-table-row font-medium text-text-primary">{selectedAlert.title}</p>
                <p className="text-caption text-text-muted mt-0.5">{selectedAlert.location} · {selectedAlert.timestamp}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => setSelectedAlert(null)}>Close</button>
                {!selectedAlert.acknowledged && (
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => { acknowledge(selectedAlert.id); setSelectedAlert(null); }}
                  >
                    <CheckCircle2 size={15} strokeWidth={1.5} /> Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Camera Modal ── */}
      {showCameraForm && (
        <CameraFormModal
          initial={editingCamera}
          onSave={editingCamera ? handleEditCamera : handleAddCamera}
          onClose={() => { setShowCameraForm(false); setEditingCamera(null); }}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTargetId && (
        <>
          <div className="drawer-overlay" onClick={() => setDeleteTargetId(null)} />
          <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
            <div className="card max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                  <Trash2 size={18} className="text-danger" />
                </div>
                <div>
                  <h3 className="text-section-heading text-text-primary">Remove Camera</h3>
                  <p className="text-caption text-text-muted mt-0.5">This will remove the camera from the system.</p>
                </div>
              </div>
              <p className="text-[13px] text-text-secondary">
                Are you sure you want to remove{' '}
                <strong className="text-text-primary">
                  {cameras.find(c => c.id === deleteTargetId)?.name}
                </strong>
                ? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => setDeleteTargetId(null)}>
                  Cancel
                </button>
                <button
                  className="btn flex-1 bg-danger text-white hover:bg-red-600"
                  onClick={() => handleDeleteCamera(deleteTargetId)}
                >
                  <Trash2 size={14} /> Remove Camera
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Activity,
  Dumbbell,
  Bike,
  Wind,
  Droplets,
  Flame,
  Gauge,
  Shield,
  History,
  QrCode,
  Printer,
  User,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentStatus = 'healthy' | 'service_due' | 'overdue';
type TaskPriority = 'High' | 'Medium' | 'Low';
type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type EquipmentItem = {
  id: string;
  name: string;
  code: string;
  category: 'Cardio' | 'Strength' | 'Functional' | 'Recovery';
  brand: string;
  status: EquipmentStatus;
  totalUsageHours: number;
  lastServiceDate: string;
  nextServiceHours: number | string;
  assignedTech: string;
  purchaseDate?: string;
  notes?: string;
  healthMetrics: { motor: number; belt: number; incline: number; console: number };
  serviceHistory: Array<{
    id: string; date: string; technician: string; type: string; notes: string; cost?: string;
  }>;
};

type MaintenanceTask = {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  notes?: string;
};

// ─── Equipment Icon (clean inline SVG per category) ───────────────────────────

function EquipmentIcon({ category, size = 20 }: { category: string; size?: number }) {
  const cls = `text-[var(--color-primary)]`;
  switch (category) {
    case 'Cardio':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      );
    case 'Strength':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M6 5v14M18 5v14M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"/>
        </svg>
      );
    case 'Functional':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12"/>
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      );
  }
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EquipmentStatus }) {
  if (status === 'healthy')
    return <span className="badge badge-active">Healthy</span>;
  if (status === 'service_due')
    return <span className="badge badge-expiring">Service Due</span>;
  return <span className="badge badge-overdue">Overdue</span>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === 'High') return <span className="badge badge-overdue">High</span>;
  if (priority === 'Medium') return <span className="badge badge-expiring">Medium</span>;
  return <span className="badge badge-active">Low</span>;
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const seedEquipment: EquipmentItem[] = [
  {
    id: 'eq-1', name: 'Treadmill T-01', code: 'EQ-TR-01',
    category: 'Cardio', brand: 'Life Fitness', status: 'healthy',
    totalUsageHours: 842, lastServiceDate: '12 Aug 2025',
    nextServiceHours: 120, assignedTech: 'Ramesh (Tech)',
    purchaseDate: '10 Jan 2023',
    healthMetrics: { motor: 100, belt: 95, incline: 98, console: 100 },
    serviceHistory: [
      { id: 'sh-1', date: '12 Aug 2025', technician: 'Ramesh (Tech)', type: 'Belt Lubrication', notes: 'Lubricated walking deck and tensioned drive belt.', cost: '₹1,200' },
      { id: 'sh-2', date: '10 Jun 2025', technician: 'Suresh Kumar', type: 'Incline Motor Inspection', notes: 'Checked incline potentiometer and gear assembly.', cost: '₹800' },
    ],
  },
  {
    id: 'eq-2', name: 'Cable Machine C-03', code: 'EQ-CB-03',
    category: 'Strength', brand: 'Matrix', status: 'service_due',
    totalUsageHours: 1240, lastServiceDate: '01 Jul 2025',
    nextServiceHours: '15 hrs left', assignedTech: 'Ramesh (Tech)',
    purchaseDate: '5 Mar 2022',
    healthMetrics: { motor: 82, belt: 68, incline: 75, console: 90 },
    serviceHistory: [
      { id: 'sh-4', date: '01 Jul 2025', technician: 'Ramesh (Tech)', type: 'Cable Tensioning', notes: 'Adjusted cable tension on dual swivel pulleys.', cost: '₹600' },
    ],
  },
  {
    id: 'eq-3', name: 'Smith Machine S-02', code: 'EQ-SM-02',
    category: 'Strength', brand: 'Body Solid', status: 'healthy',
    totalUsageHours: 510, lastServiceDate: '28 Aug 2025',
    nextServiceHours: 200, assignedTech: 'Ramesh (Tech)',
    purchaseDate: '20 Jun 2022',
    healthMetrics: { motor: 100, belt: 98, incline: 100, console: 100 },
    serviceHistory: [
      { id: 'sh-5', date: '28 Aug 2025', technician: 'Ramesh (Tech)', type: 'Rail Lubrication', notes: 'Applied white lithium grease to vertical guide rails.', cost: '₹450' },
    ],
  },
  {
    id: 'eq-4', name: 'Leg Press L-01', code: 'EQ-LP-01',
    category: 'Strength', brand: 'Technogym', status: 'overdue',
    totalUsageHours: 1980, lastServiceDate: '15 May 2025',
    nextServiceHours: 'Overdue (5 days)', assignedTech: 'Suresh Kumar',
    purchaseDate: '15 Dec 2021',
    healthMetrics: { motor: 65, belt: 60, incline: 55, console: 80 },
    serviceHistory: [
      { id: 'sh-6', date: '15 May 2025', technician: 'Suresh Kumar', type: 'Safety Stopper Check', notes: 'Safety catch pins verified and carriage wheels greased.', cost: '₹950' },
    ],
  },
];

const seedTasks: MaintenanceTask[] = [
  { id: 't-1', title: 'Treadmill T-01 — Belt service', category: 'Equipment', dueDate: 'Due in 15 days', priority: 'High', status: 'pending', assignedTo: 'Ramesh (Tech)', notes: 'Belt alignment and motor sensor recalibration.' },
  { id: 't-2', title: 'AC Unit A-01 — Filter clean', category: 'Facility', dueDate: 'Due in 3 days', priority: 'Medium', status: 'pending', assignedTo: 'Suresh Kumar', notes: 'HVAC dust accumulation near cardio section.' },
  { id: 't-3', title: 'Water Purifier — Filter change', category: 'Facility', dueDate: 'Due in 7 days', priority: 'Medium', status: 'in_progress', assignedTo: 'Vikram Singh', notes: 'RO membrane replacement & TDS check.' },
  { id: 't-4', title: 'Fire Extinguisher — Expiry check', category: 'Safety', dueDate: 'Due in 12 days', priority: 'Low', status: 'pending', assignedTo: 'Priya Nair', notes: 'Annual safety certification.' },
  { id: 't-5', title: 'Cable Machine C-03 — Pulley test', category: 'Equipment', dueDate: 'Today', priority: 'High', status: 'in_progress', assignedTo: 'Ramesh (Tech)', notes: 'Wire fraying test in progress.' },
  { id: 't-6', title: 'Smith Machine S-02 — Full service', category: 'Equipment', dueDate: 'Completed', priority: 'Medium', status: 'completed', assignedTo: 'Ramesh (Tech)', notes: 'Guide rods lubricated with synthetic oil.' },
];

const TECHNICIANS = ['Ramesh (Tech)', 'Suresh Kumar', 'Vikram Singh', 'Priya Nair', 'External Service Center'];
const CATEGORIES = ['Cardio', 'Strength', 'Functional', 'Recovery'];

// ─── Health Progress Bar ────────────────────────────────────────────────────────

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? '#16A34A' : value >= 70 ? '#D97706' : '#DC2626';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[12px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono text-text-primary font-medium">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Equipment Health Card (Screen 6) ──────────────────────────────────────────

function EquipmentHealthCard({ equipment, onBack, onScheduleService }: {
  equipment: EquipmentItem;
  onBack: () => void;
  onScheduleService: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'history'>('overview');
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn btn-secondary h-9 w-9 p-0 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-page-title text-text-primary">Equipment Health Card</h1>
          <p className="text-body text-text-secondary mt-0.5">Live telemetry &amp; service log for {equipment.name}</p>
        </div>
      </div>

      {/* Equipment header card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <EquipmentIcon category={equipment.category} size={40} />
            </div>
            <div>
              <h2 className="text-section-heading text-text-primary">{equipment.name}</h2>
              <p className="text-body text-text-secondary">{equipment.category} · {equipment.brand} · <span className="font-mono">{equipment.code}</span></p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={equipment.status} />
                {equipment.purchaseDate && (
                  <span className="text-caption text-text-muted">Purchased: {equipment.purchaseDate}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={() => setShowQr(true)} className="btn btn-secondary">
              <QrCode size={15} strokeWidth={1.5} />
              QR Code
            </button>
            <button onClick={onScheduleService} className="btn btn-primary">
              <Plus size={15} strokeWidth={1.5} />
              Schedule Task
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#EBEBEB]">
        {(['overview', 'maintenance', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'maintenance' ? 'Maintenance' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="stat-card-label">Total Usage</p>
              <p className="stat-card-value mt-2">{equipment.totalUsageHours}<span className="text-base text-text-secondary ml-1">hrs</span></p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">Last Service</p>
              <p className="text-[16px] font-medium text-text-primary mt-2 font-mono">{equipment.lastServiceDate}</p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">Next Service</p>
              <p className="stat-card-value mt-2 text-warning text-[18px]">
                {typeof equipment.nextServiceHours === 'number' ? `${equipment.nextServiceHours} hrs` : equipment.nextServiceHours}
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-card-label">Assigned Tech</p>
              <p className="text-[14px] font-medium text-text-primary mt-2">{equipment.assignedTech}</p>
            </div>
          </div>

          {/* Health status bars */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-section-heading text-text-primary">Health Status</h3>
              <span className="text-caption text-success flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                Live Telemetry
              </span>
            </div>
            <HealthBar label="Motor" value={equipment.healthMetrics.motor} />
            <HealthBar label="Belt / Drive Chain" value={equipment.healthMetrics.belt} />
            <HealthBar label="Incline / Resistance" value={equipment.healthMetrics.incline} />
            <HealthBar label="Console / Display" value={equipment.healthMetrics.console} />
          </div>

          {equipment.notes && (
            <div className="card border-l-4 border-l-[var(--color-primary)] py-3 px-4">
              <p className="text-caption text-text-muted uppercase tracking-wide mb-1">Notes</p>
              <p className="text-body text-text-secondary">{equipment.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="card space-y-3">
          <h3 className="text-section-heading text-text-primary">Preventive Maintenance Checklist</h3>
          <div className="space-y-2">
            {[
              { task: 'Deck & belt lubrication', due: 'Every 50 hrs', done: true },
              { task: 'Motor sensor & belt alignment', due: 'Every 100 hrs', done: true },
              { task: 'Incline elevation calibration', due: 'Every 150 hrs', done: false },
              { task: 'Emergency stop & safety cord test', due: 'Weekly', done: true },
              { task: 'Power cord & plug inspection', due: 'Monthly', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#F3F4F6] last:border-none">
                <div className="flex items-center gap-2.5">
                  {item.done
                    ? <CheckCircle2 size={16} className="text-success shrink-0" />
                    : <Clock size={16} className="text-warning shrink-0" />
                  }
                  <span className={`text-body ${item.done ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>{item.task}</span>
                </div>
                <span className="text-caption text-text-muted">{item.due}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left pl-6">Date</th>
                <th className="table-header text-left">Type</th>
                <th className="table-header text-left">Technician</th>
                <th className="table-header text-left">Notes</th>
                <th className="table-header text-right pr-6">Cost</th>
              </tr>
            </thead>
            <tbody>
              {equipment.serviceHistory.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="px-4 pl-6 text-table-row text-text-muted font-mono">{item.date}</td>
                  <td className="px-4 text-table-row text-text-primary font-medium">{item.type}</td>
                  <td className="px-4 text-table-row text-text-secondary">{item.technician}</td>
                  <td className="px-4 text-table-row text-text-secondary max-w-xs truncate">{item.notes}</td>
                  <td className="px-4 pr-6 text-right text-table-row text-text-primary font-mono">{item.cost ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Modal */}
      {showQr && (
        <div className="drawer-overlay" onClick={() => setShowQr(false)}>
          <div className="fixed inset-0 z-[62] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm card text-center space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-section-heading text-text-primary">Machine QR Tag</h3>
                <button onClick={() => setShowQr(false)} className="btn btn-secondary h-8 w-8 p-0"><X size={16} /></button>
              </div>
              <div className="p-4 border border-[#EBEBEB] rounded-xl inline-block mx-auto">
                <svg viewBox="0 0 100 100" className="w-40 h-40" fill="#0A0A0A">
                  <rect x="0" y="0" width="30" height="30" rx="3"/>
                  <rect x="6" y="6" width="18" height="18" fill="white"/>
                  <rect x="10" y="10" width="10" height="10"/>
                  <rect x="70" y="0" width="30" height="30" rx="3"/>
                  <rect x="76" y="6" width="18" height="18" fill="white"/>
                  <rect x="80" y="10" width="10" height="10"/>
                  <rect x="0" y="70" width="30" height="30" rx="3"/>
                  <rect x="6" y="76" width="18" height="18" fill="white"/>
                  <rect x="10" y="80" width="10" height="10"/>
                  <rect x="36" y="6" width="6" height="18"/>
                  <rect x="46" y="4" width="12" height="6"/>
                  <rect x="60" y="36" width="10" height="10" rx="2"/>
                  <rect x="36" y="44" width="18" height="8"/>
                  <rect x="44" y="54" width="8" height="16"/>
                  <rect x="68" y="50" width="10" height="20"/>
                  <rect x="80" y="70" width="16" height="6"/>
                  <rect x="38" y="72" width="22" height="10" rx="2"/>
                </svg>
              </div>
              <div>
                <p className="text-section-heading text-text-primary">{equipment.name}</p>
                <p className="text-caption text-text-muted font-mono mt-0.5">{equipment.code}</p>
                <p className="text-body text-text-secondary mt-2">Scan to view or log service records directly on the machine.</p>
              </div>
              <button onClick={() => window.print()} className="btn btn-secondary w-full">
                <Printer size={15} strokeWidth={1.5} /> Print Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Maintenance Tasks (Screen 13) ─────────────────────────────────────────────

function MaintenanceTasks({
  tasks, setTasks,
  onAddTask,
}: {
  tasks: MaintenanceTask[];
  setTasks: (t: MaintenanceTask[]) => void;
  onAddTask: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TaskStatus>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const filtered = tasks.filter(t =>
    t.status === activeTab && (priorityFilter === 'All' || t.priority === priorityFilter)
  );

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
    if (selectedTask?.id === id) setSelectedTask({ ...selectedTask, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title text-text-primary">Maintenance Tasks</h1>
          <p className="text-body text-text-secondary mt-1">Track scheduled service tasks, technician assignments, and completion status.</p>
        </div>
        <button onClick={onAddTask} className="btn btn-primary">
          <Plus size={15} strokeWidth={1.5} /> + Add Task
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-4 border-b border-[#EBEBEB]">
        {([['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-1 pb-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-[#F3F4F6] text-text-muted font-mono">
              {counts[key]}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 pb-3 text-text-secondary text-[13px]">
          <Filter size={13} /> Priority:
          {(['All', 'High', 'Medium', 'Low'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-0.5 rounded-md text-[12px] transition-colors ${
                priorityFilter === p ? 'bg-[#F3F4F6] text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
              }`}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <CheckCircle2 className="empty-state-icon text-success" />
            <p className="empty-state-title">No {activeTab.replace('_', ' ')} tasks</p>
            <p className="empty-state-description">All tasks in this stage are cleared.</p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left pl-6">Task</th>
                <th className="table-header text-left">Due Schedule</th>
                <th className="table-header text-left">Priority</th>
                <th className="table-header text-left">Assigned To</th>
                <th className="table-header text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task.id} className="table-row group" onClick={() => setSelectedTask(task)}>
                  <td className="px-4 pl-6">
                    <div className="flex items-center gap-2.5">
                      <Wrench size={15} className="text-text-muted shrink-0" strokeWidth={1.5} />
                      <div>
                        <p className="text-table-row font-medium text-text-primary">{task.title}</p>
                        <p className="text-caption text-text-muted">{task.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 text-table-row text-text-secondary">{task.dueDate}</td>
                  <td className="px-4"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 text-table-row text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-text-muted" />
                      {task.assignedTo}
                    </div>
                  </td>
                  <td className="px-4 pr-6 text-right row-actions">
                    <ChevronRight size={16} className="text-text-muted ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedTask(null)} />
          <div className="drawer-panel">
            <div className="drawer-header">
              <div>
                <h3 className="text-section-heading text-text-primary">{selectedTask.title}</h3>
                <p className="text-body text-text-muted">{selectedTask.category}</p>
              </div>
              <button className="btn btn-secondary h-8 w-8 p-0" onClick={() => setSelectedTask(null)}><X size={16} /></button>
            </div>
            <div className="drawer-body space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-card">
                  <p className="stat-card-label">Due Schedule</p>
                  <p className="text-table-row font-medium text-text-primary mt-1">{selectedTask.dueDate}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Priority</p>
                  <div className="mt-1"><PriorityBadge priority={selectedTask.priority} /></div>
                </div>
              </div>
              <div className="stat-card">
                <p className="stat-card-label">Assigned Technician</p>
                <p className="text-table-row font-medium text-text-primary mt-1">{selectedTask.assignedTo}</p>
              </div>
              {selectedTask.notes && (
                <div className="stat-card">
                  <p className="stat-card-label">Notes</p>
                  <p className="text-body text-text-secondary mt-1">{selectedTask.notes}</p>
                </div>
              )}
              <div>
                <p className="input-label">Update Status</p>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(['pending', 'in_progress', 'completed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedTask.id, s)}
                      className={`btn text-[12px] h-8 ${selectedTask.status === s ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {s === 'pending' ? 'Pending' : s === 'in_progress' ? 'In Progress' : 'Done'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Add/Edit Equipment Drawer ─────────────────────────────────────────────────

function EquipmentDrawer({
  equipment,
  onClose,
  onSave,
}: {
  equipment?: EquipmentItem | null;
  onClose: () => void;
  onSave: (eq: EquipmentItem) => void;
}) {
  const isEdit = !!equipment;
  const [form, setForm] = useState({
    name: equipment?.name ?? '',
    code: equipment?.code ?? '',
    category: equipment?.category ?? 'Cardio' as EquipmentItem['category'],
    brand: equipment?.brand ?? '',
    status: equipment?.status ?? 'healthy' as EquipmentStatus,
    totalUsageHours: equipment?.totalUsageHours ?? 0,
    lastServiceDate: equipment?.lastServiceDate ?? '',
    nextServiceHours: equipment?.nextServiceHours ?? 100,
    assignedTech: equipment?.assignedTech ?? TECHNICIANS[0],
    purchaseDate: equipment?.purchaseDate ?? '',
    notes: equipment?.notes ?? '',
    motorHealth: equipment?.healthMetrics.motor ?? 100,
    beltHealth: equipment?.healthMetrics.belt ?? 100,
    inclineHealth: equipment?.healthMetrics.incline ?? 100,
    consoleHealth: equipment?.healthMetrics.console ?? 100,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item: EquipmentItem = {
      id: equipment?.id ?? `eq-${Date.now()}`,
      name: form.name,
      code: form.code,
      category: form.category,
      brand: form.brand,
      status: form.status,
      totalUsageHours: Number(form.totalUsageHours),
      lastServiceDate: form.lastServiceDate,
      nextServiceHours: Number(form.nextServiceHours) || form.nextServiceHours,
      assignedTech: form.assignedTech,
      purchaseDate: form.purchaseDate,
      notes: form.notes,
      healthMetrics: {
        motor: Number(form.motorHealth),
        belt: Number(form.beltHealth),
        incline: Number(form.inclineHealth),
        console: Number(form.consoleHealth),
      },
      serviceHistory: equipment?.serviceHistory ?? [],
    };
    onSave(item);
    onClose();
  };

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="input-label">{label}</label>
      {node}
    </div>
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <form onSubmit={handleSubmit} className="drawer-panel">
        <div className="drawer-header">
          <div>
            <h3 className="text-section-heading text-text-primary">
              {isEdit ? 'Edit Equipment' : 'Add New Equipment'}
            </h3>
            <p className="text-body text-text-muted">
              {isEdit ? 'Update equipment details and health metrics.' : 'Register a new machine or equipment item.'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary h-8 w-8 p-0" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="drawer-body space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('Equipment Name *', (
              <input required className="input" placeholder="e.g. Treadmill T-01" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            ))}
            {field('Equipment Code *', (
              <input required className="input font-mono" placeholder="EQ-TR-01" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Category *', (
              <select required className="input" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as EquipmentItem['category'] }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            ))}
            {field('Brand *', (
              <input required className="input" placeholder="e.g. Life Fitness" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Status', (
              <select className="input" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipmentStatus }))}>
                <option value="healthy">Healthy</option>
                <option value="service_due">Service Due</option>
                <option value="overdue">Overdue</option>
              </select>
            ))}
            {field('Assigned Technician', (
              <select className="input" value={form.assignedTech}
                onChange={e => setForm(f => ({ ...f, assignedTech: e.target.value }))}>
                {TECHNICIANS.map(t => <option key={t}>{t}</option>)}
              </select>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Total Usage (hrs)', (
              <input type="number" min={0} className="input" placeholder="842" value={form.totalUsageHours}
                onChange={e => setForm(f => ({ ...f, totalUsageHours: Number(e.target.value) }))} />
            ))}
            {field('Next Service (hrs)', (
              <input type="number" min={0} className="input" placeholder="120" value={form.nextServiceHours as number}
                onChange={e => setForm(f => ({ ...f, nextServiceHours: Number(e.target.value) }))} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Last Service Date', (
              <input className="input" placeholder="12 Aug 2025" value={form.lastServiceDate}
                onChange={e => setForm(f => ({ ...f, lastServiceDate: e.target.value }))} />
            ))}
            {field('Purchase Date', (
              <input className="input" placeholder="10 Jan 2023" value={form.purchaseDate}
                onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
            ))}
          </div>

          {/* Health Metrics */}
          <div>
            <p className="input-label mb-3">Health Metrics (0–100%)</p>
            <div className="space-y-3">
              {[
                { key: 'motorHealth', label: 'Motor' },
                { key: 'beltHealth', label: 'Belt / Drive Chain' },
                { key: 'inclineHealth', label: 'Incline / Resistance' },
                { key: 'consoleHealth', label: 'Console / Display' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-body text-text-secondary w-32 shrink-0">{label}</span>
                  <input
                    type="range" min={0} max={100}
                    value={(form as Record<string, unknown>)[key] as number}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-body font-mono text-text-primary w-10 text-right">
                    {(form as Record<string, unknown>)[key] as number}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {field('Notes (optional)', (
            <textarea rows={3} className="input h-auto py-2 resize-none" placeholder="Any additional service notes or remarks..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          ))}
        </div>

        <div className="drawer-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Add Equipment'}</button>
        </div>
      </form>
    </>
  );
}

// ─── Add Task Drawer ────────────────────────────────────────────────────────────

function AddTaskDrawer({ onClose, onSave }: { onClose: () => void; onSave: (t: MaintenanceTask) => void }) {
  const [form, setForm] = useState({
    title: '', category: 'Equipment', dueDate: '', priority: 'Medium' as TaskPriority, assignedTo: TECHNICIANS[0], notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: `t-${Date.now()}`, ...form, status: 'pending' });
    onClose();
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <form onSubmit={handleSubmit} className="drawer-panel">
        <div className="drawer-header">
          <div>
            <h3 className="text-section-heading text-text-primary">Add Maintenance Task</h3>
            <p className="text-body text-text-muted">Schedule a service task or inspection.</p>
          </div>
          <button type="button" className="btn btn-secondary h-8 w-8 p-0" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="drawer-body space-y-4">
          <div>
            <label className="input-label">Task Title *</label>
            <input required className="input" placeholder="e.g. Treadmill T-01 — Belt service"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['Equipment', 'Facility', 'Safety', 'Plumbing', 'Electrical'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
                {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Due Schedule</label>
            <input className="input" placeholder="e.g. Due in 7 days, Today, Weekly"
              value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div>
            <label className="input-label">Assigned Technician</label>
            <select className="input" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
              {TECHNICIANS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea rows={3} className="input h-auto py-2 resize-none" placeholder="Describe the work required..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save Task</button>
        </div>
      </form>
    </>
  );
}

// ─── Main Maintenance Page (Screen 5) ─────────────────────────────────────────

export default function MaintenancePage() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>(seedEquipment);
  const [tasks, setTasks] = useState<MaintenanceTask[]>(seedTasks);
  const [activeTab, setActiveTab] = useState<'equipment' | 'facilities' | 'tasks'>('equipment');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const stats = {
    total: equipment.length,
    healthy: equipment.filter(e => e.status === 'healthy').length,
    service_due: equipment.filter(e => e.status === 'service_due').length,
    overdue: equipment.filter(e => e.status === 'overdue').length,
  };

  const filteredEquipment = equipment.filter(eq => {
    const q = search.toLowerCase();
    const matchSearch = eq.name.toLowerCase().includes(q) || eq.brand.toLowerCase().includes(q) || eq.code.toLowerCase().includes(q);
    const matchCat = categoryFilter === 'All' || eq.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleSaveEquipment = (eq: EquipmentItem) => {
    setEquipment(prev => {
      const exists = prev.find(e => e.id === eq.id);
      return exists ? prev.map(e => e.id === eq.id ? eq : e) : [eq, ...prev];
    });
    setEditingEquipment(null);
  };

  const handleDelete = (id: string) => {
    setEquipment(prev => prev.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  if (selectedEquipment) {
    return (
      <div className="space-y-8">
        <EquipmentHealthCard
          equipment={selectedEquipment}
          onBack={() => setSelectedEquipment(null)}
          onScheduleService={() => { setSelectedEquipment(null); setActiveTab('tasks'); setShowAddTask(true); }}
        />
        {(showAddEquipment || editingEquipment) && (
          <EquipmentDrawer
            equipment={editingEquipment}
            onClose={() => { setShowAddEquipment(false); setEditingEquipment(null); }}
            onSave={handleSaveEquipment}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-page-title text-text-primary">Maintenance</h1>
          <p className="text-body text-text-secondary mt-1">
            Manage gym equipment, facility infrastructure, and scheduled service tasks.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'tasks'
            ? <button className="btn btn-primary" onClick={() => setShowAddTask(true)}><Plus size={15} strokeWidth={1.5} /> + Add Task</button>
            : <button className="btn btn-primary" onClick={() => setShowAddEquipment(true)}><Plus size={15} strokeWidth={1.5} /> + Add Equipment</button>
          }
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-1 border-b border-[#EBEBEB]">
        {([['equipment', 'Equipment'], ['facilities', 'Facilities'], ['tasks', 'Tasks']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' ? (
        <MaintenanceTasks tasks={tasks} setTasks={setTasks} onAddTask={() => setShowAddTask(true)} />
      ) : activeTab === 'facilities' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'HVAC & Air Flow', detail: '4 units operating at 100% • 21°C', note: 'Filter inspection in 30 days.', status: 'healthy' as const },
              { title: 'Water Purifier & RO', detail: 'TDS: 110 ppm • Chiller 8°C', note: 'Filter change due in 7 days.', status: 'service_due' as const },
              { title: 'Backup Power Generator', detail: 'Diesel: 85% • Auto-switch OK', note: 'Next service: 15 Nov 2025.', status: 'healthy' as const },
              { title: 'Fire Safety Systems', detail: '4 extinguishers verified • Sprinklers OK', note: 'Annual certification due Jan 2026.', status: 'healthy' as const },
              { title: 'Locker Room Plumbing', detail: '8 showers • 2 sinks all operational', note: 'Shower drain cleaning due in 5 days.', status: 'service_due' as const },
              { title: 'Studio Sound System', detail: 'Zone A, B, C — All active', note: 'Amplifier fan cleaned on 1 Sep.', status: 'healthy' as const },
            ].map((item, i) => (
              <div key={i} className="card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-section-heading text-text-primary">{item.title}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-body text-text-secondary mt-2">{item.detail}</p>
                <p className="text-caption text-text-muted mt-1">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Screen 5 — Equipment Overview */
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => setCategoryFilter('All')}>
              <p className="stat-card-label">Total Equipment</p>
              <p className="stat-card-value mt-2">{stats.total}</p>
            </div>
            <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow">
              <p className="stat-card-label text-success">Healthy</p>
              <p className="stat-card-value mt-2 text-success">{stats.healthy}</p>
            </div>
            <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow">
              <p className="stat-card-label text-warning">Needs Service</p>
              <p className="stat-card-value mt-2 text-warning">{stats.service_due}</p>
            </div>
            <div className="stat-card cursor-pointer hover:shadow-card-hover transition-shadow">
              <p className="stat-card-label text-danger">Overdue</p>
              <p className="stat-card-value mt-2 text-danger">{stats.overdue}</p>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.5} />
              <input
                className="input pl-9"
                placeholder="Search equipment by name, brand, or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-auto"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Equipment Table */}
          {filteredEquipment.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <Wrench className="empty-state-icon" />
                <p className="empty-state-title">No equipment found</p>
                <p className="empty-state-description">
                  {search ? `No results for "${search}".` : 'Add your first piece of equipment to get started.'}
                </p>
                <button className="btn btn-primary" onClick={() => setShowAddEquipment(true)}>
                  <Plus size={15} strokeWidth={1.5} /> Add Equipment
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left pl-6">Equipment</th>
                    <th className="table-header text-left">Category</th>
                    <th className="table-header text-left">Brand</th>
                    <th className="table-header text-left">Status</th>
                    <th className="table-header text-left">Next Service</th>
                    <th className="table-header text-left">Assigned Tech</th>
                    <th className="table-header text-right pr-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map(eq => (
                    <tr
                      key={eq.id}
                      className="table-row group cursor-pointer"
                      onClick={() => setSelectedEquipment(eq)}
                    >
                      <td className="px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <EquipmentIcon category={eq.category} size={18} />
                          <div>
                            <p className="text-table-row font-medium text-text-primary">{eq.name}</p>
                            <p className="text-caption text-text-muted font-mono">{eq.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 text-table-row text-text-secondary">{eq.category}</td>
                      <td className="px-4 text-table-row text-text-secondary">{eq.brand}</td>
                      <td className="px-4"><StatusBadge status={eq.status} /></td>
                      <td className="px-4 text-table-row text-text-secondary font-mono">
                        {typeof eq.nextServiceHours === 'number' ? `${eq.nextServiceHours} hrs` : eq.nextServiceHours}
                      </td>
                      <td className="px-4 text-table-row text-text-secondary">{eq.assignedTech}</td>
                      <td className="px-4 pr-6 text-right">
                        <div className="row-actions flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-ghost h-8 w-8 p-0"
                            title="Edit"
                            onClick={e => { e.stopPropagation(); setEditingEquipment(eq); }}
                          >
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            className="btn btn-danger h-8 w-8 p-0"
                            title="Delete"
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(eq.id); }}
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            className="text-primary hover:underline text-badge flex items-center gap-1"
                            onClick={e => { e.stopPropagation(); setSelectedEquipment(eq); }}
                          >
                            View <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-3 border-t border-[#F3F4F6] bg-[#F9F9F8]">
                <span className="text-caption text-text-muted">
                  Showing {filteredEquipment.length} of {equipment.length} equipment items
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      {(showAddEquipment || editingEquipment) && (
        <EquipmentDrawer
          equipment={editingEquipment}
          onClose={() => { setShowAddEquipment(false); setEditingEquipment(null); }}
          onSave={handleSaveEquipment}
        />
      )}

      {showAddTask && (
        <AddTaskDrawer
          onClose={() => setShowAddTask(false)}
          onSave={task => setTasks(prev => [task, ...prev])}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <>
          <div className="drawer-overlay" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
            <div className="card max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-danger shrink-0" />
                <h3 className="text-section-heading text-text-primary">Delete Equipment?</h3>
              </div>
              <p className="text-body text-text-secondary">
                This will permanently remove <strong>{equipment.find(e => e.id === deleteConfirm)?.name}</strong> and all its service history. This cannot be undone.
              </p>
              <div className="flex gap-2 pt-2">
                <button className="btn btn-secondary flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger flex-1" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Filter,
  User,
  Calendar,
  X,
  ChevronRight,
  MoreVertical,
  Activity,
  Droplets,
  Flame,
  Wind,
} from 'lucide-react';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type MaintenanceTask = {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  avatarUrl?: string;
  notes?: string;
  iconType?: 'treadmill' | 'ac' | 'water' | 'fire' | 'general';
};

const initialTasks: MaintenanceTask[] = [
  {
    id: 'task-1',
    title: 'Treadmill T-01',
    category: 'Equipment',
    dueDate: 'Service due - 15 days',
    priority: 'High',
    status: 'pending',
    assignedTo: 'Ramesh (Tech)',
    notes: 'Belt alignment and motor sensor recalibration needed.',
    iconType: 'treadmill',
  },
  {
    id: 'task-2',
    title: 'AC Unit A-01',
    category: 'Facility',
    dueDate: 'Filter cleaning - 3 days',
    priority: 'Medium',
    status: 'pending',
    assignedTo: 'Suresh Kumar',
    notes: 'HVAC dust accumulation reported near cardio section.',
    iconType: 'ac',
  },
  {
    id: 'task-3',
    title: 'Water Purifier',
    category: 'Facility',
    dueDate: 'Filter change - 7 days',
    priority: 'Medium',
    status: 'pending',
    assignedTo: 'Vikram Singh',
    notes: 'RO membrane replacement & TDS check.',
    iconType: 'water',
  },
  {
    id: 'task-4',
    title: 'Fire Extinguisher',
    category: 'Safety',
    dueDate: 'Check expiry - 12 days',
    priority: 'Low',
    status: 'pending',
    assignedTo: 'Priya Nair',
    notes: 'Annual safety certification and pressure gauge verification.',
    iconType: 'fire',
  },
  {
    id: 'task-5',
    title: 'Cable Machine C-03',
    category: 'Equipment',
    dueDate: 'Pulley tension test - Today',
    priority: 'High',
    status: 'in_progress',
    assignedTo: 'Ramesh (Tech)',
    notes: 'Technician currently testing wire fraying.',
    iconType: 'treadmill',
  },
  {
    id: 'task-6',
    title: 'Shower Drainage Block',
    category: 'Facility',
    dueDate: 'Deep descaling - Today',
    priority: 'Medium',
    status: 'in_progress',
    assignedTo: 'Suresh Kumar',
    notes: 'Plumber working on Locker Room B.',
    iconType: 'water',
  },
  {
    id: 'task-7',
    title: 'Smith Machine S-02',
    category: 'Equipment',
    dueDate: 'Completed yesterday',
    priority: 'Medium',
    status: 'completed',
    assignedTo: 'Ramesh (Tech)',
    notes: 'Guide rods lubricated with synthetic oil.',
    iconType: 'treadmill',
  },
  {
    id: 'task-8',
    title: 'Sound System Amplifier',
    category: 'Facility',
    dueDate: 'Completed 3 days ago',
    priority: 'Low',
    status: 'completed',
    assignedTo: 'Vikram Singh',
    notes: 'Bass channel ground loop humming resolved.',
    iconType: 'general',
  },
];

export function MaintenanceTasksView() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<TaskStatus>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Equipment');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newAssignedTo, setNewAssignedTo] = useState('Ramesh (Tech)');
  const [newNotes, setNewNotes] = useState('');

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const filteredTasks = tasks.filter((task) => {
    if (task.status !== activeTab) return false;
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
    return true;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Low
          </span>
        );
    }
  };

  const getTaskIcon = (iconType?: string) => {
    switch (iconType) {
      case 'ac':
        return <Wind className="h-5 w-5 text-cyan-400" />;
      case 'water':
        return <Droplets className="h-5 w-5 text-blue-400" />;
      case 'fire':
        return <Flame className="h-5 w-5 text-orange-400" />;
      case 'treadmill':
      default:
        return <Activity className="h-5 w-5 text-emerald-400" />;
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const created: MaintenanceTask = {
      id: `task-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      dueDate: newDueDate || 'Due in 7 days',
      priority: newPriority,
      status: 'pending',
      assignedTo: newAssignedTo,
      notes: newNotes,
      iconType:
        newCategory.toLowerCase().includes('ac') || newTitle.toLowerCase().includes('ac')
          ? 'ac'
          : newTitle.toLowerCase().includes('water')
          ? 'water'
          : newTitle.toLowerCase().includes('fire')
          ? 'fire'
          : 'treadmill',
    };

    setTasks([created, ...tasks]);
    setNewTitle('');
    setNewDueDate('');
    setNewNotes('');
    setIsAddDrawerOpen(false);
  };

  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header matching Screen 13 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="h-5 w-5 text-emerald-400" />
            Maintenance Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track scheduled maintenance, technician logs, and facility upkeep.
          </p>
        </div>

        <button
          onClick={() => setIsAddDrawerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} />
          + Add Maintenance Task
        </button>
      </div>

      {/* Tabs with Count Badges (Screen 13) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-slate-700/80 text-cyan-300">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'in_progress'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            In Progress
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-slate-700/80 text-amber-300">
              {inProgressCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono bg-slate-700/80 text-emerald-300">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Filter size={13} />
          <span>Priority:</span>
          {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                priorityFilter === p
                  ? 'bg-slate-800 text-white font-medium border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List (Screen 13) */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300">No {activeTab.replace('_', ' ')} tasks found</p>
            <p className="text-xs text-slate-500 mt-1">
              All items in this state have been cleared or reassigned.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all hover:bg-slate-900/95 cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-3.5">
                {/* Avatar / Icon */}
                <div className="h-11 w-11 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center shrink-0">
                  {getTaskIcon(task.iconType)}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{task.dueDate}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <User size={12} /> {task.assignedTo}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getPriorityBadge(task.priority)}
                <ChevronRight
                  size={16}
                  className="text-slate-600 group-hover:text-slate-300 transition-colors"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail & Status Change Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  {getTaskIcon(selectedTask.iconType)}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedTask.title}</h3>
                  <span className="text-xs text-slate-400">{selectedTask.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Due Schedule:</span>
                <span className="font-mono text-slate-200">{selectedTask.dueDate}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Priority:</span>
                <div>{getPriorityBadge(selectedTask.priority)}</div>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400">Assigned Technician:</span>
                <span className="font-medium text-slate-200">{selectedTask.assignedTo}</span>
              </div>
              {selectedTask.notes && (
                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-300">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Notes:</span>
                  {selectedTask.notes}
                </div>
              )}
            </div>

            {/* Status Switcher Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Update Task Status:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedTask.id, 'pending')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    selectedTask.status === 'pending'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedTask.id, 'in_progress')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    selectedTask.status === 'in_progress'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedTask.id, 'completed')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    selectedTask.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Maintenance Task Drawer / Modal */}
      {isAddDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md h-full bg-[#0F172A] border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">Add Maintenance Task</h3>
                </div>
                <button
                  onClick={() => setIsAddDrawerOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} id="add-task-form" className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Equipment / Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Treadmill T-03, Water Cooler, HVAC 2"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1.5">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Equipment">Equipment</option>
                      <option value="Facility">Facility</option>
                      <option value="Safety">Safety</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1.5">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                      className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Due Schedule / Timing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Service due - 5 days, Tomorrow, Weekly"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Assigned Technician / Staff
                  </label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Ramesh (Tech)">Ramesh (Tech)</option>
                    <option value="Suresh Kumar">Suresh Kumar</option>
                    <option value="Vikram Singh">Vikram Singh</option>
                    <option value="Priya Nair">Priya Nair</option>
                    <option value="External Service Center">External Service Center</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Service Notes & Checklist
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe parts to replace, lubrication, inspection steps..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => setIsAddDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-task-form"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-950"
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

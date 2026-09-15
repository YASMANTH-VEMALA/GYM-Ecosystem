'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Trash2, Dumbbell, Users, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';

interface WorkoutPlanSummary {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  createdAt: string;
  days: {
    id: string;
    dayNumber: number;
    dayName: string | null;
    exercises: {
      id: string;
      sets: number;
      reps: string;
      restSeconds: number;
      notes: string | null;
      exercise: { id: string; name: string; muscleGroup: string };
    }[];
  }[];
  _count: { assignments: number };
}

interface ExerciseOption {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
}

interface DayInput {
  dayNumber: number;
  dayName: string;
  exercises: ExerciseInput[];
}

interface ExerciseInput {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
}

export default function WorkoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlanSummary | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => apiClient.get('/workouts').then((r) => r.data.plans),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
      setDeleteTarget(null);
      toast('success', 'Workout plan deleted');
    },
    onError: () => toast('error', 'Failed to delete plan'),
  });

  const handleSaved = () => {
    setDrawerOpen(false);
    queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
  };

  const openAssign = (planId: string) => {
    setAssignPlanId(planId);
    setAssignDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-page-title text-text-primary">Workouts & Schedule</h1>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 stagger-1">
        <div>
          <h1 className="text-page-title text-text-primary">Workouts & Schedule</h1>
          <p className="text-body text-text-secondary mt-2">Build class structure, assign plans, and open coach recommendations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/workouts/planner" className="btn btn-secondary">
            Coach Planner
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} strokeWidth={1.5} />
            Create Plan
          </button>
        </div>
      </div>

      {!plans?.length ? (
        <div className="card stagger-2">
          <EmptyState
            icon={Dumbbell}
            title="No workout plans"
            description="Create workout plans and assign them to your members."
            action={
              <button
                onClick={() => setDrawerOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={16} strokeWidth={1.5} />
                Create Plan
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4 stagger-2">
          {(plans as WorkoutPlanSummary[]).map((plan) => (
            <div key={plan.id} className="card p-0 overflow-hidden">
              <div
                className="flex items-center justify-between px-card-pad py-4 cursor-pointer hover:bg-page transition-colors duration-normal"
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Dumbbell size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-body font-medium text-text-primary">{plan.name}</h3>
                    <p className="text-caption text-text-secondary">
                      {plan.days.length} days &middot; {plan._count.assignments} members assigned
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {plan.isTemplate && <Badge variant="info">Template</Badge>}
                  <button
                    onClick={(e) => { e.stopPropagation(); openAssign(plan.id); }}
                    className="btn btn-secondary h-8 px-3 text-badge"
                  >
                    <Users size={14} strokeWidth={1.5} />
                    Assign
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(plan); }}
                    className="btn btn-ghost h-8 w-8 p-0 hover:!text-danger hover:!bg-danger-bg"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                  {expandedPlan === plan.id ? <ChevronUp size={16} strokeWidth={1.5} className="text-text-muted" /> : <ChevronDown size={16} strokeWidth={1.5} className="text-text-muted" />}
                </div>
              </div>

              {expandedPlan === plan.id && (
                <div className="border-t border-divider px-card-pad py-4">
                  {plan.description && (
                    <p className="text-body text-text-secondary mb-4">{plan.description}</p>
                  )}
                  <div className="space-y-4">
                    {plan.days.sort((a, b) => a.dayNumber - b.dayNumber).map((day) => (
                      <div key={day.id}>
                        <h4 className="text-label font-medium text-text-secondary uppercase mb-2">
                          Day {day.dayNumber}{day.dayName ? ` — ${day.dayName}` : ''}
                        </h4>
                        <div className="stat-card rounded-btn overflow-hidden p-0">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left">
                                <th className="table-header">Exercise</th>
                                <th className="table-header">Sets</th>
                                <th className="table-header">Reps</th>
                                <th className="table-header">Rest</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-divider">
                              {day.exercises.map((ex) => (
                                <tr key={ex.id}>
                                  <td className="px-4 py-2 text-body text-text-primary">{ex.exercise.name}</td>
                                  <td className="px-4 py-2 text-body font-mono text-text-secondary">{ex.sets}</td>
                                  <td className="px-4 py-2 text-body font-mono text-text-secondary">{ex.reps}</td>
                                  <td className="px-4 py-2 text-body font-mono text-text-secondary">{ex.restSeconds}s</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Create Workout Plan" width="max-w-2xl">
        <WorkoutPlanForm onSaved={handleSaved} onCancel={() => setDrawerOpen(false)} />
      </Drawer>

      {/* Assign Plan Drawer */}
      <Drawer open={assignDrawerOpen} onClose={() => { setAssignDrawerOpen(false); setAssignPlanId(null); }} title="Assign to Members">
        {assignPlanId && (
          <AssignForm
            planId={assignPlanId}
            onDone={() => {
              setAssignDrawerOpen(false);
              setAssignPlanId(null);
              queryClient.invalidateQueries({ queryKey: ['workout-plans'] });
            }}
          />
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workout Plan"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function WorkoutPlanForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DayInput[]>([
    { dayNumber: 1, dayName: 'Chest', exercises: [] },
  ]);
  const [saving, setSaving] = useState(false);

  // Exercise search
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const { data: exercises } = useQuery({
    queryKey: ['exercises', exerciseSearch],
    queryFn: () => apiClient.get('/workouts/exercises', { params: { search: exerciseSearch || undefined } }).then((r) => r.data.exercises),
    enabled: exerciseSearch.length > 1,
  });

  const addDay = () => {
    setDays([...days, { dayNumber: days.length + 1, dayName: '', exercises: [] }]);
  };

  const removeDay = (idx: number) => {
    const updated = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setDays(updated);
  };

  const addExercise = (dayIdx: number, ex: ExerciseOption) => {
    const updated = [...days];
    updated[dayIdx].exercises.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: 3,
      reps: '12',
      restSeconds: 60,
      notes: '',
    });
    setDays(updated);
    setExerciseSearch('');
    setActiveDay(null);
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days];
    updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, i) => i !== exIdx);
    setDays(updated);
  };

  const updateExercise = (dayIdx: number, exIdx: number, field: keyof ExerciseInput, value: string | number) => {
    const updated = [...days];
    const exercise = updated[dayIdx].exercises[exIdx];
    if (field === 'exerciseId' || field === 'exerciseName' || field === 'reps' || field === 'notes') {
      exercise[field] = String(value) as never;
    } else {
      exercise[field] = Number(value) as never;
    }
    setDays(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('error', 'Plan name is required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/workouts', {
        name: name.trim(),
        description: description.trim() || undefined,
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          dayName: d.dayName || undefined,
          exercises: d.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            notes: ex.notes || undefined,
          })),
        })),
      });
      toast('success', 'Workout plan created');
      onSaved();
    } catch {
      toast('error', 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="workout-name" className="input-label">Plan Name <span className="text-danger">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Beginner Push Pull Legs"
            className="input"
            id="workout-name"
          />
        </div>
        <div>
          <label htmlFor="workout-desc" className="input-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={2}
            id="workout-desc"
            className="input h-auto py-3 resize-none"
          />
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-medium text-text-primary">Days</h3>
          <button
            type="button"
            onClick={addDay}
            className="text-xs text-primary hover:underline font-medium"
          >
            + Add Day
          </button>
        </div>

        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="border border-border rounded-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-label font-medium text-text-secondary uppercase shrink-0">Day {day.dayNumber}</span>
              <input
                type="text"
                value={day.dayName}
                onChange={(e) => {
                  const updated = [...days];
                  updated[dayIdx].dayName = e.target.value;
                  setDays(updated);
                }}
                placeholder="e.g. Chest & Triceps"
                className="flex-1 h-8 px-2 border border-divider rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow duration-normal"
              />
              {days.length > 1 && (
                <button type="button" onClick={() => removeDay(dayIdx)} className="text-text-muted hover:text-danger transition-colors duration-normal">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Exercises list */}
            {day.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="flex items-center gap-2 stat-card rounded-btn px-3 py-2">
                <span className="text-body text-text-primary flex-1 truncate">{ex.exerciseName}</span>
                <input
                  type="number"
                  value={ex.sets}
                  onChange={(e) => updateExercise(dayIdx, exIdx, 'sets', Number(e.target.value))}
                  className="w-14 h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                  title="Sets"
                  min={1}
                />
                <span className="text-xs text-gray-400">x</span>
                <input
                  type="text"
                  value={ex.reps}
                  onChange={(e) => updateExercise(dayIdx, exIdx, 'reps', e.target.value)}
                  className="w-14 h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                  title="Reps"
                />
                <input
                  type="number"
                  value={ex.restSeconds}
                  onChange={(e) => updateExercise(dayIdx, exIdx, 'restSeconds', Number(e.target.value))}
                  className="w-16 h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                  title="Rest (sec)"
                  min={0}
                />
                <button type="button" onClick={() => removeExercise(dayIdx, exIdx)} className="text-text-muted hover:text-danger transition-colors duration-normal">
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* Add exercise search */}
            <div className="relative">
              <input
                type="text"
                value={activeDay === dayIdx ? exerciseSearch : ''}
                onFocus={() => setActiveDay(dayIdx)}
                onChange={(e) => { setActiveDay(dayIdx); setExerciseSearch(e.target.value); }}
                placeholder="Search exercises to add..."
                className="w-full h-8 px-3 border border-dashed border-divider rounded-btn text-body text-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow duration-normal"
              />
              {activeDay === dayIdx && exercises?.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-btn shadow-lg max-h-48 overflow-y-auto">
                  {(exercises as ExerciseOption[]).map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => addExercise(dayIdx, ex)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors duration-150 flex items-center justify-between"
                    >
                      <span>{ex.name}</span>
                      <span className="text-xs text-gray-400">{ex.muscleGroup}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-divider">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Creating...</> : 'Create Plan'}
        </button>
      </div>
    </form>
  );
}

function AssignForm({ planId, onDone }: { planId: string; onDone: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ['members', search],
    queryFn: () => apiClient.get('/members', { params: { search: search || undefined, limit: 50 } }).then((r) => r.data),
  });

  const members = data?.members || [];

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (!selectedIds.length) {
      toast('error', 'Select at least one member');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/workouts/${planId}/assign`, { memberIds: selectedIds });
      toast('success', `Plan assigned to ${selectedIds.length} member(s)`);
      if (selectedIds.length === 1) {
        router.push(`/members/${selectedIds[0]}`);
        return;
      }
      onDone();
    } catch {
      toast('error', 'Failed to assign plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search members..."
        className="input"
      />

      <div className="border border-border rounded-btn overflow-hidden max-h-80 overflow-y-auto">
        {members.map((m: Record<string, unknown>) => {
          const user = m.user as Record<string, string>;
          const memberId = m.id as string;
          return (
            <label
              key={memberId}
              className="flex items-center gap-3 px-4 py-3 hover:bg-page transition-colors duration-normal cursor-pointer border-b border-divider last:border-b-0"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(memberId)}
                onChange={() => toggleMember(memberId)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-body font-medium text-text-primary">{user?.name}</p>
                <p className="text-caption text-text-secondary">{user?.phone}</p>
              </div>
            </label>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <p className="text-caption text-text-secondary">{selectedIds.length} member(s) selected</p>
      )}

      <button
        onClick={handleAssign}
        disabled={saving || !selectedIds.length}
        className="btn btn-primary w-full"
      >
        {saving ? 'Assigning...' : `Assign to ${selectedIds.length} Member(s)`}
      </button>
    </div>
  );
}

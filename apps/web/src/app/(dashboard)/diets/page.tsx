'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Trash2, UtensilsCrossed, Copy, Users, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'pre-workout', 'lunch', 'post-workout', 'dinner', 'bed-time'] as const;

const MEAL_TYPE_LABELS: Record<string, string> = {
  'breakfast': 'Breakfast',
  'pre-workout': 'Pre-Workout',
  'lunch': 'Lunch',
  'post-workout': 'Post-Workout',
  'dinner': 'Dinner',
  'bed-time': 'Bed Time',
};

interface DietChartSummary {
  id: string;
  name: string;
  description: string | null;
  totalCalories: number | null;
  isTemplate: boolean;
  createdAt: string;
  meals: MealRow[];
  _count: { assignments: number };
}

interface MealRow {
  id: string;
  mealType: string;
  mealName: string;
  description: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  timeSuggestion: string | null;
  sortOrder: number;
}

interface MealInput {
  mealType: string;
  mealName: string;
  description: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  timeSuggestion: string;
}

export default function DietsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [assignChartId, setAssignChartId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DietChartSummary | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<DietChartSummary | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const { data: charts, isLoading } = useQuery({
    queryKey: ['diet-charts'],
    queryFn: () => apiClient.get('/diets').then((r) => r.data.charts),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/diets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-charts'] });
      setDeleteTarget(null);
      toast('success', 'Diet chart deleted');
    },
    onError: () => toast('error', 'Failed to delete chart'),
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.post(`/diets/${id}/duplicate`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diet-charts'] });
      setDuplicateTarget(null);
      setDuplicateName('');
      toast('success', 'Diet chart duplicated');
    },
    onError: () => toast('error', 'Failed to duplicate chart'),
  });

  const handleSaved = () => {
    setDrawerOpen(false);
    queryClient.invalidateQueries({ queryKey: ['diet-charts'] });
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-page-title text-text-primary">Diet Charts</h1>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 stagger-1">
        <h1 className="text-page-title text-text-primary">Diet Charts</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} strokeWidth={1.5} />
          Create Chart
        </button>
      </div>

      {!charts?.length ? (
        <div className="card stagger-2">
          <EmptyState
            icon={UtensilsCrossed}
            title="No diet charts"
            description="Create diet plans with meal slots and assign them to your members."
            action={
              <button
                onClick={() => setDrawerOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={16} strokeWidth={1.5} />
                Create Chart
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4 stagger-2">
          {(charts as DietChartSummary[]).map((chart) => (
            <div key={chart.id} className="card p-0 overflow-hidden">
              <div
                className="flex items-center justify-between px-card-pad py-4 cursor-pointer hover:bg-page transition-colors duration-normal"
                onClick={() => setExpandedChart(expandedChart === chart.id ? null : chart.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                    <UtensilsCrossed size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-body font-medium text-text-primary">{chart.name}</h3>
                    <p className="text-caption text-text-secondary">
                      {chart.meals.length} meals
                      {chart.totalCalories && <> &middot; <span className="font-mono">{chart.totalCalories}</span> cal</>}
                      {' '}&middot; {chart._count.assignments} members
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chart.isTemplate && <Badge variant="info">Template</Badge>}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDuplicateTarget(chart); setDuplicateName(`${chart.name} (Copy)`); }}
                    className="btn btn-ghost h-8 w-8 p-0 hover:!text-info hover:!bg-info-bg"
                    title="Duplicate"
                  >
                    <Copy size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAssignChartId(chart.id); setAssignDrawerOpen(true); }}
                    className="btn btn-secondary h-8 px-3 text-badge"
                  >
                    <Users size={14} strokeWidth={1.5} />
                    Assign
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(chart); }}
                    className="btn btn-ghost h-8 w-8 p-0 hover:!text-danger hover:!bg-danger-bg"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                  {expandedChart === chart.id ? <ChevronUp size={16} strokeWidth={1.5} className="text-text-muted" /> : <ChevronDown size={16} strokeWidth={1.5} className="text-text-muted" />}
                </div>
              </div>

              {expandedChart === chart.id && (
                <div className="border-t border-divider px-card-pad py-4">
                  {chart.description && (
                    <p className="text-body text-text-secondary mb-4">{chart.description}</p>
                  )}
                  <div className="grid gap-3">
                    {MEAL_TYPES.map((type) => {
                      const meals = chart.meals.filter((m) => m.mealType === type).sort((a, b) => a.sortOrder - b.sortOrder);
                      if (!meals.length) return null;
                      return (
                        <div key={type} className="stat-card p-4">
                          <h4 className="text-label font-medium text-text-secondary uppercase mb-2">
                            {MEAL_TYPE_LABELS[type] || type}
                            {meals[0].timeSuggestion && <span className="font-mono ml-2 text-text-muted">{meals[0].timeSuggestion}</span>}
                          </h4>
                          {meals.map((meal) => (
                            <div key={meal.id} className="flex items-center justify-between py-1">
                              <div>
                                <span className="text-body text-text-primary">{meal.mealName}</span>
                                {meal.description && <span className="text-caption text-text-secondary ml-2">— {meal.description}</span>}
                              </div>
                              <div className="flex items-center gap-3 text-caption font-mono text-text-muted">
                                {meal.calories && <span>{meal.calories} cal</span>}
                                {meal.proteinG && <span>P:{Number(meal.proteinG)}g</span>}
                                {meal.carbsG && <span>C:{Number(meal.carbsG)}g</span>}
                                {meal.fatG && <span>F:{Number(meal.fatG)}g</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Chart Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Create Diet Chart" width="max-w-2xl">
        <DietChartForm onSaved={handleSaved} onCancel={() => setDrawerOpen(false)} />
      </Drawer>

      {/* Assign Drawer */}
      <Drawer open={assignDrawerOpen} onClose={() => { setAssignDrawerOpen(false); setAssignChartId(null); }} title="Assign to Members">
        {assignChartId && (
          <AssignDietForm
            chartId={assignChartId}
            onDone={() => {
              setAssignDrawerOpen(false);
              setAssignChartId(null);
              queryClient.invalidateQueries({ queryKey: ['diet-charts'] });
            }}
          />
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Diet Chart"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      {/* Duplicate Dialog */}
      <ConfirmDialog
        open={!!duplicateTarget}
        title="Duplicate Diet Chart"
        description="Enter a name for the duplicated chart."
        confirmLabel={duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
        onConfirm={() => duplicateName.trim() && duplicateTarget && duplicateMutation.mutate({ id: duplicateTarget.id, name: duplicateName.trim() })}
        onCancel={() => { setDuplicateTarget(null); setDuplicateName(''); }}
        loading={duplicateMutation.isPending}
      >
        <div className="mb-4">
          <label htmlFor="dup-chart-name" className="input-label">New Chart Name</label>
          <input id="dup-chart-name" type="text" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} placeholder="New chart name" className="input" />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function DietChartForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [meals, setMeals] = useState<MealInput[]>([
    { mealType: 'breakfast', mealName: '', description: '', calories: '', proteinG: '', carbsG: '', fatG: '', timeSuggestion: '8:00 AM' },
  ]);
  const [saving, setSaving] = useState(false);

  const addMeal = (type: string) => {
    setMeals([...meals, {
      mealType: type,
      mealName: '',
      description: '',
      calories: '',
      proteinG: '',
      carbsG: '',
      fatG: '',
      timeSuggestion: '',
    }]);
  };

  const removeMeal = (idx: number) => {
    setMeals(meals.filter((_, i) => i !== idx));
  };

  const updateMeal = (idx: number, field: keyof MealInput, value: string) => {
    const updated = [...meals];
    updated[idx] = { ...updated[idx], [field]: value };
    setMeals(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('error', 'Chart name is required');
      return;
    }
    if (!meals.some((m) => m.mealName.trim())) {
      toast('error', 'Add at least one meal');
      return;
    }

    setSaving(true);
    try {
      const totalCal = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
      await apiClient.post('/diets', {
        name: name.trim(),
        description: description.trim() || undefined,
        totalCalories: totalCal || undefined,
        meals: meals
          .filter((m) => m.mealName.trim())
          .map((m, i) => ({
            mealType: m.mealType,
            mealName: m.mealName.trim(),
            description: m.description.trim() || undefined,
            calories: Number(m.calories) || undefined,
            proteinG: Number(m.proteinG) || undefined,
            carbsG: Number(m.carbsG) || undefined,
            fatG: Number(m.fatG) || undefined,
            timeSuggestion: m.timeSuggestion.trim() || undefined,
            sortOrder: i,
          })),
      });
      toast('success', 'Diet chart created');
      onSaved();
    } catch {
      toast('error', 'Failed to create diet chart');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="diet-chart-name" className="input-label">Chart Name <span className="text-danger">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bulking Diet — 3000 cal"
            id="diet-chart-name"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="diet-chart-desc" className="input-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            rows={2}
            id="diet-chart-desc"
            className="input h-auto py-3 resize-none"
          />
        </div>
      </div>

      {/* Meal slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-medium text-text-primary">Meals</h3>
        </div>

        {/* Meal type quick-add buttons */}
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addMeal(type)}
              className="text-caption px-3 py-1.5 rounded-full border border-dashed border-border-default text-text-secondary hover:border-primary hover:text-primary transition-colors duration-normal"
            >
              + {MEAL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {meals.map((meal, idx) => (
          <div key={idx} className="border border-divider rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="default">{MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}</Badge>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={meal.timeSuggestion}
                  onChange={(e) => updateMeal(idx, 'timeSuggestion', e.target.value)}
                  placeholder="Time"
                  className="w-24 h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                />
                {meals.length > 1 && (
                  <button type="button" onClick={() => removeMeal(idx)} className="text-text-muted hover:text-danger transition-colors duration-normal">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <input
              type="text"
              value={meal.mealName}
              onChange={(e) => updateMeal(idx, 'mealName', e.target.value)}
              placeholder="Food items (e.g. 4 Eggs + 2 Toast + Banana)"
              id={`meal-name-${idx}`}
              className="input"
            />

            <input
              type="text"
              value={meal.description}
              onChange={(e) => updateMeal(idx, 'description', e.target.value)}
              placeholder="Quantity & notes (optional)"
              className="w-full h-8 px-3 border border-border rounded-btn text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow duration-150"
            />

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-label text-text-muted mb-1">Calories</label>
                <input
                  type="number"
                  value={meal.calories}
                  onChange={(e) => updateMeal(idx, 'calories', e.target.value)}
                  placeholder="0"
                  className="w-full h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-label text-text-muted mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={meal.proteinG}
                  onChange={(e) => updateMeal(idx, 'proteinG', e.target.value)}
                  placeholder="0"
                  step="0.1"
                  className="w-full h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-label text-text-muted mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={meal.carbsG}
                  onChange={(e) => updateMeal(idx, 'carbsG', e.target.value)}
                  placeholder="0"
                  step="0.1"
                  className="w-full h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-label text-text-muted mb-1">Fat (g)</label>
                <input
                  type="number"
                  value={meal.fatG}
                  onChange={(e) => updateMeal(idx, 'fatG', e.target.value)}
                  placeholder="0"
                  step="0.1"
                  className="w-full h-7 px-2 border border-border rounded text-xs font-mono text-center focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-divider">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Creating...</> : 'Create Chart'}
        </button>
      </div>
    </form>
  );
}

function AssignDietForm({ chartId, onDone }: { chartId: string; onDone: () => void }) {
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
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await apiClient.post(`/diets/${chartId}/assign`, { memberIds: selectedIds });
      toast('success', `Diet assigned to ${selectedIds.length} member(s)`);
      // If only one member selected, redirect to that member's detail page
      if (selectedIds.length === 1) {
        router.push(`/members/${selectedIds[0]}`);
        return;
      }
      onDone();
    } catch {
      toast('error', 'Failed to assign diet');
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

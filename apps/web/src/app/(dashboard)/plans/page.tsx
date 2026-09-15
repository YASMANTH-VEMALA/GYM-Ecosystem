'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2, Receipt, Loader2 } from 'lucide-react';
import type { MembershipPlan } from '@gymstack/shared';

export default function PlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MembershipPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get('/plans').then((r) => r.data.plans),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/plans/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast('success', 'Plan status updated');
    },
    onError: () => toast('error', 'Failed to update plan status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDeleteTarget(null);
      toast('success', 'Plan deleted');
    },
    onError: () => toast('error', 'Cannot delete plan with active subscriptions'),
  });

  const openCreate = () => {
    setEditingPlan(null);
    setDrawerOpen(true);
  };

  const openEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setDrawerOpen(true);
  };

  const handleSaved = () => {
    setDrawerOpen(false);
    setEditingPlan(null);
    queryClient.invalidateQueries({ queryKey: ['plans'] });
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-page-title text-text-primary">Membership Plans</h1>
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 stagger-1">
        <h1 className="text-page-title text-text-primary">Membership Plans</h1>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={16} strokeWidth={1.5} />
          Add Plan
        </button>
      </div>

      <div className="stagger-2">
        {!plans?.length ? (
          <div className="card">
            <EmptyState
              icon={Receipt}
              title="No plans yet"
              description="Create your first membership plan to start enrolling members."
              action={
                <button onClick={openCreate} className="btn btn-primary">
                  <Plus size={16} strokeWidth={1.5} /> Create Plan
                </button>
              }
            />
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr>
                    <th className="table-header text-left">Plan Name</th>
                    <th className="table-header text-left">Duration</th>
                    <th className="table-header text-left">Price</th>
                    <th className="table-header text-left">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan: MembershipPlan) => (
                    <tr key={plan.id} className="table-row group">
                      <td className="px-4">
                        <div>
                          <p className="text-table-row font-medium text-text-primary">{plan.name}</p>
                          {plan.description && (
                            <p className="text-caption text-text-secondary mt-0.5 truncate max-w-xs">{plan.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 text-table-row font-mono text-text-secondary">{plan.durationDays} days</td>
                      <td className="px-4 text-table-row font-mono font-medium text-text-primary">
                        ₹{Number(plan.price).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4">
                        <button
                          onClick={() => toggleMutation.mutate(plan.id)}
                          className="transition-all duration-fast"
                          disabled={toggleMutation.isPending}
                        >
                          <Badge variant={plan.isActive ? 'active' : 'expired'}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 text-right">
                        <div className="flex items-center justify-end gap-1 row-actions">
                          <button
                            onClick={() => openEdit(plan)}
                            className="btn btn-ghost h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Pencil size={16} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(plan)}
                            className="btn btn-ghost h-8 w-8 p-0 hover:!text-danger hover:!bg-danger-bg"
                            title="Delete"
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingPlan(null); }}
        title={editingPlan ? 'Edit Plan' : 'Create Plan'}
      >
        <PlanForm
          plan={editingPlan}
          onSaved={handleSaved}
          onCancel={() => { setDrawerOpen(false); setEditingPlan(null); }}
        />
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Plan"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function PlanForm({
  plan,
  onSaved,
  onCancel,
}: {
  plan: MembershipPlan | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(plan?.name || '');
  const [durationDays, setDurationDays] = useState(plan?.durationDays?.toString() || '');
  const [price, setPrice] = useState(plan?.price?.toString() || '');
  const [gstPercent, setGstPercent] = useState(plan?.gstPercent?.toString() || '18');
  const [description, setDescription] = useState(plan?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !durationDays || !price) {
      toast('error', 'Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        durationDays: Number(durationDays),
        price: Number(price),
        gstPercent: Number(gstPercent),
        description: description.trim() || null,
      };

      if (plan) {
        await apiClient.put(`/plans/${plan.id}`, payload);
        toast('success', 'Plan updated');
      } else {
        await apiClient.post('/plans', payload);
        toast('success', 'Plan created');
      }
      onSaved();
    } catch {
      toast('error', plan ? 'Failed to update plan' : 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="plan-name" className="input-label">Plan Name <span className="text-danger">*</span></label>
        <input id="plan-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Premium" className="input" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="plan-duration" className="input-label">Duration (days) <span className="text-danger">*</span></label>
          <input id="plan-duration" type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="30" min="1" className="input font-mono" />
        </div>
        <div>
          <label htmlFor="plan-price" className="input-label">Price (₹) <span className="text-danger">*</span></label>
          <input id="plan-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1999" min="0" step="0.01" className="input font-mono" />
        </div>
      </div>

      <div>
        <label htmlFor="plan-gst" className="input-label">GST %</label>
        <input id="plan-gst" type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} placeholder="18" min="0" max="100" step="0.01" className="input font-mono" />
      </div>

      <div>
        <label htmlFor="plan-desc" className="input-label">Description</label>
        <textarea id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={3} className="input h-auto py-3 resize-none" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-divider">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Saving...</> : plan ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  );
}

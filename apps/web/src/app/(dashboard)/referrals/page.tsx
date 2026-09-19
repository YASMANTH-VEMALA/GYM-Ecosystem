'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  Plus, Gift, Loader2, Users, CheckCircle2, Clock, Trophy,
  ChevronLeft, CheckCheck, Pencil, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  rewardDescription?: string | null;
  refereeRewardDescription?: string | null;
  maxReferralsPerMember?: number | null;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
  stats: { total: number; pending: number; converted: number; rewarded: number; expired: number };
}

interface Referral {
  id: string;
  status: string;
  referralCode: string;
  createdAt: string;
  convertedAt?: string | null;
  rewardAppliedAt?: string | null;
  rewardNotes?: string | null;
  referrer: { user: { name: string; phone: string } };
  referredMember?: { user: { name: string; phone: string } } | null;
  campaign: { name: string };
}

// ─── Status badge helper ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'active' | 'expired' | 'info' | 'expiring'> = {
    pending: 'info',
    converted: 'expiring',
    rewarded: 'active',
    expired: 'expired',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    converted: 'Converted',
    rewarded: 'Rewarded',
    expired: 'Expired',
  };
  return <Badge variant={map[status] ?? 'info'}>{labels[status] ?? status}</Badge>;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [rewardDrawerReferral, setRewardDrawerReferral] = useState<Referral | null>(null);

  // Campaigns list
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['referral-campaigns'],
    queryFn: () => apiClient.get('/referrals/campaigns').then((r) => r.data),
  });

  // Referrals for selected campaign
  const { data: campaignReferrals, isLoading: referralsLoading } = useQuery<{ referrals: Referral[]; total: number }>({
    queryKey: ['campaign-referrals', selectedCampaign?.id],
    queryFn: () => apiClient.get(`/referrals/campaigns/${selectedCampaign!.id}/referrals`).then((r) => r.data),
    enabled: !!selectedCampaign,
  });

  const toggleMutation = useMutation({
    mutationFn: (c: Campaign) => apiClient.patch(`/referrals/campaigns/${c.id}`, { isActive: !c.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['referral-campaigns'] }); toast('success', 'Campaign updated'); },
    onError: () => toast('error', 'Failed to update campaign'),
  });

  const rewardMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => apiClient.patch(`/referrals/${id}/reward`, { rewardNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-referrals', selectedCampaign?.id] });
      queryClient.invalidateQueries({ queryKey: ['referral-campaigns'] });
      setRewardDrawerReferral(null);
      toast('success', 'Reward marked as applied');
    },
    onError: () => toast('error', 'Failed to apply reward'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/referrals/${id}/convert`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-referrals', selectedCampaign?.id] });
      queryClient.invalidateQueries({ queryKey: ['referral-campaigns'] });
      toast('success', 'Referral marked as converted');
    },
    onError: () => toast('error', 'Failed to convert referral'),
  });

  const handleSaved = () => {
    setDrawerOpen(false);
    setEditingCampaign(null);
    queryClient.invalidateQueries({ queryKey: ['referral-campaigns'] });
  };

  // ── Campaign detail view ──────────────────────────────────────────────────
  if (selectedCampaign) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-8 stagger-1">
          <button onClick={() => setSelectedCampaign(null)} className="btn btn-ghost h-8 w-8 p-0">
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-page-title text-text-primary truncate">{selectedCampaign.name}</h1>
            <p className="text-caption text-text-secondary">Referrals in this campaign</p>
          </div>
        </div>

        <div className="stagger-2">
          {referralsLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : !campaignReferrals?.referrals.length ? (
            <div className="card">
              <EmptyState icon={Users} title="No referrals yet" description="Members haven't used this campaign's referral codes yet." />
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr>
                      <th className="table-header text-left">Referrer</th>
                      <th className="table-header text-left">Referred Member</th>
                      <th className="table-header text-left">Code</th>
                      <th className="table-header text-left">Status</th>
                      <th className="table-header text-left">Date</th>
                      <th className="table-header text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignReferrals.referrals.map((r) => (
                      <tr key={r.id} className="table-row group">
                        <td className="px-4">
                          <p className="text-table-row font-medium text-text-primary">{r.referrer.user.name}</p>
                          <p className="text-caption text-text-secondary">{r.referrer.user.phone}</p>
                        </td>
                        <td className="px-4">
                          {r.referredMember ? (
                            <>
                              <p className="text-table-row text-text-primary">{r.referredMember.user.name}</p>
                              <p className="text-caption text-text-secondary">{r.referredMember.user.phone}</p>
                            </>
                          ) : (
                            <span className="text-caption text-text-muted italic">Not yet joined</span>
                          )}
                        </td>
                        <td className="px-4 font-mono text-table-row text-text-secondary">{r.referralCode}</td>
                        <td className="px-4"><StatusBadge status={r.status} /></td>
                        <td className="px-4 text-caption text-text-secondary">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 text-right">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => convertMutation.mutate(r.id)}
                              disabled={convertMutation.isPending}
                              className="btn btn-secondary h-8 px-3 text-caption inline-flex items-center gap-1.5"
                              title="Mark referral as converted"
                            >
                              <CheckCircle2 size={14} strokeWidth={1.5} />
                              Convert
                            </button>
                          )}
                          {r.status === 'converted' && (
                            <button
                              onClick={() => setRewardDrawerReferral(r)}
                              className="btn btn-ghost h-8 px-3 text-caption text-primary inline-flex items-center gap-1.5 font-medium"
                              title="Mark reward applied"
                            >
                              <CheckCheck size={14} strokeWidth={1.5} />
                              Apply Reward
                            </button>
                          )}
                          {r.status === 'rewarded' && (
                            <span className="text-caption text-emerald-600 inline-flex items-center gap-1 font-medium">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Rewarded
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Reward drawer */}
        <Drawer
          open={!!rewardDrawerReferral}
          onClose={() => setRewardDrawerReferral(null)}
          title="Apply Reward"
        >
          {rewardDrawerReferral && (
            <RewardForm
              referral={rewardDrawerReferral}
              onSave={(notes) => rewardMutation.mutate({ id: rewardDrawerReferral.id, notes })}
              onCancel={() => setRewardDrawerReferral(null)}
              saving={rewardMutation.isPending}
            />
          )}
        </Drawer>
      </div>
    );
  }

  // ── Campaign list view ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-page-title text-text-primary">Referrals</h1>
        </div>
        <TableSkeleton rows={3} cols={4} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 stagger-1">
        <div>
          <h1 className="text-page-title text-text-primary">Referrals</h1>
          <p className="text-body text-text-secondary mt-0.5">Create campaigns and track member referrals</p>
        </div>
        <button onClick={() => { setEditingCampaign(null); setDrawerOpen(true); }} className="btn btn-primary">
          <Plus size={16} strokeWidth={1.5} />
          New Campaign
        </button>
      </div>

      <div className="stagger-2">
        {!campaigns?.length ? (
          <div className="card">
            <EmptyState
              icon={Gift}
              title="No referral campaigns yet"
              description="Create a campaign to give members referral codes and track who they bring in."
              action={
                <button onClick={() => { setEditingCampaign(null); setDrawerOpen(true); }} className="btn btn-primary">
                  <Plus size={16} strokeWidth={1.5} /> New Campaign
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <div key={c.id} className="card flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-section-heading text-text-primary truncate">{c.name}</h2>
                    {c.description && <p className="text-caption text-text-secondary mt-0.5 line-clamp-2">{c.description}</p>}
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate(c)}
                    disabled={toggleMutation.isPending}
                    className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
                    title={c.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {c.isActive ? <ToggleRight size={24} className="text-success" /> : <ToggleLeft size={24} />}
                  </button>
                </div>

                {/* Reward pill */}
                {c.rewardDescription && (
                  <div className="flex items-center gap-2 bg-[var(--color-brand-50,#eff6ff)] rounded-lg px-3 py-2">
                    <Trophy size={14} className="text-[var(--color-brand,#2563eb)] shrink-0" />
                    <span className="text-caption text-text-primary">{c.rewardDescription}</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-surface-alt px-2 py-2">
                    <p className="text-section-heading text-text-primary">{c.stats.total}</p>
                    <p className="text-caption text-text-secondary">Total</p>
                  </div>
                  <div className="rounded-lg bg-surface-alt px-2 py-2">
                    <p className="text-section-heading text-success">{c.stats.converted}</p>
                    <p className="text-caption text-text-secondary">Converted</p>
                  </div>
                  <div className="rounded-lg bg-surface-alt px-2 py-2">
                    <p className="text-section-heading text-text-primary">{c.stats.rewarded}</p>
                    <p className="text-caption text-text-secondary">Rewarded</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-caption text-text-secondary flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(c.startsAt).toLocaleDateString('en-IN')}
                  {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString('en-IN')}` : ' (no end date)'}
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-divider pt-3">
                  <button
                    onClick={() => setSelectedCampaign(c)}
                    className="btn btn-secondary flex-1 text-caption"
                  >
                    <Users size={14} strokeWidth={1.5} />
                    View Referrals
                  </button>
                  <button
                    onClick={() => { setEditingCampaign(c); setDrawerOpen(true); }}
                    className="btn btn-ghost h-8 w-8 p-0"
                    title="Edit campaign"
                  >
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Campaign Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingCampaign(null); }}
        title={editingCampaign ? 'Edit Campaign' : 'New Referral Campaign'}
      >
        <CampaignForm campaign={editingCampaign} onSaved={handleSaved} onCancel={() => { setDrawerOpen(false); setEditingCampaign(null); }} />
      </Drawer>
    </div>
  );
}

// ─── Campaign Form ────────────────────────────────────────────────────────────

function CampaignForm({ campaign, onSaved, onCancel }: { campaign: Campaign | null; onSaved: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(campaign?.name || '');
  const [description, setDescription] = useState(campaign?.description || '');
  const [rewardDescription, setRewardDescription] = useState(campaign?.rewardDescription || '');
  const [refereeRewardDescription, setRefereeRewardDescription] = useState(campaign?.refereeRewardDescription || '');
  const [maxReferrals, setMaxReferrals] = useState(campaign?.maxReferralsPerMember?.toString() || '');
  const [startsAt, setStartsAt] = useState(campaign?.startsAt ? campaign.startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(campaign?.endsAt ? campaign.endsAt.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startsAt) { toast('error', 'Name and start date are required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        rewardDescription: rewardDescription.trim() || null,
        refereeRewardDescription: refereeRewardDescription.trim() || null,
        maxReferralsPerMember: maxReferrals ? Number(maxReferrals) : null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      };
      if (campaign) {
        await apiClient.patch(`/referrals/campaigns/${campaign.id}`, payload);
        toast('success', 'Campaign updated');
      } else {
        await apiClient.post('/referrals/campaigns', payload);
        toast('success', 'Campaign created');
      }
      onSaved();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error;
      toast('error', msg || (campaign ? 'Failed to update campaign' : 'Failed to create campaign'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="camp-name" className="input-label">Campaign Name <span className="text-danger">*</span></label>
        <input id="camp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Referral Drive" className="input" />
      </div>

      <div>
        <label htmlFor="camp-desc" className="input-label">Description</label>
        <textarea id="camp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={2} className="input h-auto py-3 resize-none" />
      </div>

      <div>
        <label htmlFor="camp-reward" className="input-label">Referrer Reward</label>
        <input id="camp-reward" type="text" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} placeholder="e.g. 10% off next renewal" className="input" />
      </div>

      <div>
        <label htmlFor="camp-ref-reward" className="input-label">New Member Reward (optional)</label>
        <input id="camp-ref-reward" type="text" value={refereeRewardDescription} onChange={(e) => setRefereeRewardDescription(e.target.value)} placeholder="e.g. 7 free days on first plan" className="input" />
      </div>

      <div>
        <label htmlFor="camp-max" className="input-label">Max Referrals per Member</label>
        <input id="camp-max" type="number" value={maxReferrals} onChange={(e) => setMaxReferrals(e.target.value)} placeholder="Leave blank for unlimited" min="1" className="input font-mono" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="camp-start" className="input-label">Start Date <span className="text-danger">*</span></label>
          <input id="camp-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input font-mono" />
        </div>
        <div>
          <label htmlFor="camp-end" className="input-label">End Date</label>
          <input id="camp-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input font-mono" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-divider">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Saving...</> : campaign ? 'Update Campaign' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}

// ─── Reward Form ──────────────────────────────────────────────────────────────

function RewardForm({ referral, onSave, onCancel, saving }: { referral: Referral; onSave: (notes: string) => void; onCancel: () => void; saving: boolean }) {
  const [notes, setNotes] = useState(referral.rewardNotes || '');
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface-alt p-4 space-y-1">
        <p className="text-caption text-text-secondary">Referrer</p>
        <p className="text-body font-medium text-text-primary">{referral.referrer.user.name}</p>
        {referral.referredMember && (
          <>
            <p className="text-caption text-text-secondary mt-2">Referred Member</p>
            <p className="text-body font-medium text-text-primary">{referral.referredMember.user.name}</p>
          </>
        )}
      </div>
      <div>
        <label htmlFor="reward-notes" className="input-label">Reward Notes (optional)</label>
        <textarea id="reward-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Applied 10% discount on next renewal invoice" rows={3} className="input h-auto py-3 resize-none" />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-divider">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button onClick={() => onSave(notes)} disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Applying...</> : <><CheckCircle2 size={16} strokeWidth={1.5} /> Mark as Rewarded</>}
        </button>
      </div>
    </div>
  );
}

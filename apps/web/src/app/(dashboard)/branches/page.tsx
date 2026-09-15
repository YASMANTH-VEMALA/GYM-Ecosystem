'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarCheck, ImagePlus, IndianRupee, Loader2, MapPin, Plus, UserCog, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { Drawer } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

type BranchMetrics = {
  members: number;
  activeMembers: number;
  staff: number;
  checkInsToday: number;
  revenueThisMonth: number;
};

type Branch = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isActive: boolean;
  primaryColor: string;
  logoUrl: string | null;
  metrics: BranchMetrics;
};

type Overview = {
  organization: { id: string; name: string; ownerName: string; logoUrl: string | null };
  totals: BranchMetrics & { branches: number };
  branches: Branch[];
};

const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BranchesPage() {
  const { user, switchBranch, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const overview = useQuery<Overview>({
    queryKey: ['branches-overview'],
    queryFn: () => apiClient.get('/branches/overview').then((response) => response.data),
    enabled: user?.role === 'gym_owner',
  });

  if (user?.role !== 'gym_owner') return <div className="card empty-state"><p className="empty-state-title">Owner access required</p></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption uppercase tracking-[0.14em] text-primary">Organization command center</p>
          <div className="mt-2 flex items-center gap-3">{overview.data?.organization.logoUrl && <img src={overview.data.organization.logoUrl} alt="" className="h-10 w-10 rounded-xl border border-border bg-white object-contain p-1" />}<h1 className="text-page-title text-text-primary">{overview.data?.organization.name || 'All Branches'}</h1></div>
          <p className="text-body text-text-secondary mt-2">Combined business performance with one-click branch drill-down.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setDrawerOpen(true)}><Plus size={16} /> Add Branch</button>
      </div>

      {overview.isLoading ? (
        <div className="grid grid-cols-1 gap-between-cards sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)}</div>
      ) : overview.isError || !overview.data ? (
        <div className="card empty-state"><p className="empty-state-title">Could not load your branches</p><button className="btn btn-primary" onClick={() => overview.refetch()}>Retry</button></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-between-cards sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Branches', value: overview.data.totals.branches, caption: 'Business locations', Icon: Building2, color: 'text-primary' },
              { label: 'Active Members', value: overview.data.totals.activeMembers, caption: `${overview.data.totals.members} total members`, Icon: Users, color: 'text-success' },
              { label: 'Revenue (MTD)', value: money(overview.data.totals.revenueThisMonth), caption: 'Across every branch', Icon: IndianRupee, color: 'text-info' },
              { label: 'Check-ins Today', value: overview.data.totals.checkInsToday, caption: `${overview.data.totals.staff} active staff`, Icon: CalendarCheck, color: 'text-warning' },
            ].map(({ label, value, caption, Icon, color }) => (
              <div className="stat-card" key={label}><div className="flex justify-between"><span className="stat-card-label">{label}</span><Icon size={18} className={color} /></div><p className="stat-card-value mt-3 font-mono">{value}</p><p className="text-caption text-text-muted mt-2">{caption}</p></div>
            ))}
          </div>

          <section>
            <div className="mb-4"><h2 className="text-section-heading text-text-primary">Branch performance</h2><p className="text-caption text-text-secondary mt-1">Open a branch to manage its members, staff, payments, and operations.</p></div>
            {overview.data.branches.length === 0 ? (
              <div className="card"><EmptyState icon={Building2} title="No branches yet" description="Create your first business location." action={<button className="btn btn-primary" onClick={() => setDrawerOpen(true)}>Add branch</button>} /></div>
            ) : (
              <div className="grid grid-cols-1 gap-between-cards lg:grid-cols-2 2xl:grid-cols-3">
                {overview.data.branches.map((branch) => (
                  <article key={branch.id} className="card space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3"><div className="h-11 w-11 overflow-hidden rounded-xl flex items-center justify-center text-white font-medium" style={{ backgroundColor: branch.primaryColor }}>{branch.logoUrl || overview.data.organization.logoUrl ? <img src={branch.logoUrl ?? overview.data.organization.logoUrl!} alt="" className="h-full w-full bg-white object-contain p-1" /> : <Building2 size={20} />}</div><div><h3 className="font-medium text-text-primary">{branch.name}</h3><p className="text-caption text-text-muted flex items-center gap-1 mt-1"><MapPin size={12} /> {branch.city || 'Location not set'} · {branch.slug}</p></div></div>
                      <span className={`badge ${branch.isActive ? 'badge-active' : 'badge-expired'}`}>{branch.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="stat-card"><p className="text-caption text-text-muted">Members</p><p className="text-xl font-mono mt-1">{branch.metrics.activeMembers}<span className="text-sm text-text-muted">/{branch.metrics.members}</span></p></div>
                      <div className="stat-card"><p className="text-caption text-text-muted">Revenue MTD</p><p className="text-xl font-mono mt-1">{money(branch.metrics.revenueThisMonth)}</p></div>
                      <div className="stat-card"><p className="text-caption text-text-muted">Today</p><p className="text-xl font-mono mt-1">{branch.metrics.checkInsToday} <span className="text-xs text-text-muted">check-ins</span></p></div>
                      <div className="stat-card"><p className="text-caption text-text-muted">Staff</p><p className="text-xl font-mono mt-1 flex items-center gap-2"><UserCog size={16} /> {branch.metrics.staff}</p></div>
                    </div>
                    <button disabled={!branch.isActive} onClick={() => switchBranch(branch.id)} className="btn btn-primary w-full">Open {branch.name}</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Branch">
        <BranchForm
          onCancel={() => setDrawerOpen(false)}
          onCreated={async () => {
            await Promise.all([queryClient.invalidateQueries({ queryKey: ['branches-overview'] }), refreshProfile()]);
            setDrawerOpen(false);
            toast('success', 'Branch created with starter membership plans');
          }}
        />
      </Drawer>
    </div>
  );
}

function BranchForm({ onCreated, onCancel }: { onCreated: () => Promise<void>; onCancel: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const suggestedSlug = useMemo(() => slugify(name), [name]);
  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : null, [logoFile]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalSlug = slugEdited ? slug : suggestedSlug;
    if (!name.trim() || !finalSlug) { toast('error', 'Branch name and slug are required'); return; }
    setSaving(true);
    try {
      const { data } = await apiClient.post<{ branch: { id: string } }>('/branches', { name: name.trim(), slug: finalSlug, city: city.trim() || undefined, address: address.trim() || undefined, phone: phone.trim() || undefined });
      if (logoFile) {
        const body = new FormData(); body.append('file', logoFile); body.append('scope', 'branch'); body.append('branchId', data.branch.id);
        try { await apiClient.post('/uploads/logo', body, { headers: { 'Content-Type': 'multipart/form-data' } }); }
        catch { toast('warning', 'Branch created, but its logo could not be uploaded. You can retry in Settings.'); }
      }
      await onCreated();
    } catch (error: unknown) {
      toast('error', (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Could not create branch');
    } finally { setSaving(false); }
  };

  return <form className="space-y-4" onSubmit={submit}>
    <div><label className="input-label" htmlFor="branch-name">Branch name *</label><input id="branch-name" className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="K5 Jubilee Hills" /></div>
    <div><label className="input-label" htmlFor="branch-slug">Branch slug *</label><input id="branch-slug" className="input font-mono" value={slugEdited ? slug : suggestedSlug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} placeholder="k5-jubilee-hills" /><p className="text-caption text-text-muted mt-1">Used as the permanent branch identifier.</p></div>
    <div><label className="input-label" htmlFor="branch-city">City</label><input id="branch-city" className="input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Hyderabad" /></div>
    <div><label className="input-label" htmlFor="branch-address">Address</label><textarea id="branch-address" className="input min-h-24" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Full branch address" /></div>
    <div><label className="input-label" htmlFor="branch-phone">Branch phone</label><input id="branch-phone" className="input font-mono" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" /></div>
    <div><label className="input-label" htmlFor="branch-logo">Branch logo</label><label htmlFor="branch-logo" className="flex min-h-24 cursor-pointer items-center gap-4 rounded-card border border-dashed border-border p-4 hover:bg-stat-card">{logoPreview ? <img src={logoPreview} alt="Selected branch logo" className="h-16 w-16 rounded-xl bg-white object-contain" /> : <span className="grid h-16 w-16 place-items-center rounded-xl bg-stat-card text-text-muted"><ImagePlus size={24} /></span>}<span><span className="block text-body font-medium">{logoFile ? logoFile.name : 'Choose logo'}</span><span className="mt-1 block text-caption text-text-muted">PNG, JPG, or WebP · maximum 2 MB</span></span></label><input id="branch-logo" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && file.size > 2 * 1024 * 1024) { toast('error', 'Logo must be 2 MB or smaller'); event.target.value = ''; return; } setLogoFile(file); }} /></div>
    <div className="flex justify-end gap-3 border-t border-divider pt-4"><button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Branch'}</button></div>
  </form>;
}

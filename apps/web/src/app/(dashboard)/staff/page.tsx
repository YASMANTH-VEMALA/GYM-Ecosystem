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
import { Plus, UserCog, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { DefaultManagerPortalSections, PortalSectionValues, type PortalSection } from '@gymstack/shared';

const sectionLabels: Record<PortalSection, string> = {
  dashboard: 'Dashboard',
  members: 'Members',
  fees: 'Fees',
  checkins: 'Check-ins',
  qr_codes: 'QR Codes',
  payments: 'Payments',
  plans: 'Plans',
  workouts: 'Workouts',
  diets: 'Diets',
  analytics: 'Analytics',
  notifications: 'Notifications',
};

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
  portalSections: PortalSection[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [accessTarget, setAccessTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiClient.get('/staff').then((r) => r.data.staff),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/staff/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast('success', 'Staff status updated');
    },
    onError: () => toast('error', 'Failed to update status'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiClient.patch(`/staff/${id}/reset-password`, { password }),
    onSuccess: () => {
      setResetTarget(null);
      setNewPassword('');
      toast('success', 'Password reset successfully');
    },
    onError: () => toast('error', 'Failed to reset password'),
  });

  const handleSaved = () => {
    setDrawerOpen(false);
    queryClient.invalidateQueries({ queryKey: ['staff'] });
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatRelative = (d: string | null) => {
    if (!d) return 'Never';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-page-title text-text-primary">Staff</h1>
        </div>
        <TableSkeleton rows={3} cols={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 stagger-1">
        <h1 className="text-page-title text-text-primary">Staff</h1>
        <button
          onClick={() => setDrawerOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} strokeWidth={1.5} />
          Add Staff
        </button>
      </div>

      {!staff?.length ? (
        <div className="card stagger-2">
          <EmptyState
            icon={UserCog}
            title="No staff yet"
            description="Add a branch manager, receptionist, or coach to the currently selected branch."
            action={
              <button
                onClick={() => setDrawerOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={16} strokeWidth={1.5} />
                Add Staff
              </button>
            }
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden stagger-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <th className="table-header text-left">Name</th>
                  <th className="table-header text-left">Role</th>
                  <th className="table-header text-left">Contact</th>
                  <th className="table-header text-left">Joined</th>
                  <th className="table-header text-left">Last Active</th>
                  <th className="table-header text-left">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: StaffMember) => (
                  <tr key={s.id} className="table-row group">
                    <td className="px-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar text-badge">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-table-row font-medium text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4">
                      <Badge variant={s.role === 'coach' ? 'coach' : s.role === 'receptionist' ? 'receptionist' : 'info'}>
                        {s.role === 'manager' ? 'Branch Manager' : s.role === 'coach' ? 'Coach' : 'Receptionist'}
                      </Badge>
                      {s.role === 'manager' && <p className="mt-1 text-caption text-text-muted">{(s.portalSections ?? []).length} sections enabled</p>}
                    </td>
                    <td className="px-4">
                      <p className="text-table-row text-text-primary">{s.phone}</p>
                      {s.email && <p className="text-caption text-text-secondary">{s.email}</p>}
                    </td>
                    <td className="px-4 text-table-row text-text-secondary">{formatDate(s.createdAt)}</td>
                    <td className="px-4 text-table-row font-mono text-text-secondary">{formatRelative(s.lastLoginAt)}</td>
                    <td className="px-4">
                      <button
                        onClick={() => toggleMutation.mutate(s.id)}
                        disabled={toggleMutation.isPending}
                        className="transition-all duration-fast"
                      >
                        <Badge variant={s.isActive ? 'active' : 'expired'}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 text-right">
                      <div className="row-actions justify-end">
                        {s.role === 'manager' && <button onClick={() => setAccessTarget(s)} className="btn btn-ghost h-8 w-8 p-0" title="Edit portal access"><ShieldCheck size={16} strokeWidth={1.5} /></button>}
                        <button
                          onClick={() => setResetTarget(s)}
                          className="btn btn-ghost h-8 w-8 p-0"
                          title="Reset Password"
                        >
                          <KeyRound size={16} strokeWidth={1.5} />
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

      {/* Add Staff Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Staff">
        <StaffForm onSaved={handleSaved} onCancel={() => setDrawerOpen(false)} />
      </Drawer>

      <Drawer open={!!accessTarget} onClose={() => setAccessTarget(null)} title="Manager Portal Access">
        {accessTarget && <ManagerAccessForm manager={accessTarget} onSaved={() => { setAccessTarget(null); queryClient.invalidateQueries({ queryKey: ['staff'] }); }} onCancel={() => setAccessTarget(null)} />}
      </Drawer>

      {/* Reset Password Modal */}
      {resetTarget && (
        <ConfirmDialog
          open={!!resetTarget}
          title="Reset Password"
          description={`Enter a new temporary password for ${resetTarget.name}.`}
          confirmLabel={resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
          onConfirm={() => {
            if (newPassword.length >= 8) {
              resetPasswordMutation.mutate({ id: resetTarget.id, password: newPassword });
            }
          }}
          onCancel={() => { setResetTarget(null); setNewPassword(''); }}
          loading={resetPasswordMutation.isPending}
          variant="danger"
        >
          <div className="mb-4">
            <label htmlFor="reset-password" className="input-label">New Password</label>
            <input
              id="reset-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="input"
            />
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

function StaffForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'manager' | 'receptionist' | 'coach'>('receptionist');
  const [password, setPassword] = useState('');
  const [portalSections, setPortalSections] = useState<PortalSection[]>([...DefaultManagerPortalSections]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      toast('error', 'Please fill all required fields');
      return;
    }
    if (password.length < 8) {
      toast('error', 'Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/staff', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        password,
        portalSections: role === 'manager' ? portalSections : undefined,
      });
      toast('success', 'Staff member added');
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add staff';
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="add-staff-name" className="input-label">Full Name <span className="text-danger">*</span></label>
        <input id="add-staff-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="input" />
      </div>
      <div>
        <label htmlFor="add-staff-phone" className="input-label">Phone <span className="text-danger">*</span></label>
        <input id="add-staff-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="input font-mono" />
      </div>
      <div>
        <label htmlFor="add-staff-email" className="input-label">Email <span className="text-danger">*</span></label>
        <input id="add-staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="input" />
      </div>
      <div>
        <label htmlFor="add-staff-role" className="input-label">Role <span className="text-danger">*</span></label>
        <select id="add-staff-role" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'receptionist' | 'coach')} className="input">
          <option value="manager">Branch Manager</option>
          <option value="receptionist">Receptionist</option>
          <option value="coach">Coach</option>
        </select>
      </div>
      {role === 'manager' && <PortalAccessChecklist value={portalSections} onChange={setPortalSections} />}
      <div>
        <label htmlFor="add-staff-password" className="input-label">Temporary Password <span className="text-danger">*</span></label>
        <input id="add-staff-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="input" />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-divider">
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Adding...</> : 'Add Staff'}
        </button>
      </div>
    </form>
  );
}

function PortalAccessChecklist({ value, onChange }: { value: PortalSection[]; onChange: (sections: PortalSection[]) => void }) {
  const toggle = (section: PortalSection) => onChange(value.includes(section) ? value.filter((item) => item !== section) : [...value, section]);
  return (
    <fieldset>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><legend className="input-label">Portal sections</legend><p className="text-caption text-text-muted">Only checked sections will appear and work for this manager.</p></div>
        <div className="flex gap-2"><button type="button" className="text-caption font-medium text-primary" onClick={() => onChange([...PortalSectionValues])}>Select all</button><button type="button" className="text-caption font-medium text-text-muted" onClick={() => onChange([])}>Clear</button></div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PortalSectionValues.map((section) => <label key={section} className={`flex cursor-pointer items-center gap-3 rounded-btn border px-3 py-3 text-body transition-colors ${value.includes(section) ? 'border-primary bg-primary/5 text-text-primary' : 'border-border text-text-secondary'}`}><input type="checkbox" checked={value.includes(section)} onChange={() => toggle(section)} className="h-4 w-4 accent-primary" /><span>{sectionLabels[section]}</span></label>)}
      </div>
    </fieldset>
  );
}

function ManagerAccessForm({ manager, onSaved, onCancel }: { manager: StaffMember; onSaved: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [portalSections, setPortalSections] = useState<PortalSection[]>(manager.portalSections ?? []);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/staff/${manager.id}/portal-access`, { portalSections });
      toast('success', `Portal access updated for ${manager.name}`);
      onSaved();
    } catch (err: unknown) {
      toast('error', (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update portal access');
    } finally {
      setSaving(false);
    }
  };
  return <div className="space-y-6"><div className="rounded-card bg-stat-card p-4"><p className="text-body font-medium text-text-primary">{manager.name}</p><p className="text-caption text-text-muted">Server access changes immediately; the manager menu updates after refresh.</p></div><PortalAccessChecklist value={portalSections} onChange={setPortalSections} /><div className="flex justify-end gap-3 border-t border-divider pt-4"><button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button><button type="button" onClick={save} disabled={saving} className="btn btn-primary">{saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save access'}</button></div></div>;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AddMemberPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    emergencyPhone: '',
    bloodGroup: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        email: form.email || undefined,
        password: form.password || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        bloodGroup: form.bloodGroup || undefined,
        notes: form.notes || undefined,
      };
      await apiClient.post('/members', payload);
      router.push('/members');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link
        href="/members"
        className="inline-flex items-center gap-2 text-caption text-text-secondary hover:text-text-primary mb-4 transition-colors duration-normal stagger-1"
      >
        <ArrowLeft size={16} strokeWidth={1.5} /> Back to Members
      </Link>

      <h1 className="text-page-title text-text-primary mb-8 stagger-2">Add Member</h1>

      <form onSubmit={handleSubmit} className="card space-y-6 stagger-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="member-name" className="input-label">Name <span className="text-danger">*</span></label>
            <input id="member-name" name="name" value={form.name} onChange={handleChange} required className="input" />
          </div>
          <div>
            <label htmlFor="member-phone" className="input-label">Phone <span className="text-danger">*</span></label>
            <input id="member-phone" name="phone" value={form.phone} onChange={handleChange} required maxLength={10} placeholder="10-digit number" className="input font-mono" />
          </div>
          <div>
            <label htmlFor="member-email" className="input-label">Email</label>
            <input id="member-email" name="email" type="email" value={form.email} onChange={handleChange} className="input" />
          </div>
          <div>
            <label htmlFor="member-password" className="input-label">Temporary Password</label>
            <input id="member-password" name="password" type="password" minLength={8} value={form.password} onChange={handleChange} className="input" placeholder="Required with email for member app" />
          </div>
          <div>
            <label htmlFor="member-dob" className="input-label">Date of Birth</label>
            <input id="member-dob" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className="input font-mono" />
          </div>
          <div>
            <label htmlFor="member-gender" className="input-label">Gender</label>
            <select id="member-gender" name="gender" value={form.gender} onChange={handleChange} className="input">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="member-blood" className="input-label">Blood Group</label>
            <input id="member-blood" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} maxLength={5} placeholder="e.g. O+" className="input" />
          </div>
          <div>
            <label htmlFor="member-emergency" className="input-label">Emergency Phone</label>
            <input id="member-emergency" name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} className="input font-mono" />
          </div>
        </div>

        <div>
          <label htmlFor="member-notes" className="input-label">Notes</label>
          <textarea id="member-notes" name="notes" value={form.notes} onChange={handleChange} rows={3} className="input h-auto py-3 resize-none" />
        </div>

        {error && (
          <div className="bg-danger-bg text-danger text-body px-4 py-3 rounded-btn border border-danger-border">{error}</div>
        )}

        <div className="flex gap-3 pt-4 border-t border-divider">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? <><Loader2 size={16} className="animate-spin" strokeWidth={1.5} /> Adding...</> : 'Add Member'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

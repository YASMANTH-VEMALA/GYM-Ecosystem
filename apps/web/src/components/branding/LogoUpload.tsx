'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import apiClient from '@/lib/api-client';

type LogoUploadProps = {
  label: string;
  description: string;
  value: string | null;
  scope: 'organization' | 'branch';
  branchId?: string;
  fallbackUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemove: () => Promise<void> | void;
};

const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

export function LogoUpload({ label, description, value, scope, branchId, fallbackUrl, onUploaded, onRemove }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const displayedUrl = value ?? fallbackUrl ?? null;

  const selectFile = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!allowedTypes.includes(file.type)) { setError('Choose a PNG, JPG, or WebP image.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be 2 MB or smaller.'); return; }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('scope', scope);
      if (branchId) body.append('branchId', branchId);
      const { data } = await apiClient.post<{ logoUrl: string }>('/uploads/logo', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(data.logoUrl);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { error?: string } } }).response?.data?.error || 'Could not upload the logo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    setError(''); setRemoving(true);
    try { await onRemove(); }
    catch (requestError) { setError((requestError as { response?: { data?: { error?: string } } }).response?.data?.error || 'Could not remove the logo.'); }
    finally { setRemoving(false); }
  };

  return <section className="rounded-card border border-border p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-divider bg-stat-card">
        {displayedUrl ? <img src={displayedUrl} alt={`${label} preview`} className="h-full w-full object-contain p-2" /> : <ImagePlus size={28} className="text-text-muted" />}
      </div>
      <div className="min-w-0 flex-1"><h3 className="text-body font-medium text-text-primary">{label}</h3><p className="mt-1 text-caption leading-5 text-text-secondary">{description}</p>{!value && fallbackUrl && <p className="mt-1 text-caption text-primary">Currently using the company logo.</p>}<div className="mt-3 flex flex-wrap gap-2"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} /><button type="button" className="btn btn-secondary" disabled={uploading || removing} onClick={() => inputRef.current?.click()}>{uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload logo'}</button>{value && <button type="button" className="btn btn-danger" disabled={uploading || removing} onClick={() => void remove()}>{removing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Remove</button>}</div></div>
    </div>
    {error && <p role="alert" className="input-helper-error mt-3">{error}</p>}
    <p className="mt-3 text-[11px] text-text-muted">PNG, JPG, or WebP · maximum 2 MB · square images work best</p>
  </section>;
}

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import QRCode from 'qrcode';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberCode: string;
}

export function QRModal({ isOpen, onClose, memberCode }: QRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!isOpen || !memberCode) return;
    let active = true;
    QRCode.toDataURL(memberCode, {
      width: 320,
      margin: 2,
      color: { dark: '#0F0F0F', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (active) setQrDataUrl(url);
    }).catch(() => {
      if (active) setQrDataUrl('');
    });
    return () => { active = false; };
  }, [isOpen, memberCode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md" onClick={onClose} role="presentation">
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/[0.1] bg-[#1A1A1A] p-6 animate-scale-in"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-qr-title"
      >
        <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl text-[#888] active:scale-95" aria-label="Close QR code">
          <X size={20} />
        </button>
        <div className="mb-4 text-center">
          <h2 id="member-qr-title" className="text-lg font-semibold text-[#F5F5F0]">Membership QR</h2>
          <p className="mt-1 text-xs text-[#888]">Show this code at reception</p>
        </div>
        <div className="mx-auto mb-4 grid h-52 w-52 place-items-center rounded-2xl bg-white p-3">
          {qrDataUrl ? (
            // The QR is generated locally from the member code and is intentionally a data URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`QR code for member ${memberCode}`} className="h-full w-full" />
          ) : (
            <div className="h-full w-full rounded-xl bg-black/5 animate-pulse" />
          )}
        </div>
        <p className="text-center font-mono text-sm tracking-wider text-[#888]">{memberCode}</p>
        <button onClick={onClose} className="mt-4 h-12 w-full rounded-xl border border-white/[0.1] bg-white/[0.06] text-sm font-medium text-[#F5F5F0] active:scale-[0.98]">
          Close
        </button>
      </div>
    </div>
  );
}

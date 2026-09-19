'use client';

import { useEffect, useState } from 'react';
import { X, QrCode as QrIcon } from 'lucide-react';
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
      margin: 1,
      color: { dark: '#060517', light: '#FFFFFF' },
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl border border-[#e6e6e7] text-[#060517]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-qr-title"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-[#f5f5f7] text-[#9c9ca3] hover:text-[#060517] btn-tap"
          aria-label="Close QR code"
        >
          <X size={18} />
        </button>

        <div className="text-center pt-1 mb-4">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#ffcb1c]/20 text-[#060517]">
            <QrIcon size={20} />
          </div>
          <h2 id="member-qr-title" className="text-base font-bold text-[#060517]">
            Membership QR
          </h2>
          <p className="mt-0.5 text-xs text-[#9c9ca3]">
            Show this code at reception
          </p>
        </div>

        <div className="mx-auto mb-4 grid h-48 w-48 place-items-center rounded-2xl bg-[#f9f9fc] border border-[#e6e6e7] p-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for member ${memberCode}`}
              className="h-full w-full object-contain rounded-lg"
            />
          ) : (
            <div className="h-full w-full rounded-xl bg-gray-200 animate-pulse" />
          )}
        </div>

        <div className="rounded-xl bg-[#f5f5f7] py-2 px-3 text-center mb-4">
          <p className="text-[10px] text-[#9c9ca3] uppercase tracking-wider font-medium">Member Code</p>
          <p className="font-mono text-sm font-semibold tracking-widest text-[#060517]">{memberCode}</p>
        </div>

        <button
          onClick={onClose}
          className="h-11 w-full rounded-xl bg-[#060517] text-sm font-medium text-white shadow-sm btn-tap"
        >
          Close
        </button>
      </div>
    </div>
  );
}

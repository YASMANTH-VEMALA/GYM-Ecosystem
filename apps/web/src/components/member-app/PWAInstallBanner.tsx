'use client';

import { Smartphone, Share, Plus } from 'lucide-react';

interface PWAInstallBannerProps {
  isInstallable: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  showBanner: boolean;
  showIOSTutorial: boolean;
  brandColor: string;
  onInstallClick: () => void;
  onDismiss: () => void;
  onCloseTutorial: () => void;
}

export function PWAInstallBanner({
  isInstallable, isStandalone, isIOS, showBanner, showIOSTutorial,
  brandColor, onInstallClick, onDismiss, onCloseTutorial,
}: PWAInstallBannerProps) {
  return (
    <>
      {/* Install Banner */}
      {showBanner && !isStandalone && (isInstallable || isIOS) && (
        <div className="mb-6 mt-4 px-5 animate-fade-in">
          <div className="relative overflow-hidden bg-gradient-to-r from-violet-600/10 to-cyan-600/10 border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 blur-xl rounded-full pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0 text-violet-400">
              <Smartphone size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Install GymOS App</h3>
              <p className="text-[11px] text-[#888] mt-0.5">Create a home-screen shortcut for quick access.</p>
            </div>
            <div className="flex flex-col gap-2 items-end z-10">
              <button
                onClick={onInstallClick}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white active:scale-[0.95] transition-transform shadow-md"
                style={{ background: brandColor }}
              >
                Install
              </button>
              <button
                onClick={onDismiss}
                className="text-[10px] text-[#555] hover:text-[#888] font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Tutorial Modal */}
      {showIOSTutorial && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onCloseTutorial}
        >
          <div
            className="bg-[#1A1A1A] w-full max-w-sm rounded-3xl border border-white/[0.1] p-6 pb-8 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-white">Install GymOS on iOS</h2>
              <p className="text-xs text-[#888] mt-1">Add this app to your home screen for the full app experience</p>
            </div>

            <div className="space-y-4 text-xs mb-6">
              <div className="flex items-start gap-3 bg-[#111] p-3.5 rounded-xl border border-white/[0.04]">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-violet-400">1</span>
                <p className="text-gray-300 leading-relaxed">
                  Tap the <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-2 py-0.5 rounded"><Share size={12} className="text-cyan-400" /> Share</span> button in Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-[#111] p-3.5 rounded-xl border border-white/[0.04]">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-violet-400">2</span>
                <p className="text-gray-300 leading-relaxed">
                  Scroll down the share menu and select <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-2 py-0.5 rounded"><Plus size={12} className="text-emerald-400" /> Add to Home Screen</span>.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-[#111] p-3.5 rounded-xl border border-white/[0.04]">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold text-violet-400">3</span>
                <p className="text-gray-300 leading-relaxed">
                  Tap <span className="font-semibold text-white">Add</span> in the top-right corner.
                </p>
              </div>
            </div>

            <button
              onClick={onCloseTutorial}
              className="w-full py-3 rounded-2xl text-xs font-semibold text-white transition-all active:scale-[0.98] shadow-lg"
              style={{ background: brandColor }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

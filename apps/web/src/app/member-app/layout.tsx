import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'GymOS Member App',
  description: 'Your personal gym companion',
  manifest: '/manifest-member.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GymOS',
  },
  icons: {
    icon: '/icon-192.png',
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' }
    ]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F0F0F',
};

export default function MemberAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-app-root">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        /* ─── Member App Animations ──────────────────────────── */

        /* Fade in for initial load */
        @keyframes member-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Scale in for modals */
        @keyframes member-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Tab enter animation */
        @keyframes member-tab-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Shimmer animation for skeletons */
        @keyframes member-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }

        .animate-fade-in {
          animation: member-fade-in 0.3s ease-out forwards;
        }

        .animate-scale-in {
          animation: member-scale-in 0.25s ease-out forwards;
        }

        .member-tab-enter {
          animation: member-tab-enter 0.2s ease-out forwards;
        }

        /* Skeleton shimmer */
        .animate-pulse {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 400px 100%;
          animation: member-shimmer 1.5s ease-in-out infinite;
        }

        /* Hide scrollbar for filter pills */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Line clamp for notification messages */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Overscroll behavior for native feel */
        .member-app-root {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }

        /* Prevent text selection for app-like feel */
        .member-app-root button,
        .member-app-root a {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Smooth transitions for all interactive elements */
        .member-app-root button {
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
      `}</style>
      {children}
    </div>
  );
}

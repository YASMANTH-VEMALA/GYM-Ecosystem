import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'GymOS Member App',
  description: 'Your personal gym companion',
  manifest: '/manifest-member.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
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
  themeColor: '#f5f5f5',
};

export default function MemberAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-app-root">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        /* ─── Member Real App Theme & Styles ───────────────── */
        body {
          background-color: #f5f5f5;
          font-family: 'Poppins', sans-serif;
          color: #060517;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }

        .member-app-root {
          min-height: 100vh;
          min-height: 100svh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f5f5f5;
          font-family: 'Poppins', sans-serif;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }

        /* Phone frame on desktop / tablet */
        .app-phone-container {
          width: 100%;
          max-width: 430px;
          height: 100vh;
          height: 100svh;
          background: #ffffff;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.07),
                      0 2px 4px rgba(0, 0, 0, 0.07),
                      0 4px 8px rgba(0, 0, 0, 0.07),
                      0 8px 16px rgba(0, 0, 0, 0.07),
                      0 16px 32px rgba(0, 0, 0, 0.07),
                      0 32px 64px rgba(0, 0, 0, 0.07);
        }

        @media (min-width: 640px) {
          .app-phone-container {
            height: 94vh;
            max-height: 890px;
            border-radius: 2rem;
            border: 8px solid #060517;
          }
        }

        /* Shimmer animation */
        @keyframes member-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }

        .animate-pulse-shimmer {
          background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%);
          background-size: 400px 100%;
          animation: member-shimmer 1.5s ease-in-out infinite;
        }

        /* Hide scrollbar */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Line clamp */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Prevent text selection */
        .member-app-root button,
        .member-app-root a {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Button tap feedback */
        .btn-tap {
          transition: transform 0.12s ease, opacity 0.12s ease;
        }
        .btn-tap:active {
          transform: scale(0.96);
          opacity: 0.9;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.22s ease-out forwards;
        }
      `}</style>
      {children}
    </div>
  );
}

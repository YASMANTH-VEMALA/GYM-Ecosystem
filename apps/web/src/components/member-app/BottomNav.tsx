'use client';

import { Home, Bell, TrendingUp, User, Gift } from 'lucide-react';

export type Tab = 'home' | 'notifications' | 'progress' | 'referrals' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount: number;
  brandColor?: string;
}

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'notifications', label: 'Alerts', icon: Bell },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
  { key: 'referrals', label: 'Refer', icon: Gift },
  { key: 'profile', label: 'Profile', icon: User },
];

export function BottomNav({ activeTab, onTabChange, unreadCount, brandColor = '#ffcb1c' }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white border-t border-[#f0f0f2] shadow-[0rem_-0.2rem_0.4rem_rgba(0,0,0,0.08)] rounded-t-[1rem] z-40 transition-transform duration-200"
      style={{ maxWidth: '430px' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-[58px] px-3 relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const showBadge = tab.key === 'notifications' && unreadCount > 0;

          return (
            <button
              key={tab.key}
              id={`member-nav-${tab.key}`}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 group outline-none cursor-pointer transition-transform active:scale-[0.92]"
            >
              {/* Top Accent Indicator Bar from template */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-200 ease-in-out"
                style={{
                  width: isActive ? '1.8rem' : '0rem',
                  backgroundColor: brandColor,
                  opacity: isActive ? 1 : 0,
                }}
              />

              <div className="relative flex items-center justify-center h-5 w-5 mb-0.5 mt-1">
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.3 : 1.9}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-[#060517]' : 'text-[#9c9ca3] group-hover:text-[#666]'
                  }`}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-[#ef4444] text-white flex items-center justify-center px-1 text-[9px] font-bold shadow-xs leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight transition-colors duration-200 ${
                  isActive ? 'font-semibold text-[#060517]' : 'font-medium text-[#9c9ca3]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for notched phones */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}

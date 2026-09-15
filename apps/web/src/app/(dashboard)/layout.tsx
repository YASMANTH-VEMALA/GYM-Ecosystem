'use client';

import { useAuth } from '@/providers/auth-provider';
import { useGymConfig } from '@/lib/gym-config-store';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, CreditCard, CalendarCheck, Dumbbell,
  UtensilsCrossed, BarChart3, Bell, Settings, UserCog, Receipt,
  Menu, X, LogOut, Monitor, IndianRupee, Smartphone,
  Building2,
  QrCode,
  ShieldOff,
} from 'lucide-react';
import type { PortalSection } from '@gymstack/shared';

const navItems: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles: string[]; section?: PortalSection }> = [
  { href: '/branches', label: 'All Branches', icon: Building2, roles: ['gym_owner'] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['gym_owner', 'manager', 'receptionist', 'coach'], section: 'dashboard' },
  { href: '/members', label: 'Members', icon: Users, roles: ['gym_owner', 'manager', 'receptionist', 'coach'], section: 'members' },
  { href: '/fees', label: 'Fees', icon: IndianRupee, roles: ['gym_owner', 'manager', 'receptionist'], section: 'fees' },
  { href: '/check-ins', label: 'Check-ins', icon: CalendarCheck, roles: ['gym_owner', 'manager', 'receptionist'], section: 'checkins' },
  { href: '/qr-codes', label: 'QR Codes', icon: QrCode, roles: ['gym_owner', 'manager', 'receptionist'], section: 'qr_codes' },
  { href: '/payments', label: 'Payments', icon: CreditCard, roles: ['gym_owner', 'manager', 'receptionist'], section: 'payments' },
  { href: '/plans', label: 'Plans', icon: Receipt, roles: ['gym_owner', 'manager'], section: 'plans' },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell, roles: ['gym_owner', 'manager', 'coach'], section: 'workouts' },
  { href: '/diets', label: 'Diets', icon: UtensilsCrossed, roles: ['gym_owner', 'manager', 'coach'], section: 'diets' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['gym_owner', 'manager'], section: 'analytics' },
  { href: '/staff', label: 'Staff', icon: UserCog, roles: ['gym_owner'] },
  { href: '/notifications', label: 'Notifications', icon: Bell, roles: ['gym_owner', 'manager', 'receptionist'], section: 'notifications' },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['gym_owner'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, branches, selectedBranchId, switchBranch } = useAuth();
  const { config } = useGymConfig();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!isLoading && user?.role === 'member') router.replace('/member-app');
  }, [isLoading, router, user]);

  const canAccessItem = (item: (typeof navItems)[number]) => !!user
    && item.roles.includes(user.role)
    && (user.role !== 'manager' || !item.section || (user.portalSections ?? []).includes(item.section));
  const matchedSection = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const canViewSection = !matchedSection || canAccessItem(matchedSection);
  const firstAccessibleHref = navItems.find(canAccessItem)?.href;

  useEffect(() => {
    if (!isLoading && user && !canViewSection && firstAccessibleHref) router.replace(firstAccessibleHref);
  }, [canViewSection, firstAccessibleHref, isLoading, router, user]);

  if (!isLoading && user?.role === 'manager' && !firstAccessibleHref) {
    return <div className="grid min-h-screen place-items-center bg-page p-6"><div className="card max-w-md text-center"><ShieldOff size={36} className="mx-auto text-text-muted" /><h1 className="mt-4 text-section-heading">Portal access not assigned</h1><p className="mt-2 text-body text-text-secondary">Ask the gym owner to enable the sections you need.</p><button onClick={logout} className="btn btn-secondary mt-6">Sign out</button></div></div>;
  }

  if (isLoading || !user || user.role === 'member' || !canViewSection) {
    return <div className="min-h-screen bg-page p-8"><div className="h-16 rounded-card bg-gray-100 animate-pulse mb-6" /><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="h-32 rounded-card bg-gray-100 animate-pulse" /><div className="h-32 rounded-card bg-gray-100 animate-pulse" /><div className="h-32 rounded-card bg-gray-100 animate-pulse" /></div></div>;
  }

  const filteredNav = navItems.filter(canAccessItem);

  return (
    <div className="flex h-screen bg-page">
      {/* Sidebar — warm off-white to match the page */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border-default bg-page transform transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 h-16 px-6 border-b border-border-default">
          <div className="h-8 w-8 overflow-hidden rounded flex items-center justify-center text-white font-medium text-sm" style={{ backgroundColor: config.primaryColor }}>
            {config.logoUrl || config.companyLogoUrl ? <img src={config.logoUrl ?? config.companyLogoUrl!} alt="" className="h-full w-full bg-white object-contain" /> : config.logoInitials || config.gymName[0] || 'G'}
          </div>
          <span className="font-medium text-lg truncate text-text-primary">{config.gymName || 'GymOS'}</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-text-muted hover:text-text-primary transition-colors duration-150">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out relative',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-[3px] border-primary'
                    : 'text-text-secondary hover:bg-white hover:text-text-primary'
                )}
              >
                <Icon size={18} className={isActive ? 'text-primary' : ''} />
                {item.label}
              </Link>
            );
          })}

          {(user.role !== 'manager' || (user.portalSections ?? []).includes('checkins')) && <Link
            href="/kiosk"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-white hover:text-text-primary transition-colors duration-150"
          >
            <Monitor size={18} />
            Open Kiosk
          </Link>}
          {(user.role !== 'manager' || (user.portalSections ?? []).includes('members')) && <Link
            href="/member-app"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-white hover:text-text-primary transition-colors duration-150"
          >
            <Smartphone size={18} />
            Member App
          </Link>}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border-default bg-page">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white border border-border-default flex items-center justify-center text-text-primary font-medium text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-text-primary">{user?.name}</p>
              <p className="text-xs text-text-muted capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={logout} className="text-text-muted hover:text-danger transition-colors duration-150" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center px-4 lg:px-8 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors duration-150">
            <Menu size={24} />
          </button>
          <div className="flex-1">
            {user.role === 'gym_owner' ? (
              <label className="inline-flex items-center gap-2">
                <Building2 size={16} className="text-text-muted" />
                <span className="sr-only">Active branch</span>
                <select
                  value={selectedBranchId ?? ''}
                  onChange={(event) => switchBranch(event.target.value)}
                  className="input h-9 min-w-44 py-1 font-medium"
                  aria-label="Switch active branch"
                >
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.city ? ` · ${branch.city}` : ''}</option>)}
                </select>
              </label>
            ) : user.role === 'manager' ? (
              <span className="inline-flex items-center gap-2 rounded-btn bg-stat-card px-3 py-2 text-caption font-medium text-text-secondary">
                <Building2 size={15} /> {branches[0]?.name || config.gymName}
              </span>
            ) : null}
          </div>
          <span className="text-sm text-gray-500 font-mono">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

    </div>
  );
}

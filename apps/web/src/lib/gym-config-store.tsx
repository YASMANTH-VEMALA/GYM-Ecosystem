'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import apiClient from './api-client';
import { useAuth } from '@/providers/auth-provider';

export interface GymPlanPrices { silverMonthly: number; goldThreeMonth: number; goldSixMonth: number; platinumAnnual: number }
export interface GymConfig {
  branchId: string; gymName: string; tagline: string; primaryColor: string; logoInitials: string; logoUrl: string | null; companyLogoUrl: string | null;
  address: string; phone: string; email: string; openTime: string; closeTime: string; memberCount: number;
  city: string; ownerName: string; coachName: string; whatsappNumber: string; planPrices: GymPlanPrices;
}

export const DEFAULT_GYM_CONFIG: GymConfig = {
  branchId: '', gymName: 'GymOS', tagline: '', primaryColor: '#2563EB', logoInitials: 'GO', logoUrl: null, companyLogoUrl: null,
  address: '', phone: '', email: '', openTime: '06:00 AM', closeTime: '10:00 PM', memberCount: 0,
  city: '', ownerName: '', coachName: '', whatsappNumber: '',
  planPrices: { silverMonthly: 0, goldThreeMonth: 0, goldSixMonth: 0, platinumAnnual: 0 },
};

interface GymConfigContextType { config: GymConfig; updateConfig: (partial: Partial<GymConfig>) => void; saveConfig: () => Promise<void>; resetConfig: () => void; isDirty: boolean; isLoading: boolean }
const GymConfigContext = createContext<GymConfigContextType | undefined>(undefined);

function applyBrandColor(color: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--brand-color', color);
  document.documentElement.style.setProperty('--color-primary', color);
  const hex = color.replace('#', '');
  const rgb = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  document.documentElement.style.setProperty('--brand-color-rgb', rgb.join(', '));
}

function fromApi(gym: any, memberCount = 0): GymConfig {
  const initials = String(gym.name ?? 'GymOS').split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();
  return { ...DEFAULT_GYM_CONFIG, branchId: gym.id, gymName: gym.name, primaryColor: gym.primaryColor, logoInitials: initials, logoUrl: gym.logoUrl, companyLogoUrl: gym.organization?.logoUrl ?? null, address: gym.address ?? '', city: gym.city ?? '', phone: gym.ownerPhone ?? '', email: gym.ownerEmail ?? '', ownerName: gym.ownerName ?? '', whatsappNumber: gym.ownerPhone ?? '', memberCount };
}

export function GymConfigProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [savedConfig, setSavedConfig] = useState(DEFAULT_GYM_CONFIG);
  const [config, setConfig] = useState(DEFAULT_GYM_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || user.role === 'member') { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [gymResponse, membersResponse] = await Promise.all([apiClient.get('/gym'), apiClient.get('/members', { params: { limit: 1 } })]);
      const next = fromApi(gymResponse.data.gym, membersResponse.data.total);
      setSavedConfig(next); setConfig(next); applyBrandColor(next.primaryColor);
    } finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { if (!authLoading) load().catch(() => setIsLoading(false)); }, [authLoading, load]);
  useEffect(() => applyBrandColor(config.primaryColor), [config.primaryColor]);
  const updateConfig = useCallback((partial: Partial<GymConfig>) => setConfig((current) => ({ ...current, ...partial })), []);
  const saveConfig = useCallback(async () => {
    const { data } = await apiClient.put('/gym', { name: config.gymName, primaryColor: config.primaryColor, logoUrl: config.logoUrl, address: config.address, city: config.city, ownerName: config.ownerName, ownerPhone: config.phone, ownerEmail: config.email });
    const next = fromApi(data.gym, config.memberCount); setSavedConfig(next); setConfig(next);
  }, [config]);
  const resetConfig = useCallback(() => { setConfig(savedConfig); applyBrandColor(savedConfig.primaryColor); }, [savedConfig]);

  return <GymConfigContext.Provider value={{ config, updateConfig, saveConfig, resetConfig, isDirty: JSON.stringify(config) !== JSON.stringify(savedConfig), isLoading }}>{children}</GymConfigContext.Provider>;
}

export function useGymConfig() { const context = useContext(GymConfigContext); if (!context) throw new Error('useGymConfig must be used within GymConfigProvider'); return context; }

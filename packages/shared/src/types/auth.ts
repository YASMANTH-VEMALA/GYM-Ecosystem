import type { Role } from '../constants/roles';
import type { PortalSection } from '../constants/portal-sections';

export interface User {
  id: string;
  organizationId: string | null;
  gymId: string | null;
  role: Role;
  portalSections: PortalSection[];
  phone: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  organizationId: string | null;
  gymId: string | null;
  role: Role;
  portalSections: PortalSection[];
}

export interface LoginRequest {
  phone: string;
  password: string;
  gymSlug?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  gym: { id: string; name: string; slug: string } | null;
}

export interface RegisterGymRequest {
  gymName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  password: string;
  slug: string;
}

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import prisma from '@gymstack/db';
import type { AuthTokenPayload } from '@gymstack/shared';
import { isPortalSection, type PortalSection } from '@gymstack/shared';
import { supabaseAdmin } from '../config/supabase';

const AUTH_CACHE_TTL_MS = 60 * 1000;
const AUTH_CACHE_MAX_ENTRIES = 1000;
const authenticatedUsers = new Map<string, { expiresAt: number; payload: AuthTokenPayload }>();

function tokenCacheKey(token: string) {
  return createHash('sha256').update(token).digest('base64url');
}

function getCachedUser(token: string) {
  const key = tokenCacheKey(token);
  const cached = authenticatedUsers.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    authenticatedUsers.delete(key);
    return null;
  }
  return cached.payload;
}

function cacheUser(token: string, payload: AuthTokenPayload) {
  if (authenticatedUsers.size >= AUTH_CACHE_MAX_ENTRIES) {
    const oldestKey = authenticatedUsers.keys().next().value as string | undefined;
    if (oldestKey) authenticatedUsers.delete(oldestKey);
  }
  authenticatedUsers.set(tokenCacheKey(token), { expiresAt: Date.now() + AUTH_CACHE_TTL_MS, payload });
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      gymId?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.split(' ')[1];
  const cachedUser = getCachedUser(token);
  if (cachedUser) {
    req.user = cachedUser;
    next();
    return;
  }

  try {
    let authId: string | undefined;
    let email: string | null = null;

    try {
      const { data, error } = await supabaseAdmin.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        authId = data.claims.sub as string;
        email = typeof data.claims.email === 'string' ? data.claims.email : null;
      }
    } catch {
      // Fallback to getUser
    }

    if (!authId) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }
      authId = data.user.id;
      email = data.user.email ?? null;
    }

    let appUser = await prisma.user.findUnique({ where: { authId } });

    // Safely link a pre-provisioned owner/staff record on first login.
    if (!appUser && email) {
      const matches = await prisma.user.findMany({
        where: { email, authId: null },
        take: 2,
      });
      if (matches.length === 1) {
        appUser = await prisma.user.update({
          where: { id: matches[0].id },
          data: { authId, lastLoginAt: new Date() },
        });
      }
    }

    if (!appUser || !appUser.isActive) {
      res.status(403).json({ error: 'Your GymOS account is not provisioned or is inactive' });
      return;
    }

    if (!appUser.lastLoginAt || Date.now() - appUser.lastLoginAt.getTime() > 15 * 60 * 1000) {
      await prisma.user.update({ where: { id: appUser.id }, data: { lastLoginAt: new Date() } });
    }

    const payload: AuthTokenPayload = {
      userId: appUser.id,
      organizationId: appUser.organizationId,
      gymId: appUser.gymId,
      role: appUser.role as AuthTokenPayload['role'],
      portalSections: appUser.portalSections.filter(isPortalSection),
    };
    cacheUser(token, payload);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireManagerSection(...sections: PortalSection[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== 'manager') {
      next();
      return;
    }
    if (!sections.some((section) => req.user!.portalSections.includes(section))) {
      res.status(403).json({ error: 'This section has not been enabled for your manager account' });
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import prisma from '@gymstack/db';
import type { AuthTokenPayload } from '@gymstack/shared';
import { isPortalSection, type PortalSection } from '@gymstack/shared';
import { supabaseAdmin } from '../config/supabase';

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
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    let appUser = await prisma.user.findUnique({ where: { authId: data.user.id } });

    // Safely link a pre-provisioned owner/staff record on first login.
    if (!appUser && data.user.email) {
      const matches = await prisma.user.findMany({
        where: { email: data.user.email, authId: null },
        take: 2,
      });
      if (matches.length === 1) {
        appUser = await prisma.user.update({
          where: { id: matches[0].id },
          data: { authId: data.user.id, lastLoginAt: new Date() },
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

    req.user = {
      userId: appUser.id,
      organizationId: appUser.organizationId,
      gymId: appUser.gymId,
      role: appUser.role as AuthTokenPayload['role'],
      portalSections: appUser.portalSections.filter(isPortalSection),
    };
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

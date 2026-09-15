import { Request, Response, NextFunction } from 'express';
import prisma from '@gymstack/db';

export async function gymContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Branch-scoped roles can never override their assigned branch.
  if (req.user?.gymId) {
    req.gymId = req.user.gymId;
    next();
    return;
  }

  // Organization owners choose a branch. If none has been selected yet, use
  // their first active branch so first login remains seamless.
  if (req.user?.role === 'gym_owner' && req.user.organizationId) {
    const requestedGymId = req.headers['x-gym-id'] as string | undefined;
    const gym = requestedGymId
      ? await prisma.gym.findFirst({
          where: { id: requestedGymId, organizationId: req.user.organizationId },
          select: { id: true, isActive: true },
        })
      : await prisma.gym.findFirst({
          where: { organizationId: req.user.organizationId, isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true, isActive: true },
        });
    if (!gym || !gym.isActive) {
      res.status(404).json({ error: 'Branch not found, inactive, or outside your organization' });
      return;
    }
    req.gymId = gym.id;
    next();
    return;
  }

  // Super admin doesn't need gym context for certain routes
  if (req.user?.role === 'super_admin') {
    next();
    return;
  }

  res.status(400).json({ error: 'Branch context required' });
}

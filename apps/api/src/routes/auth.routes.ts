import { Router, Request, Response } from 'express';
import prisma from '@gymstack/db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        organizationId: true,
        gymId: true,
        role: true,
        portalSections: true,
        phone: true,
        email: true,
        name: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        gym: { select: { id: true, name: true, slug: true } },
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            branches: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true, name: true, slug: true, city: true },
            },
          },
        },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const branches = user.role === 'gym_owner'
      ? user.organization?.branches ?? []
      : user.gym ? [user.gym] : [];
    res.json({
      user: { ...user, organization: undefined },
      organization: user.organization ? { id: user.organization.id, name: user.organization.name, logoUrl: user.organization.logoUrl } : null,
      branches,
      gym: user.gym ?? branches[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

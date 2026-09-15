import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import prisma from '@gymstack/db';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { deleteManagedLogo } from '../services/logo-upload.service';

const router = Router();
const updateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  logoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
}).strict();

router.use(authenticate, requireRole('gym_owner'));

router.get('/', async (req: Request, res: Response) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.user!.organizationId! },
    select: { id: true, name: true, logoUrl: true, ownerName: true },
  });
  if (!organization) { res.status(404).json({ error: 'Organization not found' }); return; }
  res.json({ organization });
});

router.patch('/', validate(updateSchema), async (req: Request, res: Response) => {
  try {
    const previous = await prisma.organization.findUnique({ where: { id: req.user!.organizationId! }, select: { logoUrl: true } });
    const organization = await prisma.organization.update({
      where: { id: req.user!.organizationId! },
      data: { name: req.body.name, logoUrl: req.body.logoUrl === '' ? null : req.body.logoUrl },
      select: { id: true, name: true, logoUrl: true, ownerName: true },
    });
    if (req.body.logoUrl !== undefined && req.body.logoUrl !== previous?.logoUrl) {
      await deleteManagedLogo(previous?.logoUrl).catch(() => undefined);
    }
    res.json({ organization });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import prisma from '@gymstack/db';
import { authenticate, requireRole } from '../middleware/auth';
import { deleteManagedLogo, uploadLogo } from '../services/logo-upload.service';

const router = Router();
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

router.use(authenticate, requireRole('gym_owner'));

function parseLogo(req: Request, res: Response, next: NextFunction) {
  logoUpload.single('file')(req, res, (error) => {
    if (!error) { next(); return; }
    const isSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    res.status(isSizeError ? 413 : 400).json({ error: isSizeError ? 'Logo must be 2 MB or smaller' : 'Could not read the uploaded logo' });
  });
}

router.post('/logo', parseLogo, async (req: Request, res: Response) => {
  try {
    if (!req.user?.organizationId) { res.status(403).json({ error: 'Owner account is not linked to an organization' }); return; }
    if (!req.file) { res.status(400).json({ error: 'Choose a logo image to upload' }); return; }
    const scope = req.body.scope;
    if (scope !== 'organization' && scope !== 'branch') { res.status(400).json({ error: 'Logo scope must be organization or branch' }); return; }

    const branchId = typeof req.body.branchId === 'string' ? req.body.branchId : undefined;
    let previousLogoUrl: string | null = null;
    if (scope === 'branch') {
      const branch = await prisma.gym.findFirst({
        where: { id: branchId, organizationId: req.user.organizationId },
        select: { id: true, logoUrl: true },
      });
      if (!branch) { res.status(404).json({ error: 'Branch not found' }); return; }
      previousLogoUrl = branch.logoUrl;
    } else {
      const organization = await prisma.organization.findUnique({ where: { id: req.user.organizationId }, select: { logoUrl: true } });
      previousLogoUrl = organization?.logoUrl ?? null;
    }

    const logoUrl = await uploadLogo(req.user.organizationId, req.file);
    if (scope === 'organization') {
      await prisma.organization.update({ where: { id: req.user.organizationId }, data: { logoUrl } });
    } else {
      await prisma.gym.update({ where: { id: branchId! }, data: { logoUrl } });
    }
    await deleteManagedLogo(previousLogoUrl).catch(() => undefined);
    res.status(201).json({ logoUrl, scope, branchId: branchId ?? null });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as staffService from '../services/staff.service';
import { requireString } from '../utils/request';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { PortalSectionValues } from '@gymstack/shared';

const staffSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  role: z.enum(['manager', 'receptionist', 'coach']),
  password: z.string().min(8).max(72),
  portalSections: z.array(z.enum(PortalSectionValues)).max(PortalSectionValues.length).optional(),
});
const resetPasswordSchema = z.object({ password: z.string().min(8).max(72) });
const portalAccessSchema = z.object({ portalSections: z.array(z.enum(PortalSectionValues)).max(PortalSectionValues.length) });

const router = Router();
router.use(authenticate, gymContext);

router.get('/', requireRole('gym_owner'), async (req: Request, res: Response) => {
  try {
    const staff = await staffService.getStaff(req.gymId!);
    res.json({ staff });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', requireRole('gym_owner'), validate(staffSchema), async (req: Request, res: Response) => {
  try {
    const staff = await staffService.createStaff(req.gymId!, req.body);
    res.status(201).json({ staff });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/:id/toggle', requireRole('gym_owner'), async (req: Request, res: Response) => {
  try {
    const staffId = requireString(req.params.id, 'id');
    const staff = await staffService.toggleStaffStatus(staffId, req.gymId!);
    res.json({ staff });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/:id/reset-password', requireRole('gym_owner'), validate(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const staffId = requireString(req.params.id, 'id');
    const result = await staffService.resetStaffPassword(staffId, req.gymId!, req.body.password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/:id/portal-access', requireRole('gym_owner'), validate(portalAccessSchema), async (req: Request, res: Response) => {
  try {
    const staffId = requireString(req.params.id, 'id');
    const staff = await staffService.updateManagerPortalSections(staffId, req.gymId!, req.body.portalSections);
    res.json({ staff });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

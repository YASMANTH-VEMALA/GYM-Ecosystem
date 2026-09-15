import { Router, Request, Response } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as checkinService from '../services/checkin.service';
import prisma from '@gymstack/db';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { verifyBranchQrToken } from '../utils/branch-qr';

const kioskCheckInSchema = z.object({ memberCode: z.string().trim().min(1).max(20) });
const qrCheckInSchema = z.object({
  gymId: z.string().uuid(),
  token: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  hash: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
}).refine((value) => Boolean(value.token || value.hash), { message: 'token is required', path: ['token'] });
const syncCheckInsSchema = z.object({
  checkIns: z.array(z.object({ memberCode: z.string().trim().min(1).max(20), timestamp: z.string().datetime({ offset: true }) })).max(500),
});

const router = Router();
router.use(authenticate, gymContext);
router.use(requireManagerSection('checkins'));

// ─── Kiosk check-in (receptionist) ────────────────────
router.post('/', requireRole('gym_owner', 'manager', 'receptionist'), validate(kioskCheckInSchema), async (req: Request, res: Response) => {
  try {
    const { memberCode } = req.body;
    const result = await checkinService.checkIn(memberCode, req.gymId!);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ─── QR check-in (mobile app) ─────────────────────────
router.post('/qr', validate(qrCheckInSchema), async (req: Request, res: Response) => {
  try {
    const { gymId, token, hash } = req.body;
    const suppliedToken = token ?? hash ?? '';

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { qrSecret: true, isActive: true } });
    if (!gym?.isActive) {
      res.status(404).json({ error: 'Gym not found or inactive' });
      return;
    }

    if (!verifyBranchQrToken(gymId, gym.qrSecret, 'attendance', suppliedToken)) {
      res.status(403).json({ error: 'Invalid QR code' });
      return;
    }

    // Find member from authenticated user
    const member = await prisma.member.findFirst({
      where: { userId: req.user!.userId, gymId },
    });
    if (!member) {
      res.status(404).json({ error: 'Member not found for this gym' });
      return;
    }

    const result = await checkinService.checkIn(member.memberCode, gymId, 'app');
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/sync', requireRole('gym_owner', 'manager', 'receptionist'), validate(syncCheckInsSchema), async (req: Request, res: Response) => {
  try {
    const { checkIns } = req.body;
    const result = await checkinService.syncOfflineCheckIns(req.gymId!, checkIns);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/today', requireRole('gym_owner', 'manager', 'receptionist'), async (req: Request, res: Response) => {
  try {
    const checkIns = await checkinService.getTodayCheckIns(req.gymId!);
    res.json({ checkIns });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/by-date', requireRole('gym_owner', 'manager', 'receptionist'), async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const checkIns = await checkinService.getCheckInsByDate(req.gymId!, date);
    res.json({ checkIns });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

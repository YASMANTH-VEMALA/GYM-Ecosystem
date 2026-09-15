import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import prisma from '@gymstack/db';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { buildBranchQrUrl, createBranchQrToken } from '../utils/branch-qr';
import { deleteManagedLogo } from '../services/logo-upload.service';

const gymUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  logoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ownerName: z.string().trim().min(2).max(200).optional(),
  ownerPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  ownerEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.union([z.string().regex(/^\d{6}$/), z.literal(''), z.null()]).optional(),
  gstin: z.union([z.string().regex(/^[0-9A-Z]{15}$/), z.literal(''), z.null()]).optional(),
  timezone: z.string().min(3).max(50).optional(),
}).strict();

const router = Router();

router.get('/branding', async (req: Request, res: Response) => {
  try {
    const slug = req.query.slug as string;
    if (!slug) { res.status(400).json({ error: 'slug query param required' }); return; }
    const gym = await prisma.gym.findUnique({
      where: { slug },
      select: { name: true, logoUrl: true, primaryColor: true, secondaryColor: true, organization: { select: { logoUrl: true } } },
    });
    if (!gym) { res.status(404).json({ error: 'Gym not found' }); return; }
    res.json({ ...gym, logoUrl: gym.logoUrl ?? gym.organization.logoUrl, branchLogoUrl: gym.logoUrl, organization: undefined });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.use(authenticate, gymContext);

router.get('/', requireRole('gym_owner', 'manager', 'receptionist', 'coach'), async (req: Request, res: Response) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.gymId },
      omit: { qrSecret: true },
      include: { organization: { select: { logoUrl: true, name: true } } },
    });
    if (!gym) { res.status(404).json({ error: 'Gym not found' }); return; }
    res.json({ gym });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/', requireRole('gym_owner'), validate(gymUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { name, logoUrl, primaryColor, secondaryColor, ownerName, ownerPhone, ownerEmail, address, city, state, pincode, gstin, timezone } = req.body;
    const previous = logoUrl !== undefined ? await prisma.gym.findUnique({ where: { id: req.gymId }, select: { logoUrl: true } }) : null;
    const gym = await prisma.gym.update({
      where: { id: req.gymId },
      data: { name, logoUrl, primaryColor, secondaryColor, ownerName, ownerPhone, ownerEmail, address, city, state, pincode, gstin, timezone },
      include: { organization: { select: { logoUrl: true, name: true } } },
    });
    const { qrSecret: _qrSecret, ...safeGym } = gym;
    if (logoUrl !== undefined && logoUrl !== previous?.logoUrl) await deleteManagedLogo(previous?.logoUrl).catch(() => undefined);
    res.json({ gym: safeGym });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/qr', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('qr_codes'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { qrSecret: true } });
    if (!gym) { res.status(404).json({ error: 'Gym not found' }); return; }
    const attendanceToken = createBranchQrToken(gymId, gym.qrSecret, 'attendance');
    const admissionToken = createBranchQrToken(gymId, gym.qrSecret, 'admission');
    const attendanceQrData = buildBranchQrUrl(gymId, attendanceToken, 'attendance');
    const admissionQrData = buildBranchQrUrl(gymId, admissionToken, 'admission');

    res.json({
      qrData: attendanceQrData,
      hash: attendanceToken,
      token: attendanceToken,
      attendanceQrData,
      admissionQrData,
      gymId,
      instructions: 'Share the admission QR with new members and display the attendance QR inside the branch.',
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/qr/regenerate', requireRole('gym_owner'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const gym = await prisma.gym.update({
      where: { id: gymId },
      data: { qrSecret: crypto.randomBytes(32).toString('hex') },
      select: { qrSecret: true },
    });
    const attendanceToken = createBranchQrToken(gymId, gym.qrSecret, 'attendance');
    const admissionToken = createBranchQrToken(gymId, gym.qrSecret, 'admission');
    res.json({
      message: 'QR codes regenerated. Previous QR codes will no longer work.',
      qrData: buildBranchQrUrl(gymId, attendanceToken, 'attendance'),
      hash: attendanceToken,
      token: attendanceToken,
      attendanceQrData: buildBranchQrUrl(gymId, attendanceToken, 'attendance'),
      admissionQrData: buildBranchQrUrl(gymId, admissionToken, 'admission'),
      gymId,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

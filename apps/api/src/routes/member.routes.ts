import { Router, Request, Response } from 'express';
import prisma from '@gymstack/db';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import { validate } from '../middleware/validate';
import { createMemberSchema, updateMemberSchema } from '@gymstack/shared';
import * as memberService from '../services/member.service';
import { saveFCMToken } from '../services/fcm.service';
import { asString, requireString } from '../utils/request';
import { assertMemberAccess } from '../utils/member-access';

const router = Router();
router.use(authenticate, gymContext);
router.use(requireManagerSection('members'));

// ─── FCM Token (from mobile app) ──────────────────────
router.post('/fcm-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: 'token is required' }); return; }
    await saveFCMToken(req.user!.userId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Member's own profile (mobile app) ────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    const member = await prisma.member.findFirst({
      where: { userId: req.user!.userId },
      include: {
        user: { select: { name: true, phone: true, email: true, avatarUrl: true } },
        gym: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, organization: { select: { logoUrl: true } } } },
        subscriptions: {
          include: { plan: true },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    });
    if (!member) { res.status(404).json({ error: 'Member profile not found' }); return; }

    const totalVisits = await prisma.checkIn.count({ where: { memberId: member.id } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthVisits = await prisma.checkIn.count({
      where: { memberId: member.id, checkedInAt: { gte: startOfMonth } },
    });

    // Check if checked in today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCheckIn = await prisma.checkIn.findFirst({
      where: { memberId: member.id, checkedInAt: { gte: startOfDay } },
    });

    // Last 7 days attendance
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const recentCheckIns = await prisma.checkIn.findMany({
      where: { memberId: member.id, checkedInAt: { gte: sevenDaysAgo } },
      select: { checkedInAt: true, source: true },
    });
    const attendanceDays = recentCheckIns.map((c) => c.checkedInAt.toISOString().split('T')[0]);

    const activeSub = member.subscriptions[0];
    const daysRemaining = activeSub
      ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Fee status
    let feeStatus: 'paid' | 'due' | 'overdue' = 'paid';
    if (activeSub) {
      if (new Date(activeSub.endDate) < new Date()) feeStatus = 'overdue';
      else if (daysRemaining <= 7) feeStatus = 'due';
    } else {
      feeStatus = 'overdue';
    }

    res.json({
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: member.user.name,
        phone: member.user.phone,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        dateOfBirth: member.dateOfBirth,
        joinedAt: member.joinedAt,
      },
      gym: { ...member.gym, logoUrl: member.gym.logoUrl ?? member.gym.organization.logoUrl, organization: undefined },
      subscription: activeSub ? {
        planName: activeSub.plan.name,
        startDate: activeSub.startDate,
        endDate: activeSub.endDate,
        daysRemaining,
        status: activeSub.status,
      } : null,
      stats: { totalVisits, monthVisits, checkedInToday: !!todayCheckIn },
      attendanceLast7Days: attendanceDays,
      feeStatus,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Member attendance calendar ───────────────────────
router.get('/:id/attendance', requireRole('gym_owner', 'manager', 'receptionist', 'coach', 'member'), async (req: Request, res: Response) => {
  try {
    const memberId = requireString(req.params.id, 'id');
    await assertMemberAccess(req, memberId);
    const targetMonth = Number(asString(req.query.month)) || new Date().getMonth() + 1;
    const targetYear = Number(asString(req.query.year)) || new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const checkIns = await prisma.checkIn.findMany({
      where: {
        memberId,
        checkedInAt: { gte: startDate, lte: endDate },
      },
      select: { checkedInAt: true, source: true },
      orderBy: { checkedInAt: 'asc' },
    });

    const totalInMonth = await prisma.checkIn.count({
      where: {
        memberId,
        checkedInAt: { gte: startDate, lte: endDate },
      },
    });

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    res.json({
      month: targetMonth,
      year: targetYear,
      daysInMonth,
      presentDays: totalInMonth,
      absentDays: daysInMonth - totalInMonth,
      attendancePercent: Math.round((totalInMonth / daysInMonth) * 100),
      checkIns: checkIns.map((c) => ({
        date: c.checkedInAt.toISOString().split('T')[0],
        time: c.checkedInAt.toISOString(),
        source: c.source,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Existing CRUD routes ─────────────────────────────

router.get('/', requireRole('gym_owner', 'manager', 'receptionist', 'coach'), async (req: Request, res: Response) => {
  try {
    const search = asString(req.query.search);
    const status = asString(req.query.status);
    const planId = asString(req.query.planId);
    const result = await memberService.getMembers(req.gymId!, {
      search,
      status,
      planId,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', requireRole('gym_owner', 'manager', 'receptionist', 'coach'), async (req: Request, res: Response) => {
  try {
    const memberId = requireString(req.params.id, 'id');
    const result = await memberService.getMemberById(memberId, req.gymId!);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.post('/', requireRole('gym_owner', 'manager', 'receptionist'), validate(createMemberSchema), async (req: Request, res: Response) => {
  try {
    const member = await memberService.createMember(req.gymId!, req.body);
    res.status(201).json({ member });
  } catch (err) {
    res.status(400).json({ error: memberService.friendlyMemberCreationError(err) });
  }
});

router.put('/:id', requireRole('gym_owner', 'manager', 'receptionist'), validate(updateMemberSchema), async (req: Request, res: Response) => {
  try {
    const memberId = requireString(req.params.id, 'id');
    const member = await memberService.updateMember(memberId, req.gymId!, req.body);
    res.json({ member });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete('/:id', requireRole('gym_owner'), async (req: Request, res: Response) => {
  try {
    const memberId = requireString(req.params.id, 'id');
    await memberService.deleteMember(memberId, req.gymId!);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

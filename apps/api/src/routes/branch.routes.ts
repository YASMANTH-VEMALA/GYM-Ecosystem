import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '@gymstack/db';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireString } from '../utils/request';

const branchSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.union([z.string().regex(/^\d{6}$/), z.literal('')]).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  logoUrl: z.string().url().optional(),
}).strict();

const branchUpdateSchema = branchSchema.omit({ slug: true }).partial().extend({
  isActive: z.boolean().optional(),
}).strict();

const router = Router();
router.use(authenticate, requireRole('gym_owner'));

function organizationId(req: Request) {
  if (!req.user?.organizationId) throw new Error('Owner account is not linked to an organization');
  return req.user.organizationId;
}

async function branchMetrics(id: string) {
  const now = new Date();
  const todayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000+05:30`);
  const monthStart = new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000+05:30`);
  const [members, activeMembers, staff, checkInsToday, revenue] = await Promise.all([
    prisma.member.count({ where: { gymId: id } }),
    prisma.member.count({ where: { gymId: id, subscriptions: { some: { status: 'active', endDate: { gte: now } } } } }),
    prisma.user.count({ where: { gymId: id, role: { in: ['manager', 'receptionist', 'coach'] }, isActive: true } }),
    prisma.checkIn.count({ where: { gymId: id, checkedInAt: { gte: todayStart } } }),
    prisma.payment.aggregate({ where: { gymId: id, paidAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
  ]);
  return { members, activeMembers, staff, checkInsToday, revenueThisMonth: Number(revenue._sum.totalAmount ?? 0) };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const branches = await prisma.gym.findMany({
      where: { organizationId: organizationId(req) },
      select: { id: true, name: true, slug: true, city: true, address: true, isActive: true, primaryColor: true, logoUrl: true, organization: { select: { logoUrl: true } }, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const result = await Promise.all(branches.map(async ({ organization, ...branch }) => ({ ...branch, logoUrl: branch.logoUrl ?? organization.logoUrl, metrics: await branchMetrics(branch.id) })));
    res.json({ branches: result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId(req) },
      select: { id: true, name: true, ownerName: true, logoUrl: true },
    });
    if (!organization) { res.status(404).json({ error: 'Organization not found' }); return; }
    const branches = await prisma.gym.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, slug: true, city: true, isActive: true, primaryColor: true, logoUrl: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const branchRows = await Promise.all(branches.map(async (branch) => ({ ...branch, metrics: await branchMetrics(branch.id) })));
    const totals = branchRows.reduce((sum, branch) => ({
      branches: sum.branches + 1,
      members: sum.members + branch.metrics.members,
      activeMembers: sum.activeMembers + branch.metrics.activeMembers,
      staff: sum.staff + branch.metrics.staff,
      checkInsToday: sum.checkInsToday + branch.metrics.checkInsToday,
      revenueThisMonth: sum.revenueThisMonth + branch.metrics.revenueThisMonth,
    }), { branches: 0, members: 0, activeMembers: 0, staff: 0, checkInsToday: 0, revenueThisMonth: 0 });
    res.json({ organization, totals, branches: branchRows });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/', validate(branchSchema), async (req: Request, res: Response) => {
  try {
    const owner = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!owner) { res.status(404).json({ error: 'Owner not found' }); return; }
    const branch = await prisma.gym.create({
      data: {
        organizationId: organizationId(req),
        name: req.body.name,
        slug: req.body.slug,
        subdomain: req.body.slug,
        city: req.body.city || null,
        address: req.body.address || null,
        state: req.body.state || null,
        pincode: req.body.pincode || null,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerPhone: req.body.phone || owner.phone,
        logoUrl: req.body.logoUrl || null,
        membershipPlans: {
          create: [
            { name: 'Monthly', durationDays: 30, price: 1500, gstPercent: 18 },
            { name: 'Quarterly', durationDays: 90, price: 4000, gstPercent: 18 },
            { name: 'Annual', durationDays: 365, price: 12000, gstPercent: 18 },
          ],
        },
      },
      select: { id: true, name: true, slug: true, city: true, isActive: true, logoUrl: true },
    });
    res.status(201).json({ branch });
  } catch (error) {
    const message = (error as { code?: string }).code === 'P2002' ? 'That branch slug is already in use' : (error as Error).message;
    res.status(400).json({ error: message });
  }
});

router.patch('/:id', validate(branchUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = requireString(req.params.id, 'id');
    const existing = await prisma.gym.findFirst({ where: { id, organizationId: organizationId(req) } });
    if (!existing) { res.status(404).json({ error: 'Branch not found' }); return; }
    const branch = await prisma.gym.update({
      where: { id },
      data: {
        name: req.body.name,
        city: req.body.city,
        address: req.body.address,
        state: req.body.state,
        pincode: req.body.pincode || undefined,
        ownerPhone: req.body.phone,
        logoUrl: req.body.logoUrl,
        isActive: req.body.isActive,
      },
      select: { id: true, name: true, slug: true, city: true, address: true, state: true, pincode: true, isActive: true, logoUrl: true },
    });
    res.json({ branch });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

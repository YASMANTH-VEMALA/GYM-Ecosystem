import { Router, Request, Response } from 'express';
import prisma from '@gymstack/db';
import { authenticate, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import { resolveWebBaseUrl } from '../utils/branch-qr';
import { tryConvertReferral, reconcilePendingReferrals } from '../services/referral.service';

export { tryConvertReferral, reconcilePendingReferrals };

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique referral code for a member.
 * Format: First 4 letters of name (uppercased) + 4 random digits  e.g. "RAHU4821"
 */
async function generateUniqueCode(name: string): Promise<string> {
  const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `${prefix}${suffix}`;
    const existing = await prisma.memberReferralCode.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ─── Admin/Owner: Campaign Management ─────────────────────────────────────────

// POST /referrals/campaigns
router.post('/campaigns', authenticate, gymContext, requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const { name, description, rewardDescription, refereeRewardDescription, maxReferralsPerMember, startsAt, endsAt } = req.body;

    if (!name || !startsAt) return res.status(400).json({ error: 'name and startsAt are required' });

    const campaign = await prisma.referralCampaign.create({
      data: {
        gymId,
        name,
        description: description ?? null,
        rewardDescription: rewardDescription ?? null,
        refereeRewardDescription: refereeRewardDescription ?? null,
        maxReferralsPerMember: maxReferralsPerMember ? Number(maxReferralsPerMember) : null,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        isActive: true,
      },
    });

    return res.status(201).json(campaign);
  } catch (err) {
    console.error('Create referral campaign error:', err);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// GET /referrals/campaigns
router.get('/campaigns', authenticate, gymContext, requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;

    // Reconcile pending referrals where member has joined, paid, or checked in
    await reconcilePendingReferrals(gymId);

    const campaigns = await prisma.referralCampaign.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { referrals: true } } },
    });

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const stats = await prisma.memberReferral.groupBy({
          by: ['status'],
          where: { campaignId: c.id },
          _count: { status: true },
        });
        const statMap: Record<string, number> = {};
        stats.forEach((s) => { statMap[s.status] = s._count.status; });
        return {
          ...c,
          stats: {
            total: c._count.referrals,
            pending: statMap['pending'] ?? 0,
            converted: statMap['converted'] ?? 0,
            rewarded: statMap['rewarded'] ?? 0,
            expired: statMap['expired'] ?? 0,
          },
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error('List referral campaigns error:', err);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// PATCH /referrals/campaigns/:id
router.patch('/campaigns/:id', authenticate, gymContext, requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const id = req.params.id as string;
    const { name, description, rewardDescription, refereeRewardDescription, maxReferralsPerMember, isActive, startsAt, endsAt } = req.body;

    const campaign = await prisma.referralCampaign.findFirst({ where: { id, gymId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const updated = await prisma.referralCampaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(rewardDescription !== undefined && { rewardDescription }),
        ...(refereeRewardDescription !== undefined && { refereeRewardDescription }),
        ...(maxReferralsPerMember !== undefined && { maxReferralsPerMember: maxReferralsPerMember ? Number(maxReferralsPerMember) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
        ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Update referral campaign error:', err);
    return res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// GET /referrals/campaigns/:id/referrals
router.get('/campaigns/:id/referrals', authenticate, gymContext, requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const id = req.params.id as string;
    const status = req.query.status as string | undefined;
    const page = (req.query.page as string) ?? '1';
    const limit = (req.query.limit as string) ?? '20';

    // Reconcile pending referrals for this campaign
    await reconcilePendingReferrals(gymId, id);

    const campaign = await prisma.referralCampaign.findFirst({ where: { id, gymId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const where: any = { campaignId: id, gymId };
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [referrals, total] = await Promise.all([
      prisma.memberReferral.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: { include: { user: { select: { name: true, phone: true } } } },
          referredMember: { include: { user: { select: { name: true, phone: true } } } },
        },
      }),
      prisma.memberReferral.count({ where }),
    ]);

    return res.json({ referrals, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('List campaign referrals error:', err);
    return res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// PATCH /referrals/:id/convert — Manually convert a pending referral
router.patch('/:id/convert', authenticate, gymContext, requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const id = req.params.id as string;

    const referral = await prisma.memberReferral.findFirst({ where: { id, gymId } });
    if (!referral) return res.status(404).json({ error: 'Referral not found' });
    if (referral.status !== 'pending') return res.status(400).json({ error: 'Only pending referrals can be converted' });

    const updated = await prisma.memberReferral.update({
      where: { id },
      data: { status: 'converted', convertedAt: new Date() },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Convert referral error:', err);
    return res.status(500).json({ error: 'Failed to convert referral' });
  }
});

// PATCH /referrals/:id/reward — Mark reward as applied
router.patch('/:id/reward', authenticate, gymContext, requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const gymId = req.gymId!;
    const id = req.params.id as string;
    const { rewardNotes } = req.body;

    const referral = await prisma.memberReferral.findFirst({ where: { id, gymId } });
    if (!referral) return res.status(404).json({ error: 'Referral not found' });
    if (referral.status !== 'converted' && referral.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending or converted referrals can be marked as rewarded' });
    }

    const updated = await prisma.memberReferral.update({
      where: { id },
      data: {
        status: 'rewarded',
        convertedAt: referral.convertedAt ?? new Date(),
        rewardAppliedAt: new Date(),
        rewardNotes: rewardNotes ?? null,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('Apply referral reward error:', err);
    return res.status(500).json({ error: 'Failed to apply reward' });
  }
});

// ─── Member: My Code & Stats ──────────────────────────────────────────────────

// GET /referrals/my-code
router.get('/my-code', authenticate, gymContext, async (req: Request, res: Response) => {
  try {
    const userId: string = (req as any).user.userId;
    const gymId: string = req.gymId || (req as any).user.gymId;

    const member = await prisma.member.findFirst({
      where: { userId, gymId },
      include: { user: { select: { name: true } } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const now = new Date();
    const campaign = await prisma.referralCampaign.findFirst({
      where: {
        gymId,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!campaign) return res.json({ campaign: null, referralCode: null, referralLink: null });

    let codeRecord = await prisma.memberReferralCode.findUnique({
      where: { campaignId_memberId: { campaignId: campaign.id, memberId: member.id } },
    });

    if (!codeRecord) {
      const code = await generateUniqueCode(member.user.name);
      codeRecord = await prisma.memberReferralCode.create({
        data: { gymId, campaignId: campaign.id, memberId: member.id, code },
      });
    }

    const baseUrl = resolveWebBaseUrl(req);
    const referralLink = `${baseUrl}/admission?ref=${codeRecord.code}`;

    return res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        rewardDescription: campaign.rewardDescription,
        refereeRewardDescription: campaign.refereeRewardDescription,
        maxReferralsPerMember: campaign.maxReferralsPerMember,
        endsAt: campaign.endsAt,
      },
      referralCode: codeRecord.code,
      referralLink,
    });
  } catch (err) {
    console.error('Get my referral code error:', err);
    return res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// GET /referrals/my-stats
router.get('/my-stats', authenticate, gymContext, async (req: Request, res: Response) => {
  try {
    const userId: string = (req as any).user.userId;
    const gymId: string = req.gymId || (req as any).user.gymId;

    // Reconcile pending referrals where member has joined, paid, or checked in
    await reconcilePendingReferrals(gymId);

    const member = await prisma.member.findFirst({ where: { userId, gymId } });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const referrals = await prisma.memberReferral.findMany({
      where: { referrerId: member.id },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { name: true } },
        referredMember: { include: { user: { select: { name: true } } } },
      },
    });

    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      converted: referrals.filter((r) => r.status === 'converted').length,
      rewarded: referrals.filter((r) => r.status === 'rewarded').length,
    };

    return res.json({ stats, referrals });
  } catch (err) {
    console.error('Get my referral stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// POST /referrals/register — Register a referral when a new member joins with a ref code
router.post('/register', authenticate, gymContext, async (req: Request, res: Response) => {
  try {
    const gymId: string = req.gymId || (req as any).user.gymId;
    const { referralCode, referredMemberId } = req.body;

    if (!referralCode || !referredMemberId) {
      return res.status(400).json({ error: 'referralCode and referredMemberId are required' });
    }

    const codeRecord = await prisma.memberReferralCode.findUnique({
      where: { code: referralCode },
      include: { campaign: true },
    });

    if (!codeRecord || codeRecord.gymId !== gymId) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const campaign = codeRecord.campaign;
    const now = new Date();

    if (!campaign.isActive || campaign.startsAt > now || (campaign.endsAt && campaign.endsAt < now)) {
      return res.status(400).json({ error: 'Referral campaign is not active' });
    }

    if (campaign.maxReferralsPerMember !== null) {
      const used = await prisma.memberReferral.count({
        where: { campaignId: campaign.id, referrerId: codeRecord.memberId },
      });
      if (used >= campaign.maxReferralsPerMember) {
        return res.status(400).json({ error: 'Referrer has reached the maximum referral limit for this campaign' });
      }
    }

    const existing = await prisma.memberReferral.findFirst({
      where: { campaignId: campaign.id, referredMemberId },
    });
    if (existing) return res.status(409).json({ error: 'This member has already been referred in this campaign' });

    // Prevent self-referral
    if (codeRecord.memberId === referredMemberId) {
      return res.status(400).json({ error: 'Members cannot refer themselves' });
    }

    const referral = await prisma.memberReferral.create({
      data: {
        gymId,
        campaignId: campaign.id,
        referrerId: codeRecord.memberId,
        referredMemberId,
        referralCode,
        status: 'pending',
      },
    });

    // Check if referred member already has paid/subscribed
    tryConvertReferral(referredMemberId, gymId).catch(() => {});

    return res.status(201).json(referral);
  } catch (err) {
    console.error('Register referral error:', err);
    return res.status(500).json({ error: 'Failed to register referral' });
  }
});

export default router;

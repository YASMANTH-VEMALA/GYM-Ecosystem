import { Router, type Request, type Response } from 'express';
import prisma from '@gymstack/db';
import { createMemberSchema } from '@gymstack/shared';
import { validate } from '../middleware/validate';
import { admissionLimiter } from '../middleware/rate-limit';
import * as memberService from '../services/member.service';
import { verifyBranchQrToken } from '../utils/branch-qr';
import { requireString } from '../utils/request';
import { tryConvertReferral } from '../services/referral.service';

const router = Router();

async function getBranch(gymId: string) {
  return prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, city: true, address: true, logoUrl: true, primaryColor: true, isActive: true, qrSecret: true, organization: { select: { logoUrl: true } } },
  });
}

function tokenFrom(req: Request) {
  return typeof req.query.token === 'string' ? req.query.token : '';
}

// GET /admissions/referral/:code — Look up gym branch and campaign offer by referral code
router.get('/referral/:code', async (req: Request, res: Response) => {
  try {
    const rawParam = req.params.code;
    const code = (typeof rawParam === 'string' ? rawParam : Array.isArray(rawParam) ? rawParam[0] : '')?.trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Referral code is required' });
      return;
    }

    const codeRecord = await prisma.memberReferralCode.findUnique({
      where: { code },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            logoUrl: true,
            primaryColor: true,
            isActive: true,
            organization: { select: { logoUrl: true } },
          },
        },
        campaign: true,
        member: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!codeRecord || !codeRecord.gym?.isActive) {
      res.status(404).json({ error: 'Invalid or expired referral code' });
      return;
    }

    const now = new Date();
    if (!codeRecord.campaign.isActive || codeRecord.campaign.startsAt > now || (codeRecord.campaign.endsAt && codeRecord.campaign.endsAt < now)) {
      res.status(400).json({ error: 'This referral campaign is no longer active' });
      return;
    }

    const { organization, ...safeBranch } = codeRecord.gym;
    res.json({
      branch: { ...safeBranch, logoUrl: safeBranch.logoUrl ?? organization.logoUrl },
      referrer: { name: codeRecord.member.user.name },
      campaign: {
        name: codeRecord.campaign.name,
        reward: codeRecord.campaign.refereeRewardDescription,
      },
      gymId: safeBranch.id,
      code,
    });
  } catch {
    res.status(500).json({ error: 'Failed to look up referral code' });
  }
});

router.get('/:gymId', async (req: Request, res: Response) => {
  try {
    const gymId = requireString(req.params.gymId, 'gymId');
    const branch = await getBranch(gymId);
    if (!branch?.isActive || !verifyBranchQrToken(gymId, branch.qrSecret, 'admission', tokenFrom(req))) {
      res.status(404).json({ error: 'This admission link is invalid or no longer active' });
      return;
    }
    const { qrSecret: _qrSecret, isActive: _isActive, organization, ...safeBranch } = branch;
    res.json({ branch: { ...safeBranch, logoUrl: safeBranch.logoUrl ?? organization.logoUrl } });
  } catch {
    res.status(404).json({ error: 'This admission link is invalid or no longer active' });
  }
});

router.post('/:gymId', admissionLimiter, validate(createMemberSchema), async (req: Request, res: Response) => {
  try {
    const gymId = requireString(req.params.gymId, 'gymId');
    const branch = await getBranch(gymId);
    if (!branch?.isActive) {
      res.status(404).json({ error: 'This branch is inactive or not found' });
      return;
    }

    const refCode = (typeof req.query.ref === 'string' ? req.query.ref : (req.body as any).referralCode)?.trim().toUpperCase();
    let verifiedReferral: { codeRecord: any } | null = null;

    if (refCode) {
      const codeRecord = await prisma.memberReferralCode.findUnique({
        where: { code: refCode },
        include: { campaign: true },
      });
      if (codeRecord && codeRecord.gymId === gymId && codeRecord.campaign.isActive) {
        verifiedReferral = { codeRecord };
      }
    }

    // Must have either valid branch QR token OR valid referral code
    if (!verifiedReferral && !verifyBranchQrToken(gymId, branch.qrSecret, 'admission', tokenFrom(req))) {
      res.status(404).json({ error: 'This admission link is invalid or no longer active' });
      return;
    }

    const member = await memberService.createMember(gymId, req.body);

    // If joined via referral code, automatically register the referral record
    if (verifiedReferral) {
      try {
        const { codeRecord } = verifiedReferral;
        await prisma.memberReferral.create({
          data: {
            gymId,
            campaignId: codeRecord.campaign.id,
            referrerId: codeRecord.memberId,
            referredMemberId: member.id,
            referralCode: refCode,
            status: 'pending',
          },
        });

        // Attempt conversion check (e.g. if member already paid or has subscription)
        tryConvertReferral(member.id, gymId).catch(() => {});
      } catch (refErr) {
        console.error('Failed to link member referral on admission:', refErr);
      }
    }

    res.status(201).json({
      member: { id: member.id, memberCode: member.memberCode, name: member.user.name },
      branch: { id: branch.id, name: branch.name },
    });
  } catch (error) {
    const message = memberService.friendlyMemberCreationError(error);
    const isConflict = message.includes('phone number already exists') || message.includes('already linked to an account');
    res.status(isConflict ? 409 : 400).json({ error: message });
  }
});

export default router;

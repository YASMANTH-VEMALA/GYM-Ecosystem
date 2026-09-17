import { Router, type Request, type Response } from 'express';
import prisma from '@gymstack/db';
import { createMemberSchema } from '@gymstack/shared';
import { validate } from '../middleware/validate';
import { admissionLimiter } from '../middleware/rate-limit';
import * as memberService from '../services/member.service';
import { verifyBranchQrToken } from '../utils/branch-qr';
import { requireString } from '../utils/request';

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
    if (!branch?.isActive || !verifyBranchQrToken(gymId, branch.qrSecret, 'admission', tokenFrom(req))) {
      res.status(404).json({ error: 'This admission link is invalid or no longer active' });
      return;
    }
    const member = await memberService.createMember(gymId, req.body);
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

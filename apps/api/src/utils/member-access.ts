import type { Request } from 'express';
import prisma from '@gymstack/db';

export async function assertMemberAccess(req: Request, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: req.gymId! },
    select: { id: true, userId: true },
  });
  if (!member) throw new Error('Member not found');
  if (req.user?.role === 'member' && member.userId !== req.user.userId) {
    throw new Error('You cannot access another member account');
  }
  return member;
}

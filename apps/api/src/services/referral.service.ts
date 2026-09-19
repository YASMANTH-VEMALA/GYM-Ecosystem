import prisma from '@gymstack/db';

/**
 * Checks if a member who was referred is eligible to be converted.
 * A referral converts when:
 * 1. The referred member has an active subscription, OR
 * 2. The referred member has completed a payment, OR
 * 3. The referred member has checked in at least once.
 */
export async function tryConvertReferral(memberId: string, gymId?: string): Promise<boolean> {
  try {
    const where: any = { referredMemberId: memberId, status: 'pending' };
    if (gymId) where.gymId = gymId;

    const referral = await prisma.memberReferral.findFirst({ where });
    if (!referral) return false;

    // Check conditions: active subscription OR completed payment OR >= 1 check-in
    const [activeSub, paidPayment, checkIn] = await Promise.all([
      prisma.memberSubscription.findFirst({
        where: { memberId, status: 'active' },
      }),
      prisma.payment.findFirst({
        where: { memberId, paymentStatus: 'completed' },
      }),
      prisma.checkIn.findFirst({
        where: { memberId },
      }),
    ]);

    if (activeSub || paidPayment || checkIn) {
      await prisma.memberReferral.update({
        where: { id: referral.id },
        data: {
          status: 'converted',
          convertedAt: new Date(),
        },
      });
      console.log(`[Referral] Successfully converted referral ${referral.id} for member ${memberId}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Referral] tryConvertReferral error:', err);
    return false;
  }
}

/**
 * Reconciles all pending referrals for a gym (or specific campaign).
 * Converts any pending referrals whose referred member has paid, has an active subscription,
 * or has at least one check-in.
 */
export async function reconcilePendingReferrals(gymId: string, campaignId?: string): Promise<number> {
  try {
    const where: any = { gymId, status: 'pending' };
    if (campaignId) where.campaignId = campaignId;

    const pendingReferrals = await prisma.memberReferral.findMany({
      where,
      select: { id: true, referredMemberId: true },
    });

    let convertedCount = 0;
    for (const ref of pendingReferrals) {
      if (!ref.referredMemberId) continue;
      const converted = await tryConvertReferral(ref.referredMemberId, gymId);
      if (converted) convertedCount++;
    }

    return convertedCount;
  } catch (err) {
    console.error('[Referral] reconcilePendingReferrals error:', err);
    return 0;
  }
}

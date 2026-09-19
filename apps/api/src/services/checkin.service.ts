import prisma from '@gymstack/db';
import { tryConvertReferral } from './referral.service';

export async function checkIn(memberCode: string, gymId: string, source: string = 'kiosk') {
  // Find member by code
  const member = await prisma.member.findFirst({
    where: { gymId, memberCode },
    include: {
      user: { select: { name: true, phone: true, avatarUrl: true } },
      subscriptions: {
        where: { status: 'active' },
        include: { plan: true },
        orderBy: { endDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!member) throw new Error('Member not found');

  // Prevent duplicate check-in within 30 minutes
  const recentCheckIn = await prisma.checkIn.findFirst({
    where: {
      memberId: member.id,
      checkedInAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });
  if (recentCheckIn) throw new Error('Already checked in recently');

  // Create check-in
  const checkInRecord = await prisma.checkIn.create({
    data: { memberId: member.id, gymId, source },
  });

  // Get attendance this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthCheckIns = await prisma.checkIn.findMany({
    where: {
      memberId: member.id,
      checkedInAt: { gte: startOfMonth },
    },
    select: { checkedInAt: true },
  });

  const totalVisits = await prisma.checkIn.count({ where: { memberId: member.id } });

  // Fire-and-forget: auto-convert referral if this is the member's first check-in
  tryConvertReferral(member.id, gymId).catch(() => {/* non-fatal */});

  // Check for pending fees (simplified: any subscription that's expired)
  const feesDue = member.subscriptions.length === 0 ? 1 : 0; // simplified flag

  const activeSub = member.subscriptions[0];
  const daysRemaining = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    checkIn: {
      id: checkInRecord.id,
      memberId: checkInRecord.memberId,
      gymId: checkInRecord.gymId,
      checkedInAt: checkInRecord.checkedInAt.toISOString(),
      source: checkInRecord.source,
      synced: checkInRecord.synced,
    },
    member: {
      id: member.id,
      memberCode: member.memberCode,
      name: member.user.name,
      avatarUrl: member.user.avatarUrl,
      phone: member.user.phone,
    },
    subscription: activeSub
      ? {
          planName: activeSub.plan.name,
          startDate: activeSub.startDate.toISOString(),
          endDate: activeSub.endDate.toISOString(),
          daysRemaining,
          status: activeSub.status,
        }
      : null,
    attendanceThisMonth: monthCheckIns.map((c) => c.checkedInAt.toISOString().split('T')[0]),
    totalVisits,
    feesDue,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export async function syncOfflineCheckIns(gymId: string, checkIns: { memberCode: string; timestamp: string }[]) {
  const results = { synced: 0, failed: [] as string[] };

  for (const ci of checkIns) {
    try {
      const member = await prisma.member.findFirst({
        where: { gymId, memberCode: ci.memberCode },
      });
      if (!member) {
        results.failed.push(ci.memberCode);
        continue;
      }

      await prisma.checkIn.create({
        data: {
          memberId: member.id,
          gymId,
          checkedInAt: new Date(ci.timestamp),
          source: 'kiosk',
          synced: true,
        },
      });
      results.synced++;
    } catch {
      results.failed.push(ci.memberCode);
    }
  }

  return results;
}

export async function getTodayCheckIns(gymId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.checkIn.findMany({
    where: {
      gymId,
      checkedInAt: { gte: startOfDay },
    },
    include: {
      member: {
        include: {
          user: { select: { name: true, avatarUrl: true } },
          subscriptions: {
            where: { status: 'active' },
            include: { plan: { select: { name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { checkedInAt: 'desc' },
  });
}

export async function getCheckInsByDate(gymId: string, date?: string) {
  const target = date ? new Date(date) : new Date();
  const startOfDay = new Date(target);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(target);
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.checkIn.findMany({
    where: {
      gymId,
      checkedInAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      member: {
        include: {
          user: { select: { name: true, avatarUrl: true } },
          subscriptions: {
            where: { status: 'active' },
            include: { plan: { select: { name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { checkedInAt: 'desc' },
  });
}

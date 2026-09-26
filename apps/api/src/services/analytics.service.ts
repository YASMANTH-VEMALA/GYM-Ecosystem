import prisma from '@gymstack/db';

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function getRevenueAnalytics(gymId: string) {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.payment.aggregate({
      where: { gymId, paymentStatus: 'completed', paidAt: { gte: startOfThisMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { gymId, paymentStatus: 'completed', paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { totalAmount: true },
    }),
  ]);

  const current = Number(thisMonth._sum.totalAmount || 0);
  const previous = Number(lastMonth._sum.totalAmount || 0);
  const changePercent = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

  return { currentMonth: current, lastMonth: previous, changePercent };
}

export async function getPeakHours(gymId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const checkIns = await prisma.checkIn.findMany({
    where: { gymId, checkedInAt: { gte: since } },
    select: { checkedInAt: true },
  });

  // Aggregate by hour
  const hourCounts = new Array(24).fill(0);
  for (const ci of checkIns) {
    const hour = ci.checkedInAt.getHours();
    hourCounts[hour]++;
  }

  return hourCounts.map((count, hour) => ({ hour, count }));
}

export async function getPlanPopularity(gymId: string) {
  const plans = await prisma.membershipPlan.findMany({
    where: { gymId },
    include: {
      subscriptions: {
        where: { status: 'active' },
      },
    },
  });

  return plans.map((p) => ({
    planId: p.id,
    planName: p.name,
    count: p.subscriptions.length,
    revenue: p.subscriptions.reduce((sum, s) => sum + Number(s.amountPaid), 0),
  })).sort((a, b) => b.count - a.count);
}

export async function getChurnRisk(gymId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Members with active subscriptions who haven't visited in 7+ days
  const members = await prisma.member.findMany({
    where: {
      gymId,
      subscriptions: { some: { status: 'active', endDate: { gte: new Date() } } },
    },
    include: {
      user: { select: { name: true, phone: true, avatarUrl: true } },
      checkIns: { orderBy: { checkedInAt: 'desc' }, take: 1 },
      subscriptions: {
        where: { status: 'active' },
        include: { plan: { select: { name: true } } },
        take: 1,
      },
    },
  });

  return members
    .filter((m) => {
      if (m.checkIns.length === 0) return true;
      return m.checkIns[0].checkedInAt < sevenDaysAgo;
    })
    .map((m) => ({
      memberId: m.id,
      name: m.user.name,
      phone: m.user.phone,
      lastVisit: m.checkIns[0]?.checkedInAt.toISOString() || null,
      daysSinceLastVisit: m.checkIns[0]
        ? Math.floor((Date.now() - m.checkIns[0].checkedInAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      planName: m.subscriptions[0]?.plan.name || 'None',
    }));
}

export async function getMemberGrowth(gymId: string, months: number = 12) {
  const rows = await prisma.$queryRaw<
    Array<{ month: string; new_members: bigint; total_members: bigint }>
  >`
    WITH months AS (
      SELECT date_trunc('month', d)::date AS month_start,
             (date_trunc('month', d) + interval '1 month' - interval '1 day')::date AS month_end
      FROM generate_series(
        date_trunc('month', now()) - (${months - 1} || ' months')::interval,
        date_trunc('month', now()),
        '1 month'::interval
      ) AS d
    )
    SELECT
      to_char(m.month_start, 'YYYY-MM') AS month,
      COUNT(CASE WHEN mb.joined_at >= m.month_start AND mb.joined_at <= m.month_end THEN 1 END) AS new_members,
      COUNT(CASE WHEN mb.joined_at <= m.month_end THEN 1 END) AS total_members
    FROM months m
    LEFT JOIN members mb ON mb.gym_id = ${gymId}::uuid
    GROUP BY m.month_start
    ORDER BY m.month_start
  `;

  return rows.map((r) => ({
    month: r.month,
    newMembers: Number(r.new_members),
    totalMembers: Number(r.total_members),
  }));
}

export async function getDashboardOverview(gymId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = startOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const [
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    todayCheckIns,
    mobileCheckInsToday,
    bodyStatsThisMonth,
    workoutAssignments,
    dietAssignments,
    mobileConnectedMembers,
    revenueThisMonthAgg,
    overdueMembers,
    expiringSoonMembers,
    recentCheckIns,
    recentJoinedMembers,
    recentCheckInMembers,
    recentPaymentMembers,
    recentStatMembers,
    recentLoggedInUsers,
  ] = await Promise.all([
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({
      where: {
        gymId,
        subscriptions: {
          some: { status: 'active', endDate: { gte: todayStart } },
        },
      },
    }),
    prisma.member.count({ where: { gymId, joinedAt: { gte: monthStart } } }),
    prisma.checkIn.count({ where: { gymId, checkedInAt: { gte: todayStart } } }),
    prisma.checkIn.count({ where: { gymId, source: 'app', checkedInAt: { gte: todayStart } } }),
    prisma.bodyStat.count({ where: { member: { gymId }, recordedAt: { gte: monthStart } } }),
    prisma.memberWorkoutAssignment.count({
      where: { isActive: true, workoutPlan: { gymId } },
    }),
    prisma.memberDietAssignment.count({
      where: { isActive: true, dietChart: { gymId } },
    }),
    prisma.member.count({
      where: {
        gymId,
        user: {
          OR: [
            { fcmToken: { not: null } },
            { lastLoginAt: { not: null } },
          ],
        },
      },
    }),
    prisma.payment.aggregate({
      where: { gymId, paymentStatus: 'completed', paidAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.memberSubscription.count({
      where: { gymId, status: 'active', endDate: { lt: todayStart } },
    }),
    prisma.memberSubscription.count({
      where: {
        gymId,
        status: 'active',
        endDate: { gte: todayStart, lte: sevenDaysFromNow },
      },
    }),
    prisma.checkIn.findMany({
      where: { gymId },
      include: {
        member: {
          include: {
            user: { select: { name: true, avatarUrl: true } },
            subscriptions: {
              where: { status: 'active' },
              include: { plan: { select: { name: true } } },
              orderBy: { endDate: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
      take: 8,
    }),
    prisma.member.findMany({
      where: { gymId },
      include: {
        user: { select: { name: true, phone: true } },
        subscriptions: {
          where: { status: 'active' },
          include: { plan: { select: { name: true } } },
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 6,
    }),
    prisma.checkIn.findMany({
      where: { gymId, checkedInAt: { gte: thirtyDaysAgo } },
      orderBy: { checkedInAt: 'desc' },
      take: 20,
      select: { memberId: true },
    }),
    prisma.payment.findMany({
      where: { gymId, paidAt: { gte: thirtyDaysAgo } },
      orderBy: { paidAt: 'desc' },
      take: 20,
      select: { memberId: true },
    }),
    prisma.bodyStat.findMany({
      where: { member: { gymId }, recordedAt: { gte: thirtyDaysAgo } },
      orderBy: { recordedAt: 'desc' },
      take: 20,
      select: { memberId: true },
    }),
    prisma.user.findMany({
      where: { gymId, role: 'member', lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: 'desc' },
      take: 20,
      select: { member: { select: { id: true } } },
    }),
  ]);

  const activityMemberIds = Array.from(
    new Set(
      [
        ...recentCheckInMembers.map((entry) => entry.memberId),
        ...recentPaymentMembers.map((entry) => entry.memberId),
        ...recentStatMembers.map((entry) => entry.memberId),
        ...recentLoggedInUsers.map((entry) => entry.member?.id).filter(Boolean),
      ],
    ),
  ) as string[];

  const mobileMembers = activityMemberIds.length === 0
    ? []
    : await prisma.member.findMany({
        where: { gymId, id: { in: activityMemberIds } },
        include: {
          user: {
            select: {
              name: true,
              phone: true,
              lastLoginAt: true,
              fcmToken: true,
            },
          },
          subscriptions: {
            where: { status: 'active' },
            include: { plan: { select: { name: true } } },
            orderBy: { endDate: 'desc' },
            take: 1,
          },
          checkIns: {
            orderBy: { checkedInAt: 'desc' },
            take: 10,
            select: { checkedInAt: true, source: true },
          },
          payments: {
            orderBy: { paidAt: 'desc' },
            take: 1,
            select: { paidAt: true, totalAmount: true, paymentMethod: true },
          },
          bodyStats: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
            select: { recordedAt: true, weightKg: true },
          },
          workoutAssignments: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: { workoutPlan: { select: { name: true } } },
          },
          dietAssignments: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: { dietChart: { select: { name: true } } },
          },
          notificationsLog: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, channel: true, status: true },
          },
        },
      });

  const mobileActivity = mobileMembers
    .map((member) => {
      const activeSub = member.subscriptions[0];
      const lastCheckIn = member.checkIns[0];
      const monthlyVisits = member.checkIns.filter((entry) => entry.checkedInAt >= monthStart).length;
      const lastPayment = member.payments[0];
      const latestStat = member.bodyStats[0];
      const workoutAssignment = member.workoutAssignments[0];
      const dietAssignment = member.dietAssignments[0];
      const lastNotification = member.notificationsLog[0];

      const activityDates = [
        lastCheckIn?.checkedInAt,
        lastPayment?.paidAt,
        latestStat?.recordedAt,
        member.user.lastLoginAt ?? undefined,
        lastNotification?.createdAt,
      ].filter(Boolean) as Date[];

      return {
        memberId: member.id,
        name: member.user.name,
        memberCode: member.memberCode,
        phone: member.user.phone,
        planName: activeSub?.plan.name ?? null,
        subscriptionEndDate: activeSub?.endDate.toISOString() ?? null,
        daysRemaining: activeSub
          ? Math.max(0, Math.ceil((activeSub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null,
        lastCheckInAt: lastCheckIn?.checkedInAt.toISOString() ?? null,
        lastCheckInSource: lastCheckIn?.source ?? null,
        monthlyVisits,
        lastPaymentAt: lastPayment?.paidAt.toISOString() ?? null,
        lastPaymentAmount: lastPayment ? Number(lastPayment.totalAmount) : null,
        lastPaymentMethod: lastPayment?.paymentMethod ?? null,
        lastBodyStatAt: latestStat?.recordedAt.toISOString() ?? null,
        latestWeightKg: latestStat?.weightKg != null ? Number(latestStat.weightKg) : null,
        workoutPlanName: workoutAssignment?.workoutPlan.name ?? null,
        dietChartName: dietAssignment?.dietChart.name ?? null,
        mobileConnected: Boolean(member.user.fcmToken || member.user.lastLoginAt),
        lastLoginAt: member.user.lastLoginAt?.toISOString() ?? null,
        lastNotificationAt: lastNotification?.createdAt.toISOString() ?? null,
        lastNotificationChannel: lastNotification?.channel ?? null,
        lastNotificationStatus: lastNotification?.status ?? null,
        lastActivityAt: activityDates.length
          ? new Date(Math.max(...activityDates.map((value) => value.getTime()))).toISOString()
          : member.joinedAt.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, 8);

  return {
    stats: {
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      todayCheckIns,
      mobileCheckInsToday,
      mobileConnectedMembers,
      bodyStatsThisMonth,
      workoutAssignments,
      dietAssignments,
      overdueMembers,
      expiringSoonMembers,
      revenueThisMonth: Number(revenueThisMonthAgg._sum.totalAmount || 0),
      paymentsThisMonth: revenueThisMonthAgg._count._all,
    },
    recentCheckIns: recentCheckIns.map((entry) => ({
      id: entry.id,
      checkedInAt: entry.checkedInAt.toISOString(),
      source: entry.source,
      member: {
        id: entry.member.id,
        name: entry.member.user.name,
        avatarUrl: entry.member.user.avatarUrl,
        memberCode: entry.member.memberCode,
      },
      planName: entry.member.subscriptions[0]?.plan.name ?? null,
    })),
    recentMembers: recentJoinedMembers.map((member) => ({
      id: member.id,
      name: member.user.name,
      phone: member.user.phone,
      memberCode: member.memberCode,
      joinedAt: member.joinedAt.toISOString(),
      planName: member.subscriptions[0]?.plan.name ?? null,
      subscriptionEndDate: member.subscriptions[0]?.endDate.toISOString() ?? null,
    })),
    mobileActivity,
  };
}

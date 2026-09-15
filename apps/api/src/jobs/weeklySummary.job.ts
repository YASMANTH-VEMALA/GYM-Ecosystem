import cron from 'node-cron';
import prisma from '@gymstack/db';
import { sendOwnerSummaryEmail } from '../services/email.service';

export function startWeeklySummaryJob() {
  cron.schedule('0 8 * * 1', async () => {
    console.log('[CRON] Weekly summary email job started');
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
    const gyms = await prisma.gym.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    for (const gym of gyms) {
      try {
        const [checkIns, newMembers, due, members] = await Promise.all([
          prisma.checkIn.count({ where: { gymId: gym.id, checkedInAt: { gte: weekAgo } } }),
          prisma.member.count({ where: { gymId: gym.id, createdAt: { gte: weekAgo } } }),
          prisma.memberSubscription.count({ where: { gymId: gym.id, status: 'active', endDate: { lte: new Date(Date.now() + 7 * 86400000) } } }),
          prisma.member.findMany({ where: { gymId: gym.id, subscriptions: { some: { status: 'active', endDate: { gte: new Date() } } } }, include: { checkIns: { orderBy: { checkedInAt: 'desc' }, take: 1 } } }),
        ]);
        const inactive = members.filter((member) => !member.checkIns[0] || member.checkIns[0].checkedInAt < fiveDaysAgo).length;
        const body = `Weekly Summary for ${gym.name}\n\nCheck-ins: ${checkIns}\nNew members: ${newMembers}\nFees due or expiring: ${due}\nInactive members: ${inactive}`;
        await sendOwnerSummaryEmail(gym.id, `Weekly Summary for ${gym.name}`, body);
      } catch (error) { console.error(`[CRON] Weekly summary failed for ${gym.id}:`, (error as Error).message); }
    }
    console.log('[CRON] Weekly summary email job completed');
  }, { timezone: 'Asia/Kolkata' });
}

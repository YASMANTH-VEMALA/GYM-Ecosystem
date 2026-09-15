import cron from 'node-cron';
import prisma from '@gymstack/db';
import { sendInactivityEmail } from '../services/email.service';

export function startInactivityJob() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Inactivity email job started');
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const members = await prisma.member.findMany({
      where: { gym: { isActive: true }, subscriptions: { some: { status: 'active', endDate: { gte: new Date() } } } },
      include: { checkIns: { orderBy: { checkedInAt: 'desc' }, take: 1, select: { checkedInAt: true } } },
    });
    for (const member of members) {
      const lastVisit = member.checkIns[0]?.checkedInAt;
      if (lastVisit && lastVisit >= fiveDaysAgo) continue;
      const alreadySent = await prisma.notificationLog.findFirst({ where: { memberId: member.id, type: 'inactivity_nudge', createdAt: { gte: threeDaysAgo } } });
      if (alreadySent) continue;
      const days = lastVisit ? Math.floor((Date.now() - lastVisit.getTime()) / 86400000) : 5;
      try { await sendInactivityEmail(member.id, days); }
      catch (error) { console.error(`[CRON] Inactivity email failed for ${member.id}:`, (error as Error).message); }
    }
    console.log('[CRON] Inactivity email job completed');
  }, { timezone: 'Asia/Kolkata' });
}

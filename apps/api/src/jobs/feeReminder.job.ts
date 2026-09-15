import cron from 'node-cron';
import prisma from '@gymstack/db';
import { sendFeeReminderEmail } from '../services/email.service';

// Daily 9:00 AM IST — members with fee due in 3 days
export function startFeeReminderJob() {
    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Fee reminder job started');

        const activeGyms = await prisma.gym.findMany({ where: { isActive: true }, select: { id: true } });

        for (const gym of activeGyms) {
            try {
                const threeDaysFromNow = new Date();
                threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
                const threeDaysStart = new Date(threeDaysFromNow);
                threeDaysStart.setHours(0, 0, 0, 0);
                const threeDaysEnd = new Date(threeDaysFromNow);
                threeDaysEnd.setHours(23, 59, 59, 999);

                const expiringSubscriptions = await prisma.memberSubscription.findMany({
                    where: {
                        gymId: gym.id,
                        status: 'active',
                        endDate: { gte: threeDaysStart, lte: threeDaysEnd },
                    },
                    select: { memberId: true },
                });

                for (const sub of expiringSubscriptions) {
                    // Check if already sent today
                    const alreadySent = await prisma.notificationLog.findFirst({
                        where: {
                            memberId: sub.memberId,
                            type: 'fee_reminder',
                            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                        },
                    });

                    if (!alreadySent) {
                        try {
                            await sendFeeReminderEmail(sub.memberId);
                        } catch (err) {
                            console.error(`[CRON] Fee reminder failed for member ${sub.memberId}:`, (err as Error).message);
                        }
                    }
                }
            } catch (err) {
                console.error(`[CRON] Fee reminder failed for gym ${gym.id}:`, (err as Error).message);
            }
        }

        console.log('[CRON] Fee reminder job completed');
    }, { timezone: 'Asia/Kolkata' });
}

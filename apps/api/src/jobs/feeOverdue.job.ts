import cron from 'node-cron';
import prisma from '@gymstack/db';
import { sendFeeOverdueEmail } from '../services/email.service';

// Daily 10:00 AM IST — members with fee due today, send both WhatsApp + SMS
export function startFeeOverdueJob() {
    cron.schedule('0 10 * * *', async () => {
        console.log('[CRON] Fee overdue job started');

        const activeGyms = await prisma.gym.findMany({ where: { isActive: true }, select: { id: true } });

        for (const gym of activeGyms) {
            try {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date();
                todayEnd.setHours(23, 59, 59, 999);

                const overdueSubscriptions = await prisma.memberSubscription.findMany({
                    where: {
                        gymId: gym.id,
                        status: 'active',
                        endDate: { gte: todayStart, lte: todayEnd },
                    },
                    include: {
                        member: { include: { user: { select: { name: true, phone: true } } } },
                        plan: { select: { name: true } },
                    },
                });

                for (const sub of overdueSubscriptions) {
                    // Check if already sent today
                    const alreadySent = await prisma.notificationLog.findFirst({
                        where: {
                            memberId: sub.memberId,
                            type: 'fee_overdue',
                            createdAt: { gte: todayStart },
                        },
                    });

                    if (!alreadySent) {
                        try {
                            await sendFeeOverdueEmail(sub.memberId);
                        } catch (err) {
                            console.error(`[CRON] WhatsApp overdue failed for ${sub.memberId}:`, (err as Error).message);
                        }

                    }
                }
            } catch (err) {
                console.error(`[CRON] Fee overdue failed for gym ${gym.id}:`, (err as Error).message);
            }
        }

        console.log('[CRON] Fee overdue job completed');
    }, { timezone: 'Asia/Kolkata' });
}

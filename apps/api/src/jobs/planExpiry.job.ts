import cron from 'node-cron';
import prisma from '@gymstack/db';
import { sendPlanExpiryEmail } from '../services/email.service';

// Daily 7:00 AM IST — plan expiry warnings and auto-expire
export function startPlanExpiryJob() {
    cron.schedule('0 7 * * *', async () => {
        console.log('[CRON] Plan expiry job started');

        const activeGyms = await prisma.gym.findMany({ where: { isActive: true }, select: { id: true } });

        for (const gym of activeGyms) {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // 7-day warning
                const sevenDaysFromNow = new Date(today);
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

                const sevenDaySubs = await prisma.memberSubscription.findMany({
                    where: {
                        gymId: gym.id,
                        status: 'active',
                        endDate: {
                            gte: new Date(sevenDaysFromNow.getFullYear(), sevenDaysFromNow.getMonth(), sevenDaysFromNow.getDate()),
                            lt: new Date(sevenDaysFromNow.getFullYear(), sevenDaysFromNow.getMonth(), sevenDaysFromNow.getDate() + 1),
                        },
                    },
                    select: { memberId: true },
                });

                for (const sub of sevenDaySubs) {
                    const alreadySent = await prisma.notificationLog.findFirst({
                        where: {
                            memberId: sub.memberId,
                            type: 'plan_expiry',
                            createdAt: { gte: today },
                        },
                    });
                    if (!alreadySent) {
                        try {
                            await sendPlanExpiryEmail(sub.memberId, 7);
                        } catch (err) {
                            console.error(`[CRON] 7-day expiry notification failed:`, (err as Error).message);
                        }
                    }
                }

                // 1-day urgent warning
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const oneDaySubs = await prisma.memberSubscription.findMany({
                    where: {
                        gymId: gym.id,
                        status: 'active',
                        endDate: {
                            gte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
                            lt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1),
                        },
                    },
                    select: { memberId: true },
                });

                for (const sub of oneDaySubs) {
                    try {
                        await sendPlanExpiryEmail(sub.memberId, 1);
                    } catch (err) {
                        console.error(`[CRON] 1-day expiry notification failed:`, (err as Error).message);
                    }
                }

                // Auto-expire subscriptions that ended yesterday
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                await prisma.memberSubscription.updateMany({
                    where: {
                        gymId: gym.id,
                        status: 'active',
                        endDate: { lt: today },
                    },
                    data: { status: 'expired' },
                });
            } catch (err) {
                console.error(`[CRON] Plan expiry failed for gym ${gym.id}:`, (err as Error).message);
            }
        }

        console.log('[CRON] Plan expiry job completed');
    }, { timezone: 'Asia/Kolkata' });
}

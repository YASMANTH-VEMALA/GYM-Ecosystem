import cron from 'node-cron';
import prisma from '@gymstack/db';
import { sendBirthdayEmail } from '../services/email.service';

// Daily 8:00 AM IST — birthday wishes
export function startBirthdayJob() {
    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Birthday wish job started');

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        const activeGyms = await prisma.gym.findMany({ where: { isActive: true }, select: { id: true } });

        for (const gym of activeGyms) {
            try {
                // Find members whose birthday is today (match month + day)
                const birthdayMembers = await prisma.member.findMany({
                    where: {
                        gymId: gym.id,
                        dateOfBirth: { not: null },
                    },
                    select: { id: true, dateOfBirth: true },
                });

                const todayBirthdayMembers = birthdayMembers.filter((m) => {
                    if (!m.dateOfBirth) return false;
                    const dob = new Date(m.dateOfBirth);
                    return dob.getMonth() + 1 === currentMonth && dob.getDate() === currentDay;
                });

                for (const member of todayBirthdayMembers) {
                    // Check if already sent today
                    const alreadySent = await prisma.notificationLog.findFirst({
                        where: {
                            memberId: member.id,
                            type: 'birthday_wish',
                            createdAt: { gte: todayStart },
                        },
                    });

                    if (!alreadySent) {
                        try {
                            await sendBirthdayEmail(member.id);
                        } catch (err) {
                            console.error(`[CRON] Birthday wish failed for member ${member.id}:`, (err as Error).message);
                        }
                    }
                }
            } catch (err) {
                console.error(`[CRON] Birthday job failed for gym ${gym.id}:`, (err as Error).message);
            }
        }

        console.log('[CRON] Birthday wish job completed');
    }, { timezone: 'Asia/Kolkata' });
}

import prisma from '@gymstack/db';
import app from './app';
import { env } from './config/env';
import { startFeeReminderJob } from './jobs/feeReminder.job';
import { startFeeOverdueJob } from './jobs/feeOverdue.job';
import { startPlanExpiryJob } from './jobs/planExpiry.job';
import { startInactivityJob } from './jobs/inactivity.job';
import { startBirthdayJob } from './jobs/birthday.job';
import { startWeeklySummaryJob } from './jobs/weeklySummary.job';
import { startScheduledNotificationsJob } from './jobs/scheduledNotifications.job';

const port = env.PORT ?? env.API_PORT;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`GymStack API running on port ${port}`);

  if (env.ENABLE_CRON_JOBS) {
    startFeeReminderJob();
    startFeeOverdueJob();
    startPlanExpiryJob();
    startInactivityJob();
    startBirthdayJob();
    startWeeklySummaryJob();
    startScheduledNotificationsJob();
    console.log('All cron jobs started');
  }
});

let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

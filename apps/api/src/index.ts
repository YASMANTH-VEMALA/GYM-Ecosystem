import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import routes from './routes';
import prisma from '@gymstack/db';

// Cron jobs
import { startFeeReminderJob } from './jobs/feeReminder.job';
import { startFeeOverdueJob } from './jobs/feeOverdue.job';
import { startPlanExpiryJob } from './jobs/planExpiry.job';
import { startInactivityJob } from './jobs/inactivity.job';
import { startBirthdayJob } from './jobs/birthday.job';
import { startWeeklySummaryJob } from './jobs/weeklySummary.job';
import { startScheduledNotificationsJob } from './jobs/scheduledNotifications.job';

const app = express();
app.set('trust proxy', 1);

// Security & parsing
app.use(helmet());
app.use(cors({
  origin: [env.WEB_URL, /\.mygymapp\.in$/],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

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

export default app;

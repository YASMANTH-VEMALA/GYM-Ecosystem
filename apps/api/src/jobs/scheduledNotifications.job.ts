import cron from 'node-cron';
import { sendDueScheduledNotifications } from '../services/notification.service';

export function startScheduledNotificationsJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const result = await sendDueScheduledNotifications();
      if (result.processed > 0) {
        console.log(`[CRON] Processed ${result.processed} scheduled notification(s)`);
      }
    } catch (error) {
      console.error('[CRON] Scheduled notification job failed:', (error as Error).message);
    }
  }, { timezone: 'Asia/Kolkata' });
}

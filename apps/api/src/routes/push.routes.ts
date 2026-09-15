import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as webPushService from '../services/web-push.service';

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4000),
  keys: z.object({ p256dh: z.string().min(20).max(500), auth: z.string().min(8).max(500) }),
}).strict();
const unsubscribeSchema = z.object({ endpoint: z.string().url().max(4000) }).strict();

const router = Router();
router.use(authenticate, requireRole('member'));

router.get('/status', async (req: Request, res: Response) => {
  try {
    res.json(await webPushService.getWebPushStatus(req.user!.userId));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/subscribe', validate(subscriptionSchema), async (req: Request, res: Response) => {
  try {
    if (!webPushService.getWebPushPublicConfig().configured) {
      res.status(503).json({ error: 'Web Push is not configured on the server' });
      return;
    }
    await webPushService.saveWebPushSubscription(req.user!.userId, req.body, req.get('user-agent'));
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/subscribe', validate(unsubscribeSchema), async (req: Request, res: Response) => {
  try {
    await webPushService.removeWebPushSubscription(req.user!.userId, req.body.endpoint);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;

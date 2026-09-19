import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as notificationService from '../services/notification.service';
import { uploadAttachment } from '../services/attachment-upload.service';
import prisma from '@gymstack/db';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

const notificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  channel: z.enum(['email', 'push', 'both']),
  target: z.enum(['all', 'active', 'expiring_soon', 'overdue', 'payment_due', 'plan', 'individual', 'selected']),
  targetId: z.string().uuid().optional(),
  targetIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  theme: z.string().max(50).optional(),
  attachmentUrl: z.string().url().max(1000).optional(),
  attachmentName: z.string().max(200).optional(),
  attachmentType: z.string().max(100).optional(),
}).superRefine((value, context) => {
  if ((value.target === 'plan' || value.target === 'individual') && !value.targetId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['targetId'], message: 'targetId is required for this target' });
  }
  if (value.target === 'selected' && !value.targetIds?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['targetIds'], message: 'Select at least one member' });
  }
});

const router = Router();
router.use(authenticate, gymContext);

function requireNotificationHistoryAccess(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'manager' && req.query.memberId && req.user.portalSections.includes('members')) {
    next();
    return;
  }
  requireManagerSection('notifications')(req, res, next);
}

router.get('/me', requireRole('member'), async (req: Request, res: Response) => {
  try {
    const member = await prisma.member.findFirst({ where: { userId: req.user!.userId, gymId: req.gymId! } });
    if (!member) { res.status(404).json({ error: 'Member profile not found' }); return; }
    const result = await notificationService.getNotificationHistory(req.gymId!, {
      memberId: member.id,
      statuses: ['delivered', 'sent'],
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/recipients', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('notifications'), async (req: Request, res: Response) => {
  try {
    const recipients = await notificationService.getNotificationRecipients(req.gymId!);
    res.json({ recipients });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/', requireRole('gym_owner', 'manager', 'receptionist'), requireNotificationHistoryAccess, async (req: Request, res: Response) => {
  try {
    const result = await notificationService.getNotificationHistory(req.gymId!, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      memberId: req.query.memberId as string | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/scheduled', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('notifications'), async (req: Request, res: Response) => {
  try {
    const notifications = await notificationService.getScheduledNotifications(req.gymId!);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post(
  '/attachment',
  requireRole('gym_owner', 'manager', 'receptionist'),
  requireManagerSection('notifications'),
  (req: Request, res: Response, next: NextFunction) => {
    attachmentUpload.single('file')(req, res, (error) => {
      if (!error) { next(); return; }
      const isSizeError = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
      res.status(isSizeError ? 413 : 400).json({
        error: isSizeError ? 'Attachment must be 10 MB or smaller' : 'Could not process the uploaded file',
      });
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please select a file to upload' });
        return;
      }
      const result = await uploadAttachment(req.gymId!, req.file);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.post('/', requireRole('gym_owner', 'manager', 'receptionist'), requireManagerSection('notifications'), validate(notificationSchema), async (req: Request, res: Response) => {
  try {
    const result = await notificationService.sendNotification(req.gymId!, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

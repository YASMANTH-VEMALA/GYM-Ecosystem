import { Router } from 'express';
import authRoutes from './auth.routes';
import gymRoutes from './gym.routes';
import memberRoutes from './member.routes';
import checkinRoutes from './checkin.routes';
import paymentRoutes from './payment.routes';
import analyticsRoutes from './analytics.routes';
import staffRoutes from './staff.routes';
import notificationRoutes from './notification.routes';
import workoutRoutes from './workout.routes';
import planRoutes from './plan.routes';
import dietRoutes from './diet.routes';
import bodyStatsRoutes from './bodystats.routes';
import branchRoutes from './branch.routes';
import admissionRoutes from './admission.routes';
import organizationRoutes from './organization.routes';
import uploadRoutes from './upload.routes';
import pushRoutes from './push.routes';
import prisma from '@gymstack/db';

const router = Router();

router.use('/auth', authRoutes);
router.use('/gym', gymRoutes);
router.use('/members', memberRoutes);
router.use('/checkins', checkinRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/staff', staffRoutes);
router.use('/notifications', notificationRoutes);
router.use('/workouts', workoutRoutes);
router.use('/plans', planRoutes);
router.use('/diets', dietRoutes);
router.use('/bodystats', bodyStatsRoutes);
router.use('/branches', branchRoutes);
router.use('/admissions', admissionRoutes);
router.use('/organization', organizationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/push', pushRoutes);

// Health check
router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

export default router;

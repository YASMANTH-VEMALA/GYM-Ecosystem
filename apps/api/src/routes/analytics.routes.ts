import { Router, Request, Response } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as analyticsService from '../services/analytics.service';
import { cached } from '../utils/response-cache';

const router = Router();
router.use(authenticate, gymContext);

router.get('/dashboard', requireRole('gym_owner', 'manager', 'receptionist', 'coach'), requireManagerSection('dashboard', 'analytics'), async (req: Request, res: Response) => {
  try {
    const data = await cached(
      `dashboard:${req.gymId}`,
      () => analyticsService.getDashboardOverview(req.gymId!),
      60_000,
    );
    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/revenue', requireRole('gym_owner', 'manager'), requireManagerSection('analytics'), async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getRevenueAnalytics(req.gymId!);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/peak-hours', requireRole('gym_owner', 'manager'), requireManagerSection('analytics'), async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const data = await analyticsService.getPeakHours(req.gymId!, days);
    res.json({ hours: data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/plan-popularity', requireRole('gym_owner', 'manager'), requireManagerSection('analytics'), async (req: Request, res: Response) => {
  try {
    const data = await cached(
      `plans:${req.gymId}`,
      () => analyticsService.getPlanPopularity(req.gymId!),
      120_000,
    );
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    res.json({ plans: data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/churn-risk', requireRole('gym_owner', 'manager'), requireManagerSection('analytics'), async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getChurnRisk(req.gymId!);
    res.json({ members: data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/member-growth', requireRole('gym_owner', 'manager'), requireManagerSection('analytics'), async (req: Request, res: Response) => {
  try {
    const months = Number(req.query.months) || 12;
    const data = await cached(
      `growth:${req.gymId}:${months}`,
      () => analyticsService.getMemberGrowth(req.gymId!, months),
      120_000,
    );
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    res.json({ monthly: data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

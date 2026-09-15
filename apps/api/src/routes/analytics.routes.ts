import { Router, Request, Response } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as analyticsService from '../services/analytics.service';

const router = Router();
router.use(authenticate, gymContext);

router.get('/dashboard', requireRole('gym_owner', 'manager', 'receptionist', 'coach'), requireManagerSection('dashboard', 'analytics'), async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getDashboardOverview(req.gymId!);
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
    const data = await analyticsService.getPlanPopularity(req.gymId!);
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
    const data = await analyticsService.getMemberGrowth(req.gymId!, months);
    res.json({ monthly: data });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;

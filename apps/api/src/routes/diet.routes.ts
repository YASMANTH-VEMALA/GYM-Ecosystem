import { Router, Request, Response } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as dietService from '../services/diet.service';
import { requireString } from '../utils/request';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import prisma from '@gymstack/db';

const dietChartSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().max(2000).optional(),
  totalCalories: z.number().int().min(0).max(20000).optional(),
  isTemplate: z.boolean().optional(),
  meals: z.array(z.object({
    mealType: z.string().trim().min(1).max(30),
    mealName: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    calories: z.number().int().min(0).max(10000).optional(),
    proteinG: z.number().min(0).max(1000).optional(),
    carbsG: z.number().min(0).max(2000).optional(),
    fatG: z.number().min(0).max(1000).optional(),
    timeSuggestion: z.string().max(20).optional(),
    sortOrder: z.number().int().min(0).max(1000),
  })).min(1).max(50),
});
const duplicateSchema = z.object({ name: z.string().trim().min(2).max(200) });
const assignmentSchema = z.object({ memberIds: z.array(z.string().uuid()).min(1).max(500) });

const router = Router();
router.use(authenticate, gymContext);
router.use(requireManagerSection('diets'));

router.get('/', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const charts = await dietService.getDietCharts(req.gymId!);
    res.json({ charts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/assignments', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const assignments = await dietService.getAssignments(req.gymId!);
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/me/active', requireRole('member'), async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.memberDietAssignment.findFirst({
      where: {
        isActive: true,
        member: { userId: req.user!.userId, gymId: req.gymId! },
        dietChart: { gymId: req.gymId! },
      },
      include: { dietChart: { include: { meals: { orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { assignedAt: 'desc' },
    });
    res.json({ assignment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const chartId = requireString(req.params.id, 'id');
    const chart = await dietService.getDietChartById(chartId, req.gymId!);
    res.json({ chart });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.post('/', requireRole('gym_owner', 'manager', 'coach'), validate(dietChartSchema), async (req: Request, res: Response) => {
  try {
    const chart = await dietService.createDietChart(req.gymId!, req.user!.userId, req.body);
    res.status(201).json({ chart });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id', requireRole('gym_owner', 'manager', 'coach'), validate(dietChartSchema), async (req: Request, res: Response) => {
  try {
    const chartId = requireString(req.params.id, 'id');
    const chart = await dietService.updateDietChart(chartId, req.gymId!, req.body);
    res.json({ chart });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete('/:id', requireRole('gym_owner'), async (req: Request, res: Response) => {
  try {
    const chartId = requireString(req.params.id, 'id');
    await dietService.deleteDietChart(chartId, req.gymId!);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/duplicate', requireRole('gym_owner', 'manager', 'coach'), validate(duplicateSchema), async (req: Request, res: Response) => {
  try {
    const chartId = requireString(req.params.id, 'id');
    const chart = await dietService.duplicateDietChart(chartId, req.gymId!, req.user!.userId, req.body.name);
    res.status(201).json({ chart });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/assign', requireRole('gym_owner', 'manager', 'coach'), validate(assignmentSchema), async (req: Request, res: Response) => {
  try {
    const chartId = requireString(req.params.id, 'id');
    const assignments = await dietService.assignDietChart(chartId, req.body.memberIds, req.user!.userId, req.gymId!);
    res.status(201).json({ assignments });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

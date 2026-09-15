import { Router, Request, Response } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as planService from '../services/plan.service';
import { requireString } from '../utils/request';
import { createPlanSchema } from '@gymstack/shared';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate, gymContext);
router.use(requireManagerSection('plans'));

router.get('/', requireRole('gym_owner', 'manager', 'receptionist'), async (req: Request, res: Response) => {
  try {
    const plans = await planService.getPlans(req.gymId!);
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    const plan = await planService.getPlanById(planId, req.gymId!);
    res.json({ plan });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.post('/', requireRole('gym_owner', 'manager'), validate(createPlanSchema), async (req: Request, res: Response) => {
  try {
    const plan = await planService.createPlan(req.gymId!, req.body);
    res.status(201).json({ plan });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id', requireRole('gym_owner', 'manager'), validate(createPlanSchema.partial()), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    const plan = await planService.updatePlan(planId, req.gymId!, req.body);
    res.json({ plan });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/:id/toggle', requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    const plan = await planService.togglePlanStatus(planId, req.gymId!);
    res.json({ plan });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete('/:id', requireRole('gym_owner', 'manager'), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    await planService.deletePlan(planId, req.gymId!);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

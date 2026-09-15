import { Router, Request, Response } from 'express';
import { authenticate, requireManagerSection, requireRole } from '../middleware/auth';
import { gymContext } from '../middleware/gym-context';
import * as workoutService from '../services/workout.service';
import { asString, requireString } from '../utils/request';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import prisma from '@gymstack/db';

const workoutPlanSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().max(2000).optional(),
  isTemplate: z.boolean().optional(),
  days: z.array(z.object({
    dayNumber: z.number().int().min(1).max(31),
    dayName: z.string().max(50).optional(),
    exercises: z.array(z.object({
      exerciseId: z.string().uuid(),
      sets: z.number().int().min(1).max(100),
      reps: z.string().trim().min(1).max(20),
      restSeconds: z.number().int().min(0).max(3600).optional(),
      notes: z.string().max(1000).optional(),
    })).max(100),
  })).min(1).max(31),
});
const assignmentSchema = z.object({ memberIds: z.array(z.string().uuid()).min(1).max(500) });

const router = Router();
router.use(authenticate, gymContext);
router.use(requireManagerSection('workouts'));

router.get('/', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const plans = await workoutService.getWorkoutPlans(req.gymId!);
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/exercises', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const exercises = await workoutService.getExercises(asString(req.query.search), asString(req.query.muscleGroup));
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/assignments', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const assignments = await workoutService.getAssignments(req.gymId!);
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/me/active', requireRole('member'), async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.memberWorkoutAssignment.findFirst({
      where: {
        isActive: true,
        member: { userId: req.user!.userId, gymId: req.gymId! },
        workoutPlan: { gymId: req.gymId! },
      },
      include: {
        workoutPlan: {
          include: {
            days: {
              orderBy: { sortOrder: 'asc' },
              include: { exercises: { orderBy: { sortOrder: 'asc' }, include: { exercise: true } } },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    res.json({ assignment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', requireRole('gym_owner', 'manager', 'coach'), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    const plan = await workoutService.getWorkoutPlanById(planId, req.gymId!);
    res.json({ plan });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

router.post('/', requireRole('gym_owner', 'manager', 'coach'), validate(workoutPlanSchema), async (req: Request, res: Response) => {
  try {
    const plan = await workoutService.createWorkoutPlan(req.gymId!, req.user!.userId, req.body);
    res.status(201).json({ plan });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id', requireRole('gym_owner', 'manager', 'coach'), validate(workoutPlanSchema), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    const plan = await workoutService.updateWorkoutPlan(planId, req.gymId!, req.body);
    res.json({ plan });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete('/:id', requireRole('gym_owner'), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    await workoutService.deleteWorkoutPlan(planId, req.gymId!);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/:id/assign', requireRole('gym_owner', 'manager', 'coach'), validate(assignmentSchema), async (req: Request, res: Response) => {
  try {
    const planId = requireString(req.params.id, 'id');
    const assignments = await workoutService.assignWorkoutPlan(
      planId,
      req.body.memberIds,
      req.user!.userId,
      req.gymId!,
    );
    res.status(201).json({ assignments });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

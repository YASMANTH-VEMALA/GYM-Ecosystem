import prisma from '@gymstack/db';
import { Prisma } from '@gymstack/db';

export async function getWorkoutPlans(gymId: string) {
  const plans = await prisma.workoutPlan.findMany({
    where: { gymId },
    include: {
      days: {
        orderBy: { sortOrder: 'asc' },
        include: {
          exercises: {
            orderBy: { sortOrder: 'asc' },
            include: { exercise: true },
          },
        },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return plans;
}

export async function getWorkoutPlanById(id: string, gymId: string) {
  const plan = await prisma.workoutPlan.findFirst({
    where: { id, gymId },
    include: {
      days: {
        orderBy: { sortOrder: 'asc' },
        include: {
          exercises: {
            orderBy: { sortOrder: 'asc' },
            include: { exercise: true },
          },
        },
      },
      assignments: {
        include: {
          member: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!plan) throw new Error('Workout plan not found');

  return plan;
}

export async function createWorkoutPlan(gymId: string, userId: string, data: {
  name: string;
  description?: string;
  isTemplate?: boolean;
  days: {
    dayNumber: number;
    dayName?: string;
    exercises: {
      exerciseId: string;
      sets: number;
      reps: string;
      restSeconds?: number;
      notes?: string;
    }[];
  }[];
}) {
  const plan = await prisma.workoutPlan.create({
    data: {
      gymId,
      createdBy: userId,
      name: data.name,
      description: data.description,
      isTemplate: data.isTemplate ?? false,
      days: {
        create: data.days.map((day, dayIndex) => ({
          dayNumber: day.dayNumber,
          dayName: day.dayName,
          sortOrder: dayIndex,
          exercises: {
            create: day.exercises.map((ex, exIndex) => ({
              exerciseId: ex.exerciseId,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds ?? 60,
              notes: ex.notes,
              sortOrder: exIndex,
            })),
          },
        })),
      },
    },
    include: {
      days: {
        orderBy: { sortOrder: 'asc' },
        include: {
          exercises: {
            orderBy: { sortOrder: 'asc' },
            include: { exercise: true },
          },
        },
      },
    },
  });

  return plan;
}

export async function updateWorkoutPlan(id: string, gymId: string, data: {
  name: string;
  description?: string;
  isTemplate?: boolean;
  days: {
    dayNumber: number;
    dayName?: string;
    exercises: {
      exerciseId: string;
      sets: number;
      reps: string;
      restSeconds?: number;
      notes?: string;
    }[];
  }[];
}) {
  const existing = await prisma.workoutPlan.findFirst({ where: { id, gymId } });
  if (!existing) throw new Error('Workout plan not found');

  return prisma.$transaction(async (tx) => {
    await tx.workoutPlanDay.deleteMany({ where: { workoutPlanId: id } });
    return tx.workoutPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isTemplate: data.isTemplate ?? existing.isTemplate,
        days: {
          create: data.days.map((day, dayIndex) => ({
            dayNumber: day.dayNumber,
            dayName: day.dayName,
            sortOrder: dayIndex,
            exercises: {
              create: day.exercises.map((ex, exIndex) => ({
                exerciseId: ex.exerciseId,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.restSeconds ?? 60,
                notes: ex.notes,
                sortOrder: exIndex,
              })),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { sortOrder: 'asc' },
          include: {
            exercises: {
              orderBy: { sortOrder: 'asc' },
              include: { exercise: true },
            },
          },
        },
      },
    });
  });
}

export async function deleteWorkoutPlan(id: string, gymId: string) {
  const plan = await prisma.workoutPlan.findFirst({ where: { id, gymId } });
  if (!plan) throw new Error('Workout plan not found');

  await prisma.workoutPlan.delete({ where: { id } });
  return true;
}

export async function assignWorkoutPlan(workoutPlanId: string, memberIds: string[], assignedBy: string, gymId: string) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) throw new Error('Select at least one member');
  const uniqueMemberIds = [...new Set(memberIds)];
  const [plan, memberCount] = await Promise.all([
    prisma.workoutPlan.findFirst({ where: { id: workoutPlanId, gymId }, select: { id: true } }),
    prisma.member.count({ where: { id: { in: uniqueMemberIds }, gymId } }),
  ]);
  if (!plan) throw new Error('Workout plan not found');
  if (memberCount !== uniqueMemberIds.length) throw new Error('One or more members do not belong to this gym');

  return prisma.$transaction(async (tx) => {
    await tx.memberWorkoutAssignment.updateMany({
      where: { memberId: { in: uniqueMemberIds }, isActive: true },
      data: { isActive: false },
    });
    return Promise.all(uniqueMemberIds.map((memberId) => tx.memberWorkoutAssignment.create({
      data: { memberId, workoutPlanId, assignedBy, isActive: true },
    })));
  });
}

export async function getExercises(search?: string, muscleGroup?: string) {
  const where: Prisma.ExerciseWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { nameHi: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (muscleGroup) {
    where.muscleGroup = muscleGroup;
  }

  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return exercises;
}

export async function getAssignments(gymId: string) {
  const assignments = await prisma.memberWorkoutAssignment.findMany({
    where: {
      isActive: true,
      workoutPlan: { gymId },
    },
    include: {
      member: {
        include: { user: { select: { name: true } } },
      },
      workoutPlan: { select: { name: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments;
}

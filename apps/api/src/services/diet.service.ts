import prisma from '@gymstack/db';

export async function getDietCharts(gymId: string) {
  const charts = await prisma.dietChart.findMany({
    where: { gymId },
    include: {
      meals: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return charts;
}

export async function getDietChartById(id: string, gymId: string) {
  const chart = await prisma.dietChart.findFirst({
    where: { id, gymId },
    include: {
      meals: { orderBy: { sortOrder: 'asc' } },
      assignments: {
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!chart) throw new Error('Diet chart not found');

  return chart;
}

export async function createDietChart(gymId: string, userId: string, data: {
  name: string;
  description?: string;
  totalCalories?: number;
  isTemplate?: boolean;
  meals: {
    mealType: string;
    mealName: string;
    description?: string;
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    timeSuggestion?: string;
    sortOrder: number;
  }[];
}) {
  const chart = await prisma.dietChart.create({
    data: {
      gymId,
      createdBy: userId,
      name: data.name,
      description: data.description,
      totalCalories: data.totalCalories,
      isTemplate: data.isTemplate ?? false,
      meals: {
        create: data.meals.map((meal) => ({
          mealType: meal.mealType,
          mealName: meal.mealName,
          description: meal.description,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
          timeSuggestion: meal.timeSuggestion,
          sortOrder: meal.sortOrder,
        })),
      },
    },
    include: {
      meals: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return chart;
}

export async function updateDietChart(id: string, gymId: string, data: {
  name: string;
  description?: string;
  totalCalories?: number;
  isTemplate?: boolean;
  meals: {
    mealType: string;
    mealName: string;
    description?: string;
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    timeSuggestion?: string;
    sortOrder: number;
  }[];
}) {
  const existing = await prisma.dietChart.findFirst({ where: { id, gymId } });
  if (!existing) throw new Error('Diet chart not found');

  const chart = await prisma.$transaction(async (tx) => {
    // Delete existing meals and recreate
    await tx.dietMeal.deleteMany({ where: { dietChartId: id } });

    const updated = await tx.dietChart.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        totalCalories: data.totalCalories,
        isTemplate: data.isTemplate,
        meals: {
          create: data.meals.map((meal) => ({
            mealType: meal.mealType,
            mealName: meal.mealName,
            description: meal.description,
            calories: meal.calories,
            proteinG: meal.proteinG,
            carbsG: meal.carbsG,
            fatG: meal.fatG,
            timeSuggestion: meal.timeSuggestion,
            sortOrder: meal.sortOrder,
          })),
        },
      },
      include: {
        meals: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return updated;
  });

  return chart;
}

export async function deleteDietChart(id: string, gymId: string) {
  const chart = await prisma.dietChart.findFirst({ where: { id, gymId } });
  if (!chart) throw new Error('Diet chart not found');

  await prisma.dietChart.delete({ where: { id } });
  return true;
}

export async function duplicateDietChart(id: string, gymId: string, userId: string, newName: string) {
  const original = await prisma.dietChart.findFirst({
    where: { id, gymId },
    include: { meals: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!original) throw new Error('Diet chart not found');

  const duplicate = await prisma.dietChart.create({
    data: {
      gymId,
      createdBy: userId,
      name: newName,
      description: original.description,
      totalCalories: original.totalCalories,
      isTemplate: original.isTemplate,
      meals: {
        create: original.meals.map((meal) => ({
          mealType: meal.mealType,
          mealName: meal.mealName,
          description: meal.description,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
          timeSuggestion: meal.timeSuggestion,
          sortOrder: meal.sortOrder,
        })),
      },
    },
    include: {
      meals: { orderBy: { sortOrder: 'asc' } },
    },
  });

  return duplicate;
}

export async function assignDietChart(dietChartId: string, memberIds: string[], assignedBy: string, gymId: string) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) throw new Error('Select at least one member');
  const uniqueMemberIds = [...new Set(memberIds)];
  const [chart, memberCount] = await Promise.all([
    prisma.dietChart.findFirst({ where: { id: dietChartId, gymId }, select: { id: true } }),
    prisma.member.count({ where: { id: { in: uniqueMemberIds }, gymId } }),
  ]);
  if (!chart) throw new Error('Diet chart not found');
  if (memberCount !== uniqueMemberIds.length) throw new Error('One or more members do not belong to this gym');

  await prisma.$transaction(async (tx) => {
    // Deactivate existing active diet assignments for these members
    await tx.memberDietAssignment.updateMany({
      where: {
        memberId: { in: uniqueMemberIds },
        isActive: true,
      },
      data: { isActive: false },
    });

    // Create new assignments
    await tx.memberDietAssignment.createMany({
      data: uniqueMemberIds.map((memberId) => ({
        memberId,
        dietChartId,
        assignedBy,
        isActive: true,
      })),
    });
  });

  // Return the newly created assignments
  const assignments = await prisma.memberDietAssignment.findMany({
    where: { dietChartId, memberId: { in: uniqueMemberIds }, isActive: true },
    include: {
      member: { include: { user: { select: { name: true } } } },
      dietChart: { select: { name: true } },
    },
  });

  return assignments;
}

export async function getAssignments(gymId: string) {
  const assignments = await prisma.memberDietAssignment.findMany({
    where: {
      isActive: true,
      dietChart: { gymId },
    },
    include: {
      member: { include: { user: { select: { name: true } } } },
      dietChart: { select: { name: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments;
}

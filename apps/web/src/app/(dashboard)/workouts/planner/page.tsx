'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Brain, CalendarDays, Sparkles, TriangleAlert } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';

type WorkoutPlanSummary = {
  id: string;
  name: string;
  _count: { assignments: number };
  days: { id: string; dayNumber: number; exercises: { id: string }[] }[];
};

export default function CoachWorkoutPlannerPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['workout-plans'],
    queryFn: () => apiClient.get('/workouts').then((r) => r.data.plans as WorkoutPlanSummary[]),
  });

  const sortedPlans = [...(plans || [])].sort((a, b) => b._count.assignments - a._count.assignments);
  const highLoad = sortedPlans.filter((p) => p._count.assignments > 20);
  const lowExerciseDensity = sortedPlans.filter((p) => {
    const totalExercises = p.days.reduce((sum, d) => sum + d.exercises.length, 0);
    return totalExercises > 0 && totalExercises / Math.max(1, p.days.length) < 3;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h1 className="text-page-title text-text-primary">Coach&apos;s Workout Planner</h1>
          <p className="text-body text-text-secondary mt-2 max-w-3xl">
            Planning surface for weekly load balancing, class density, and plan refinement.
          </p>
        </div>
        <Link href="/workouts" className="btn btn-primary">
          Open Workout Library
          <ArrowRight size={16} strokeWidth={1.5} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-between-cards">
        <div className="card border-l-4 border-l-danger">
          <div className="flex items-start justify-between">
            <p className="text-caption uppercase tracking-[0.14em] text-text-muted">Attendance Alerts</p>
            <TriangleAlert size={18} className="text-danger" />
          </div>
          <p className="text-page-title mt-3 text-text-primary">{highLoad.length}</p>
          <p className="text-caption text-text-secondary mt-2">Plans with high assignment load</p>
        </div>

        <div className="card border-l-4 border-l-info">
          <div className="flex items-start justify-between">
            <p className="text-caption uppercase tracking-[0.14em] text-text-muted">Suggestion Engine</p>
            <Brain size={18} className="text-info" />
          </div>
          <p className="text-page-title mt-3 text-text-primary">{lowExerciseDensity.length}</p>
          <p className="text-caption text-text-secondary mt-2">Plans that need denser exercise blocks</p>
        </div>

        <div className="card border-l-4 border-l-success">
          <div className="flex items-start justify-between">
            <p className="text-caption uppercase tracking-[0.14em] text-text-muted">Active Plans</p>
            <CalendarDays size={18} className="text-success" />
          </div>
          <p className="text-page-title mt-3 text-text-primary">{sortedPlans.length}</p>
          <p className="text-caption text-text-secondary mt-2">Current templates and assigned routines</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-card-pad py-4 border-b border-divider flex items-center justify-between">
          <h2 className="text-section-heading text-text-primary">Athlete Suggestion Queue</h2>
          <Badge variant="info">Coach view</Badge>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : sortedPlans.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <th className="table-header text-left">Plan</th>
                  <th className="table-header text-left">Assignments</th>
                  <th className="table-header text-left">Days</th>
                  <th className="table-header text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan) => {
                  const totalExercises = plan.days.reduce((sum, d) => sum + d.exercises.length, 0);
                  const intensity = totalExercises / Math.max(1, plan.days.length);
                  const variant = intensity < 3 ? 'expiring' : intensity > 6 ? 'overdue' : 'active';
                  return (
                    <tr key={plan.id} className="table-row">
                      <td className="px-4 text-table-row font-medium text-text-primary">{plan.name}</td>
                      <td className="px-4 text-table-row font-mono text-text-secondary">{plan._count.assignments}</td>
                      <td className="px-4 text-table-row text-text-secondary">{plan.days.length} day blocks</td>
                      <td className="px-4">
                        <div className="flex items-center gap-3">
                          <Badge variant={variant}>{intensity.toFixed(1)} ex/day</Badge>
                          <Link href="/workouts" className="text-badge text-primary hover:underline inline-flex items-center gap-1">
                            Refine
                            <Sparkles size={12} strokeWidth={1.5} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Brain}
            title="No plans available"
            description="Create workout plans first to unlock coach recommendations"
          />
        )}
      </div>
    </div>
  );
}

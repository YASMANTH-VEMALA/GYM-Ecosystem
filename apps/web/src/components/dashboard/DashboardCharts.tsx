'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type Growth = { month: string; newMembers: number; totalMembers: number };
export type PlanPopularity = { planId: string; planName: string; count: number; revenue: number };

interface DashboardChartsProps {
  growth: Growth[];
  plans: PlanPopularity[];
  colors: string[];
}

export default function DashboardCharts({ growth, plans, colors }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-between-cards">
      <div className="xl:col-span-2 card">
        <h2 className="text-section-heading">Member Growth</h2>
        <p className="text-caption text-text-muted mt-1 mb-5">Last six months</p>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growth}>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="totalMembers" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h2 className="text-section-heading">Plan Distribution</h2>
        <p className="text-caption text-text-muted mt-1">Active subscriptions</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={plans}
                dataKey="count"
                nameKey="planName"
                innerRadius={45}
                outerRadius={75}
                stroke="none"
              >
                {plans.map((plan, index) => (
                  <Cell key={plan.planId} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2 mt-4">
          {plans.map((plan, index) => (
            <div key={plan.planId} className="flex justify-between text-table-row">
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="truncate">{plan.planName}</span>
              </span>
              <span className="font-mono">{plan.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

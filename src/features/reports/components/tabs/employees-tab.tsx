'use client';

/**
 * Employees Tab — productivity table + workload + status breakdown.
 *
 * Extracted from src/components/views/reports-view.tsx (Phase 6C1).
 *
 * Receives the employee productivity query as a prop and computes its own
 * derived data via useMemo. Does NOT re-fetch.
 */

import { useMemo } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import {
  Star, UserCheck, Briefcase, CheckCircle2, Clock, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { StatCard } from '@/components/shared/stat-card';
import { ChartSkeleton, KpiSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, getInitials } from '@/lib/format-utils';
import type {
  EmployeeProductivityResponse, WorkloadDatum,
} from '../../types';
import { workloadConfig } from '../../utils/report-helpers';
import { EmptyHint } from '../report-shared';

interface EmployeesTabProps {
  employeeQuery: UseQueryResult<EmployeeProductivityResponse>;
}

export function EmployeesTab({ employeeQuery }: EmployeesTabProps) {
  const employees = employeeQuery.data?.employees ?? [];

  // ─── Derived ─────────────────────────────────────────────────────
  const employeeStatusCounts = useMemo(() => {
    const counts = { available: 0, busy: 0, offline: 0 };
    for (const emp of employees) {
      const s = (emp.status || '').toLowerCase();
      if (s === 'available' || s === 'active' || s === 'online') counts.available++;
      else if (s === 'busy' || s === 'on_job' || s === 'assigned') counts.busy++;
      else counts.offline++;
    }
    return counts;
  }, [employees]);

  const topPerformer = useMemo(() => {
    if (employees.length === 0) return null;
    return employees.reduce(
      (best, emp) => (emp.totalCompletedJobs > best.totalCompletedJobs ? emp : best),
      employees[0],
    );
  }, [employees]);

  const totalCompletedJobs = employees.reduce((s, e) => s + e.totalCompletedJobs, 0);
  const totalCompletedInPeriod = employees.reduce((s, e) => s + e.completedInPeriod, 0);

  const workloadData = useMemo<WorkloadDatum[]>(() => {
    return employees
      .map(e => ({
        name: getInitials(e.name) || e.name.slice(0, 6),
        fullName: e.name,
        jobs: e.completedInPeriod,
      }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 8);
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Employee stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {employeeQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Top Performer"
              value={topPerformer ? topPerformer.name : 'N/A'}
              icon={Star}
              iconBg="bg-amber-50"
              color="text-amber-600"
              sub={topPerformer ? `${topPerformer.totalCompletedJobs} jobs · ${topPerformer.rating > 0 ? topPerformer.rating.toFixed(1) + '★' : 'No rating'}` : 'No employees yet'}
            />
            <StatCard
              label="Team Utilization"
              value={employees.length > 0 ? `${Math.round(((employeeStatusCounts.available + employeeStatusCounts.busy) / employees.length) * 100)}%` : '—'}
              icon={UserCheck}
              iconBg="bg-emerald-50"
              color="text-emerald-600"
              sub={`${employeeStatusCounts.available} available · ${employeeStatusCounts.busy} busy`}
            />
            <StatCard
              label="Jobs Completed"
              value={formatNumber(totalCompletedInPeriod)}
              icon={Briefcase}
              iconBg="bg-teal-50"
              color="text-teal-600"
              sub={`${totalCompletedJobs} all-time`}
            />
          </>
        )}
      </div>

      {/* Employee Productivity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Productivity</CardTitle>
          <CardDescription>Individual performance metrics and workload</CardDescription>
        </CardHeader>
        <CardContent>
          {employeeQuery.isLoading ? (
            <TableSkeleton />
          ) : employeeQuery.isError ? (
            <ErrorState onRetry={() => employeeQuery.refetch()} />
          ) : employees.length === 0 ? (
            <EmptyHint message="No employees found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Completed (period)</TableHead>
                    <TableHead className="text-right">Total Completed</TableHead>
                    <TableHead className="text-right">Avg Rating</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const statusLower = (emp.status || '').toLowerCase();
                    const statusLabel = statusLower === 'available' || statusLower === 'active' || statusLower === 'online'
                      ? 'available'
                      : statusLower === 'busy' || statusLower === 'on_job' || statusLower === 'assigned'
                      ? 'busy'
                      : 'offline';
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs">
                              {getInitials(emp.name) || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{emp.name}</div>
                              {emp.role && <div className="text-xs text-muted-foreground">{emp.role}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{emp.completedInPeriod}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{emp.totalCompletedJobs}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="size-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-medium">
                              {emp.rating > 0 ? emp.rating.toFixed(1) : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusLabel === 'available' ? 'default' : statusLabel === 'busy' ? 'secondary' : 'outline'}
                            className={
                              statusLabel === 'available'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : statusLabel === 'busy'
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workload Distribution + Employee Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload Distribution</CardTitle>
            <CardDescription>Completed jobs per employee this period</CardDescription>
          </CardHeader>
          <CardContent>
            {employeeQuery.isLoading ? (
              <ChartSkeleton />
            ) : employeeQuery.isError ? (
              <ErrorState onRetry={() => employeeQuery.refetch()} />
            ) : workloadData.length === 0 || workloadData.every(w => w.jobs === 0) ? (
              <EmptyHint message="No completed jobs in this period" />
            ) : (
              <ChartContainer config={workloadConfig} className="h-[280px] w-full aspect-auto">
                <BarChart data={workloadData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value: number) => [`${value} jobs`, 'Completed']} />}
                  />
                  <Bar
                    dataKey="jobs"
                    fill="var(--color-jobs)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Employee Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Status Breakdown</CardTitle>
            <CardDescription>Current availability across the team</CardDescription>
          </CardHeader>
          <CardContent>
            {employeeQuery.isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : employeeQuery.isError ? (
              <ErrorState onRetry={() => employeeQuery.refetch()} />
            ) : employees.length === 0 ? (
              <EmptyHint message="No employees to display" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Available</span>
                      <span className="text-lg font-bold text-emerald-700">{employeeStatusCounts.available}</span>
                    </div>
                    <div className="h-2 bg-emerald-100 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(employeeStatusCounts.available / employees.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50/60 border border-amber-100">
                  <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="size-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Busy</span>
                      <span className="text-lg font-bold text-amber-700">{employeeStatusCounts.busy}</span>
                    </div>
                    <div className="h-2 bg-amber-100 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(employeeStatusCounts.busy / employees.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50/60 border border-gray-200">
                  <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="size-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Offline</span>
                      <span className="text-lg font-bold text-gray-500">{employeeStatusCounts.offline}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full"
                        style={{ width: `${(employeeStatusCounts.offline / employees.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

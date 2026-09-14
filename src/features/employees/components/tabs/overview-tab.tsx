'use client';

/**
 * Overview Tab — employee profile summary.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, CheckCircle2, Star, Coins, UserCheck, Phone, Mail,
  MapPin, MessageSquare, Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCompanyCurrency } from '@/hooks/use-company-currency';
import { authFetch } from '@/lib/client-auth';
import { formatDate, timeAgo } from '@/lib/format-utils';
import type { Employee, PerformanceResponse } from '../../types';
import { apiUrl, getStatusColor } from '../../utils/employee-helpers';

export function OverviewTab({ employee }: { employee: Employee }) {
  const { currency, format } = useCompanyCurrency();
  let skills: string[] = [];
  try {
    const parsed = JSON.parse(employee.skills || '[]');
    if (Array.isArray(parsed)) skills = parsed;
  } catch { /* ignore */ }

  // Quick stats — fetch performance metrics (weekly) for the overview.
  const { data: perfData, isLoading: perfLoading } = useQuery<PerformanceResponse>({
    queryKey: ['employee-performance-overview', employee.id],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employee.id}/performance?period=weekly`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const metrics = perfData?.metrics;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-7 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center">
                <Briefcase className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Jobs</span>
            </div>
            <p className="text-2xl font-bold">{employee.completedJobs || 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">completed lifetime</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-7 rounded-lg bg-teal-100/80 dark:bg-teal-950/40 flex items-center justify-center">
                <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Completion</span>
            </div>
            <p className="text-2xl font-bold">
              {perfLoading ? '—' : metrics && metrics.jobsAssigned > 0
                ? `${Math.round((metrics.jobsCompleted / metrics.jobsAssigned) * 100)}%`
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {perfLoading ? '' : metrics ? `${metrics.jobsCompleted}/${metrics.jobsAssigned} this week` : 'no weekly data'}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-7 rounded-lg bg-amber-100/80 dark:bg-amber-950/40 flex items-center justify-center">
                <Star className="size-3.5 text-amber-500 fill-amber-500" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Rating</span>
            </div>
            <p className="text-2xl font-bold">{employee.rating > 0 ? employee.rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">average rating (5.0 max)</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-7 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center">
                <Coins className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue</span>
            </div>
            <p className="text-2xl font-bold">
              {perfLoading ? '—' : metrics ? format(metrics.revenueGenerated, currency) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">generated this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact Info */}
        <Card className="lg:col-span-1 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-600" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate font-medium">{employee.phone || 'No phone provided'}</span>
            </div>
            {employee.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{employee.email}</span>
              </div>
            )}
            {employee.location && (
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{employee.location}</span>
              </div>
            )}
            {employee.whatsappId && (
              <div className="flex items-center gap-2.5 text-sm">
                <MessageSquare className="size-4 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{employee.whatsappId}</span>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <p className="text-muted-foreground font-medium">Joined Organization</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(employee.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Last Active</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{employee.lastSeenAt ? timeAgo(employee.lastSeenAt) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills & Role Details */}
        <Card className="lg:col-span-2 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="size-4 text-emerald-600" /> Skills & Role Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Skills & Specializations</p>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No specialized skills listed.</p>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-[11px] text-muted-foreground font-medium">Assigned Role</p>
                <p className="text-sm font-bold capitalize mt-0.5 text-slate-900 dark:text-slate-100">{employee.role}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-[11px] text-muted-foreground font-medium">Current Status</p>
                <Badge variant="outline" className={`text-[10px] font-semibold mt-1 ${getStatusColor(employee.status)}`}>
                  {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-[11px] text-muted-foreground font-medium">Rating Score</p>
                <p className="text-sm font-bold mt-0.5 text-slate-900 dark:text-slate-100">{employee.rating > 0 ? `${employee.rating.toFixed(1)} / 5.0` : '—'}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-[11px] text-muted-foreground font-medium">Completed Jobs</p>
                <p className="text-sm font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{employee.completedJobs || 0} jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


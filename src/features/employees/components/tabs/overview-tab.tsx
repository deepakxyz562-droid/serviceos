'use client';

/**
 * Overview Tab — employee profile summary.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, CheckCircle2, Star, IndianRupee, UserCheck, Phone, Mail,
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="size-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Jobs</span>
            </div>
            <p className="text-2xl font-bold">{employee.completedJobs}</p>
            <p className="text-[10px] text-muted-foreground">completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Completion</span>
            </div>
            <p className="text-2xl font-bold">
              {perfLoading ? '—' : metrics && metrics.jobsAssigned > 0
                ? `${Math.round((metrics.jobsCompleted / metrics.jobsAssigned) * 100)}%`
                : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {perfLoading ? '' : metrics ? `${metrics.jobsCompleted}/${metrics.jobsAssigned}` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="size-3.5 text-amber-500" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Rating</span>
            </div>
            <p className="text-2xl font-bold">{employee.rating > 0 ? employee.rating.toFixed(1) : '—'}</p>
            <p className="text-[10px] text-muted-foreground">avg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="size-3.5 text-emerald-600" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Month</span>
            </div>
            <p className="text-2xl font-bold">
              {perfLoading ? '—' : metrics ? format(metrics.revenueGenerated, currency) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-600" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{employee.phone}</span>
            </div>
            {employee.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.location}</span>
              </div>
            )}
            {employee.whatsappId && (
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{employee.whatsappId}</span>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(employee.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Seen</p>
                <p className="font-medium">{employee.lastSeenAt ? timeAgo(employee.lastSeenAt) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="size-4 text-emerald-600" /> Skills & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Skills</p>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed.</p>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">{employee.role}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className={`text-[10px] mt-0.5 ${getStatusColor(employee.status)}`}>
                  {employee.status === 'busy' ? 'on job' : employee.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="text-sm font-medium">{employee.rating > 0 ? employee.rating.toFixed(1) : '—'} / 5</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-medium">{employee.completedJobs} jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


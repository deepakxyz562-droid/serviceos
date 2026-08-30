'use client';

/**
 * Jobs Tab — list of jobs assigned to the employee.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useQuery } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authFetch } from '@/lib/client-auth';
import { formatDate } from '@/lib/format-utils';
import type { EmployeeJob } from '../../types';
import { apiUrl, jobStatusBadgeClass } from '../../utils/employee-helpers';
import { EmptyState } from '../employee-shared';

export function JobsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery<{ employee: { id: string; name: string; status: string }; jobs: EmployeeJob[] }>({
    queryKey: ['employee-jobs', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/employees/${employeeId}/jobs`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const jobs = data?.jobs ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs assigned"
        description="This employee has not been assigned any jobs yet."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Briefcase className="size-4 text-emerald-600" /> Assigned Jobs
        </CardTitle>
        <CardDescription className="text-xs">{jobs.length} job{jobs.length === 1 ? '' : 's'} total</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-32">Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate max-w-[200px]">{job.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {job.jobNumber ? `${job.jobNumber} · ` : ''}
                        {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                    {job.customer?.name || job.customerName || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(job.status))}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {job.scheduledAt ? formatDate(job.scheduledAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

/**
 * CompletedTodayCard — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Collapsible card listing the jobs the employee finished today (filtered by
 * `completedAt >= start-of-day` by the parent). The parent owns the expanded
 * state and the list of jobs; this component is presentational.
 */

import { CheckCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTime } from '@/lib/format-utils';
import type { Job } from '@/features/employee-portal/types';

export interface CompletedTodayCardProps {
  jobs: Job[];
  expanded: boolean;
  onToggle: () => void;
}

export function CompletedTodayCard({ jobs, expanded, onToggle }: CompletedTodayCardProps) {
  return (
    <Card className="shadow-sm">
      <button className="w-full text-left" onClick={onToggle}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-slate-600 flex items-center justify-center">
                <CheckCircle className="size-3.5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Completed Today</CardTitle>
                <CardDescription className="text-xs">
                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} finished today
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{jobs.length}</Badge>
              {expanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
      </button>
      {expanded && (
        <CardContent className="pt-3">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <CheckCircle className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No jobs completed today yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{job.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {job.customerName && <span className="truncate">{job.customerName}</span>}
                        {job.completedAt && (
                          <span>&middot; {formatTime(job.completedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] shrink-0"
                  >
                    Done
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

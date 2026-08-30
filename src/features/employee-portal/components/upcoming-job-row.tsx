'use client';

/**
 * UpcomingJobRow — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Compact row used inside the collapsible "Upcoming Jobs" card. Shows the job
 * title, priority dot, scheduled date/time, and customer name, with a
 * Navigate button on the right.
 */

import { Calendar, Navigation, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatTime } from '@/lib/format-utils';
import { PRIORITY_DOTS } from '@/features/employee-portal/utils/portal-helpers';
import type { Job } from '@/features/employee-portal/types';

export interface UpcomingJobRowProps {
  job: Job;
  onOpenNav: (job: Job) => void;
}

export function UpcomingJobRow({ job, onOpenNav }: UpcomingJobRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full shrink-0 ${PRIORITY_DOTS[job.priority] || PRIORITY_DOTS.medium}`} />
          <span className="font-medium text-sm truncate">{job.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {job.scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDate(job.scheduledAt)} {formatTime(job.scheduledAt)}
            </span>
          )}
          {job.customerName && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {job.customerName}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-9 shrink-0 ml-2"
        onClick={() => onOpenNav(job)}
      >
        <Navigation className="size-3.5" />
      </Button>
    </div>
  );
}

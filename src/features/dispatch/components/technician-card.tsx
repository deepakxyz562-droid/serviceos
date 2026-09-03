'use client';

/**
 * TechnicianCard — Rich Operational Technician Card
 * ----------------------------------------------------
 * Clear visual hierarchy separating:
 *   1. Employee State (Available / On Job / En Route / Off Duty)
 *   2. GPS Freshness (Live / Recent / Stale / Unavailable)
 *   3. Current / Next Scheduled Job
 *   4. Quick Action Buttons
 */

import {
  MapPin,
  Star,
  Activity,
  CheckCircle2,
  Navigation,
  Clock,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getEmployeeStatusDot,
  getEmployeeStatusBg,
  formatTime,
} from '@/features/dispatch/utils/dispatch-helpers';
import { getGpsStatusInfo } from '@/features/dispatch/utils/gps-status';
import type { Employee, Job } from '@/features/dispatch/types';

export interface TechnicianCardProps {
  employee: Employee;
  activeJobs: Job[];
  isSelected: boolean;
  onSelect: (techId: string) => void;
  onAssignJob?: (techId: string) => void;
}

export function TechnicianCard({
  employee: e,
  activeJobs,
  isSelected,
  onSelect,
  onAssignJob,
}: TechnicianCardProps) {
  const gpsInfo = getGpsStatusInfo(e);
  const currentJob = activeJobs[0];
  const activeCount = activeJobs.length;
  const hasRating = typeof e.rating === 'number' && e.rating > 0;

  // Determine operational activity description
  let activitySnippet: React.ReactNode = null;
  if (currentJob) {
    activitySnippet = (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md mt-1.5">
        <Briefcase className="size-3 text-teal-600 shrink-0" />
        <span className="truncate font-medium text-foreground">
          {currentJob.title}
        </span>
        {currentJob.scheduledAt && (
          <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
            {formatTime(currentJob.scheduledAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all hover:shadow-sm cursor-pointer group',
        isSelected
          ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 dark:bg-teal-950/30 dark:border-teal-600'
          : 'border-border bg-card hover:border-teal-300 dark:hover:border-teal-800'
      )}
      onClick={() => onSelect(e.id)}
    >
      {/* Top row: Avatar + Name + Status Badges */}
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0 mt-0.5">
          <Avatar className="size-9 rounded-lg">
            <AvatarFallback className="bg-teal-100 text-teal-800 font-semibold text-xs rounded-lg dark:bg-teal-900/60 dark:text-teal-200">
              {(e.name || 'Tech')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'T'}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-background',
              getEmployeeStatusDot(e.status)
            )}
            title={`Status: ${e.status || 'offline'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-xs text-foreground truncate">
                {e.name || 'Unnamed Technician'}
              </span>
              {e.team && (
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: e.team.color }}
                  title={`Team: ${e.team.name}`}
                />
              )}
            </div>

            {/* Employee Status Badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] h-4.5 px-1.5 font-medium shrink-0',
                getEmployeeStatusBg(e.status)
              )}
            >
              {e.status === 'available' ? 'Available' : (e.status || 'offline').replace('_', ' ')}
            </Badge>
          </div>

          {/* Sub-row: GPS Telemetry + Workload */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Standardized GPS status */}
            <span
              className={cn('flex items-center gap-1 text-[10px] font-medium', gpsInfo.color)}
              title={gpsInfo.detail}
            >
              <span className="relative flex size-1.5">
                {gpsInfo.level === 'live' && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={cn('relative inline-flex size-1.5 rounded-full', gpsInfo.dotColor)} />
              </span>
              <span>{gpsInfo.label}</span>
              {gpsInfo.level !== 'unavailable' && (
                <span className="opacity-75">· {gpsInfo.lastSeenText}</span>
              )}
            </span>

            {/* Active Jobs Counter */}
            <span className="text-muted-foreground/30">·</span>
            {activeCount > 0 ? (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                <Activity className="size-2.5" />
                {activeCount} job{activeCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="size-2.5" />
                Free
              </span>
            )}

            {/* Star Rating (only if rated) */}
            {hasRating && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Star className="size-2.5 text-amber-400 fill-amber-400" />
                  {e.rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity snippet if assigned to a job */}
      {activitySnippet}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/60 text-xs">
        <span className="text-[10px] text-muted-foreground truncate">
          {e.role || 'Technician'}
          {typeof e.completedJobs === 'number' && e.completedJobs > 0 ? ` · ${e.completedJobs} completed` : ''}
        </span>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onAssignJob && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-teal-700 hover:text-teal-800 hover:bg-teal-100/60 dark:text-teal-300 dark:hover:bg-teal-950/60"
              onClick={() => onAssignJob(e.id)}
            >
              <UserCheck className="size-3 mr-1" /> Assign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

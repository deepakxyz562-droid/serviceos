'use client';

/**
 * JobQueueCard — Actionable Dispatch Queue Card
 * ----------------------------------------------
 * Displays rich unassigned job information with smart suggestion snippet and
 * immediate assignment action.
 */

import {
  MapPin,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Briefcase,
  Play,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getPriorityColor,
  getPriorityDot,
  getStatusColor,
  getServiceTypeIcon,
  formatTime,
  isLateJob,
} from '@/features/dispatch/utils/dispatch-helpers';
import type { Job, Employee } from '@/features/dispatch/types';

export interface JobQueueCardProps {
  job: Job;
  suggestedEmployee?: Employee | null;
  suggestedDistanceKm?: number | null;
  onSelect: (job: Job) => void;
  onAssign?: (job: Job) => void;
  onStartJob?: (job: Job) => void;
}

export function JobQueueCard({
  job,
  suggestedEmployee,
  suggestedDistanceKm,
  onSelect,
  onAssign,
  onStartJob,
}: JobQueueCardProps) {
  const isLate = isLateJob(job);
  const isPending = job.status === 'pending' || !job.assigneeId;

  return (
    <Card
      className={cn(
        'border rounded-xl shadow-xs transition-all hover:shadow-sm cursor-pointer group bg-card',
        isLate
          ? 'border-red-300 bg-red-50/20 dark:border-red-900/60 dark:bg-red-950/10'
          : 'border-border hover:border-teal-300 dark:hover:border-teal-800'
      )}
      onClick={() => onSelect(job)}
    >
      <CardContent className="p-3.5 space-y-2.5">
        {/* Top: Service Type Icon + Title + Priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 p-1 rounded-md bg-muted/60">
              {getServiceTypeIcon(job.type)}
            </span>
            <div className="min-w-0">
              <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                {job.title}
              </h4>
              {job.jobNumber && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  #{job.jobNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={cn('text-[9px] h-4.5 px-1.5 font-medium', getPriorityColor(job.priority))}
            >
              {job.priority}
            </Badge>
            {isLate && (
              <Badge
                variant="outline"
                className="text-[9px] h-4.5 px-1.5 bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 animate-pulse font-medium"
              >
                <AlertTriangle className="size-2.5 mr-0.5" /> Late
              </Badge>
            )}
          </div>
        </div>

        {/* Middle: Customer + Location + Scheduled Time */}
        <div className="space-y-1 text-[11px] text-muted-foreground">
          {job.customerName && (
            <div className="flex items-center gap-1.5">
              <User className="size-3 text-muted-foreground/70 shrink-0" />
              <span className="truncate font-medium text-foreground">{job.customerName}</span>
            </div>
          )}

          {job.address && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{job.address}</span>
            </div>
          )}

          {job.scheduledAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3 text-muted-foreground/70 shrink-0" />
              <span>Today · {formatTime(job.scheduledAt)}</span>
            </div>
          )}
        </div>

        {/* Smart Match Suggestion (if unassigned) */}
        {isPending && suggestedEmployee && (
          <div className="flex items-center justify-between text-[11px] bg-teal-50/70 border border-teal-200/80 rounded-lg px-2.5 py-1.5 dark:bg-teal-950/40 dark:border-teal-800">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="size-3 text-teal-600 shrink-0" />
              <span className="text-teal-900 dark:text-teal-200 font-medium truncate">
                Suggest: {suggestedEmployee.name}
              </span>
              {typeof suggestedDistanceKm === 'number' && (
                <span className="text-teal-700 dark:text-teal-300 text-[10px] shrink-0">
                  · {Math.round(suggestedDistanceKm)}km away
                </span>
              )}
            </div>
          </div>
        )}

        {/* Assigned tech snippet (if already assigned) */}
        {!isPending && job.assigneeName && (
          <div className="flex items-center justify-between text-[11px] bg-muted/40 rounded-lg px-2.5 py-1">
            <span className="text-muted-foreground">Assigned to:</span>
            <span className="font-semibold text-teal-700 dark:text-teal-300">
              {job.assigneeName}
            </span>
          </div>
        )}

        {/* Actions Footer */}
        <div className="pt-2 border-t border-border/60 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <Button
              size="sm"
              className="w-full h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs"
              onClick={() => (onAssign ? onAssign(job) : onSelect(job))}
            >
              <ArrowRight className="size-3 mr-1.5" /> Assign Technician
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs border-border"
                onClick={() => onSelect(job)}
              >
                Inspect
              </Button>
              {onStartJob && job.status === 'assigned' && (
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onStartJob(job)}
                >
                  <Play className="size-3 mr-1" /> Start
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

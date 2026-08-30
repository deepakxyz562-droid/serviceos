'use client';

/**
 * LifecycleTimelineSection — renders the 8-stage horizontal timeline
 * (vertical on mobile) with completed stages in emerald, current in
 * pulsing emerald, future in gray, and skipped stages with a dashed line.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2A refactor).
 */

import type { ComponentType } from 'react';
import {
  UserCheck, Check, Navigation, MapPin, Wrench, Pause,
  CheckCircle2, FileText, Activity,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format-utils';
import {
  JOB_LIFECYCLE_STAGES,
  getLifecycleStageIndex,
  getLifecycleTimestamps,
} from '@/lib/job-lifecycle';
import type { Job, LifecycleDataShape } from '@/features/jobs/types/jobs-view-types';

/** Map a Lucide icon name to the imported icon component. */
function getLifecycleIcon(name: string): ComponentType<LucideProps> {
  switch (name) {
    case 'UserCheck': return UserCheck;
    case 'Check': return Check;
    case 'Navigation': return Navigation;
    case 'MapPin': return MapPin;
    case 'Wrench': return Wrench;
    case 'Pause': return Pause;
    case 'CheckCircle': return CheckCircle2;
    case 'FileText': return FileText;
    default: return Activity;
  }
}

export function LifecycleTimelineSection({
  job,
  lifecycleData,
}: {
  job: Job;
  lifecycleData: LifecycleDataShape | null;
}) {
  // Pull timestamps — prefer the freshly-fetched lifecycleData; fall back to
  // parsing them from the job's metadataJson (which the legacy /api/jobs/lifecycle
  // endpoint returns as part of the job row).
  const timestamps = lifecycleData?.timestamps
    ?? getLifecycleTimestamps({
        metadataJson: job.metadataJson,
        actualStartTime: job.actualStartTime,
        completedAt: job.actualEndTime,
      });

  const currentIdx = getLifecycleStageIndex(job.status);

  // Map timestamp keys to stages.
  const tsByKey: Record<string, string | null> = {
    assigned: timestamps.assigned,
    accepted: timestamps.accepted,
    travelling: timestamps.travelStarted,
    arrived: timestamps.arrived,
    working: timestamps.workStarted,
    paused: timestamps.paused,
    completed: timestamps.completed,
    invoice_generated: timestamps.invoiceGenerated,
  };

  return (
    <div className="w-full">
      {/* Horizontal timeline (desktop) */}
      <div className="hidden md:flex items-start justify-between gap-1 overflow-x-auto pb-2">
        {JOB_LIFECYCLE_STAGES.map((stage, idx) => {
          const Icon = getLifecycleIcon(stage.icon);
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const ts = tsByKey[stage.key];
          const hasTimestamp = !!ts;

          // Colour logic
          const dotBg = isComplete || isCurrent
            ? 'bg-emerald-500 text-white'
            : 'bg-muted text-muted-foreground';
          const ring = isCurrent ? 'ring-4 ring-emerald-500/20' : '';
          const lineColor = isComplete
            ? 'bg-emerald-500'
            : isCurrent
            ? 'bg-gradient-to-r from-emerald-500 to-muted'
            : 'bg-border';

          return (
            <div key={stage.key} className="flex-1 min-w-[100px] flex flex-col items-center">
              <div className="flex items-center w-full">
                {/* Left half-line (skip for first) */}
                {idx > 0 && (
                  <div className={cn('flex-1 h-0.5', isComplete ? 'bg-emerald-500' : 'bg-border')} />
                )}
                {/* Dot + icon */}
                <div className={cn(
                  'relative size-9 rounded-full flex items-center justify-center shadow-sm shrink-0',
                  dotBg,
                  ring,
                  isCurrent && 'animate-pulse',
                )}>
                  <Icon className="size-4" strokeWidth={2.2} />
                </div>
                {/* Right half-line (skip for last) */}
                {idx < JOB_LIFECYCLE_STAGES.length - 1 && (
                  <div className={cn('flex-1 h-0.5', lineColor)} />
                )}
              </div>
              <div className="mt-2 text-center min-h-[40px]">
                <p className={cn(
                  'text-xs font-semibold',
                  isComplete ? 'text-emerald-700' : isCurrent ? 'text-emerald-700' : 'text-muted-foreground',
                )}>
                  {stage.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {hasTimestamp ? formatDateTime(ts) : (isFuture ? 'Pending' : '—')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vertical timeline (mobile) */}
      <div className="md:hidden space-y-1">
        {JOB_LIFECYCLE_STAGES.map((stage, idx) => {
          const Icon = getLifecycleIcon(stage.icon);
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const ts = tsByKey[stage.key];
          const hasTimestamp = !!ts;

          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center shrink-0',
                  isComplete || isCurrent ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground',
                  isCurrent && 'ring-4 ring-emerald-500/20 animate-pulse',
                )}>
                  <Icon className="size-3.5" strokeWidth={2.2} />
                </div>
                {idx < JOB_LIFECYCLE_STAGES.length - 1 && (
                  <div className={cn('w-0.5 flex-1 min-h-[16px] my-1', isComplete ? 'bg-emerald-500' : 'bg-border')} />
                )}
              </div>
              <div className="pb-2 min-w-0 flex-1">
                <p className={cn(
                  'text-sm font-semibold',
                  isComplete ? 'text-emerald-700' : isCurrent ? 'text-emerald-700' : 'text-muted-foreground',
                )}>
                  {stage.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasTimestamp ? formatDateTime(ts) : (idx > currentIdx ? 'Pending' : '—')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

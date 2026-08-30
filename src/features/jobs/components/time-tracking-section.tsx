'use client';

/**
 * TimeTrackingSection — shows a live timer (HH:MM:SS) for the active
 * work session, plus action buttons (Start / Pause / Resume / Complete),
 * and the final breakdown (working / pause / total) when completed.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2A refactor).
 */

import {
  Loader2, PlayCircle, PauseCircle, StopCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatHMS, formatMinutes } from '@/lib/format-utils';
import type { Job, LifecycleDataShape } from '@/features/jobs/types/jobs-view-types';

export function TimeTrackingSection({
  job,
  lifecycleData,
  liveTimerSeconds,
  lifecycleLoadingAction,
  onAction,
  onOpenCompletion,
}: {
  job: Job;
  lifecycleData: LifecycleDataShape | null;
  liveTimerSeconds: number;
  lifecycleLoadingAction: string | null;
  onAction: (action: 'start_work' | 'pause' | 'resume' | 'complete', jobId: string) => void;
  onOpenCompletion: () => void;
}) {
  const activeEntry = lifecycleData?.activeTimeEntry ?? null;
  const isWorking = job.status === 'working';
  const isPaused = job.status === 'paused';
  const isActive = isWorking || isPaused;
  const isCompleted = job.status === 'completed' || job.status === 'invoice_generated';

  // Compute pause + total live for active sessions.
  const livePauseSeconds = (() => {
    if (!activeEntry) return 0;
    try {
      const pauses = JSON.parse(activeEntry.pausesJson || '[]') as Array<{ start: string; end?: string | null }>;
      let totalMs = 0;
      for (const p of pauses) {
        if (!p.start) continue;
        const s = new Date(p.start).getTime();
        const e = p.end ? new Date(p.end).getTime() : Date.now();
        if (e > s) totalMs += e - s;
      }
      return Math.floor(totalMs / 1000);
    } catch {
      return 0;
    }
  })();
  const liveTotalSeconds = liveTimerSeconds + livePauseSeconds;

  return (
    <div className="space-y-4">
      {/* Live timer display */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isWorking ? 'Working time' : isPaused ? 'Paused' : isCompleted ? 'Total work time' : 'Not started'}
          </p>
          <p className="text-4xl font-mono font-bold text-foreground tabular-nums mt-1">
            {isActive ? formatHMS(liveTimerSeconds) : isCompleted && activeEntry
              ? formatHMS((activeEntry.workingMinutes || 0) * 60)
              : isCompleted && job.actualStartTime && job.actualEndTime
              ? formatHMS(Math.round((new Date(job.actualEndTime).getTime() - new Date(job.actualStartTime).getTime()) / 1000))
              : '00:00:00'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="outline" className={cn(
              'gap-1 capitalize',
              isWorking ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            )}>
              <span className={cn('size-1.5 rounded-full', isWorking ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              {job.status}
            </Badge>
          )}
          {!isActive && !isCompleted && (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border capitalize">
              {job.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        {!isActive && !isCompleted && job.status === 'arrived' && (
          <button
            onClick={() => onAction('start_work', job.id)}
            disabled={!!lifecycleLoadingAction}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {lifecycleLoadingAction === 'start_work' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <PlayCircle className="size-4 mr-1.5" />} Start Working
          </button>
        )}
        {isWorking && (
          <>
            <button
              onClick={() => onAction('pause', job.id)}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-medium text-foreground border border-border bg-background hover:bg-muted disabled:opacity-60 transition-colors"
            >
              {lifecycleLoadingAction === 'pause' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <PauseCircle className="size-4 mr-1.5" />} Pause
            </button>
            <button
              onClick={onOpenCompletion}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              <StopCircle className="size-4 mr-1.5" /> Complete
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              onClick={() => onAction('resume', job.id)}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {lifecycleLoadingAction === 'resume' ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <PlayCircle className="size-4 mr-1.5" />} Resume
            </button>
            <button
              onClick={onOpenCompletion}
              disabled={!!lifecycleLoadingAction}
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              <StopCircle className="size-4 mr-1.5" /> Complete
            </button>
          </>
        )}
        {!isActive && !isCompleted && job.status !== 'arrived' && (
          <p className="text-sm text-muted-foreground italic">
            {job.status === 'pending' && 'Job must be assigned first to start time tracking.'}
            {job.status === 'assigned' && 'Technician must accept the job to start time tracking.'}
            {job.status === 'accepted' && 'Start travel to begin tracking. Time tracking begins on arrival.'}
            {job.status === 'travelling' && 'Mark as arrived to begin work time tracking.'}
          </p>
        )}
      </div>

      {/* Time breakdown */}
      {(isActive || isCompleted) && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40">
          <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Working</p>
            <p className="text-sm font-semibold text-emerald-700 mt-0.5 font-mono">
              {isActive
                ? formatHMS(liveTimerSeconds)
                : activeEntry
                ? formatMinutes(activeEntry.workingMinutes || 0)
                : '—'}
            </p>
          </div>
          <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Pause</p>
            <p className="text-sm font-semibold text-amber-700 mt-0.5 font-mono">
              {isActive
                ? formatHMS(livePauseSeconds)
                : activeEntry
                ? formatMinutes(activeEntry.pauseMinutes || 0)
                : '—'}
            </p>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold text-foreground mt-0.5 font-mono">
              {isActive
                ? formatHMS(liveTotalSeconds)
                : activeEntry
                ? formatMinutes((activeEntry.durationMinutes || 0))
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

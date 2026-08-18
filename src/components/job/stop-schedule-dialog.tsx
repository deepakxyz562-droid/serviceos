'use client';

/**
 * StopScheduleDialog — Issue 1 (Fieseros CRM)
 * ------------------------------------------------------------------
 * Stops a RecurringJobSchedule PERMANENTLY. Distinct from CloseJobDialog:
 *
 *   CloseJobDialog       → affects ONE job (this occurrence only).
 *   StopScheduleDialog   → stops NEW generation; may also cancel future
 *                           already-generated jobs (user's choice).
 *
 * Endpoint contract (created by previous agent):
 *   POST /api/recurring-jobs/[id]/stop
 *     body: { keepFutureVisits?: boolean }   // default true
 *   Sets schedule: active=false, pausedAt=now, endDate=now (so resume()
 *   permanently fails). If keepFutureVisits=false, cancels (status='cancelled')
 *   all generated future Jobs whose scheduledAt > now AND status IN
 *   ('pending','assigned','accepted').
 *   Returns: { schedule, futureJobsAffected, futureVisitsKept }
 *
 * Future-visit count:
 *   The GET /api/recurring-jobs/[id] endpoint returns up to 10 recent jobs.
 *   We filter those by `scheduledAt > now` AND `status IN (pending,
 *   assigned, accepted)` to estimate the future count shown in the body.
 *   For schedules with >10 future jobs (rare), the displayed count is a
 *   lower bound — clearly labeled as "scheduled" rather than "exact total".
 *   The server's `futureJobsAffected` response field always carries the
 *   authoritative count for the post-action toast.
 */

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, StopCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface StopScheduleDialogProps {
  scheduleId: string | null;
  /** Optional schedule title for display in the dialog body. */
  scheduleTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback after a successful stop — parent refetches. */
  onStopped?: () => void;
}

// Mirrors the GET /api/recurring-jobs/[id] response `recentJobs[]` shape.
interface RecentJob {
  id: string;
  status: string;
  scheduledAt: string | null;
}

type Choice = 'keep' | 'remove';

export function StopScheduleDialog({
  scheduleId,
  scheduleTitle,
  open,
  onOpenChange,
  onStopped,
}: StopScheduleDialogProps) {
  const [choice, setChoice] = React.useState<Choice>('keep');
  const [saving, setSaving] = React.useState(false);
  const [futureCount, setFutureCount] = React.useState<number | null>(null);
  const [loadingCount, setLoadingCount] = React.useState(false);

  // Reset radio + count whenever the dialog opens for a fresh schedule.
  React.useEffect(() => {
    if (!open) {
      // Defer reset so the closing animation doesn't flash the choice back.
      const t = window.setTimeout(() => {
        setChoice('keep');
        setFutureCount(null);
        setSaving(false);
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // Fetch the future-visit count when the dialog opens.
  // Skips if no scheduleId or if we've already loaded for this open session.
  React.useEffect(() => {
    if (!open || !scheduleId) return;
    if (futureCount !== null) return; // already loaded
    setLoadingCount(true);
    fetch(`/api/recurring-jobs/${scheduleId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { recentJobs?: RecentJob[] } | null) => {
        if (!data || !Array.isArray(data.recentJobs)) {
          setFutureCount(0);
          return;
        }
        const now = Date.now();
        const futureActiveStatuses = new Set([
          'pending',
          'assigned',
          'accepted',
        ]);
        const count = data.recentJobs.filter(
          (j) =>
            j.scheduledAt !== null &&
            new Date(j.scheduledAt).getTime() > now &&
            futureActiveStatuses.has(j.status),
        ).length;
        setFutureCount(count);
      })
      .catch(() => {
        // Non-fatal — we just won't show the count. The user can still stop.
        setFutureCount(0);
      })
      .finally(() => setLoadingCount(false));
  }, [open, scheduleId, futureCount]);

  const handleConfirm = async () => {
    if (!scheduleId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recurring-jobs/${scheduleId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepFutureVisits: choice === 'keep' }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        toast.error(err.error || 'Failed to stop recurring schedule');
        return;
      }
      const data = (await res.json()) as {
        futureJobsAffected?: number;
        futureVisitsKept?: boolean;
      };
      const affected = Number(data.futureJobsAffected ?? 0);
      const kept = data.futureVisitsKept !== false;
      const detail =
        affected > 0
          ? kept
            ? ` (${affected} future visit${affected === 1 ? '' : 's'} kept)`
            : ` (${affected} future visit${affected === 1 ? '' : 's'} cancelled)`
          : '';
      toast.success(`Recurring schedule stopped${detail}`);
      onOpenChange(false);
      onStopped?.();
    } catch {
      toast.error('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <StopCircle className="size-5 text-red-600" />
            Stop recurring schedule?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {scheduleTitle && (
                <p>
                  Schedule:{' '}
                  <span className="font-medium text-foreground">{scheduleTitle}</span>
                </p>
              )}
              <p>
                This will prevent new visits from being generated. The stop is{' '}
                <span className="font-medium text-foreground">permanent</span> — the
                schedule cannot be resumed later.
              </p>
              <div className="rounded-md bg-muted/50 p-2.5">
                {loadingCount ? (
                  <span className="flex items-center gap-2 text-xs">
                    <Loader2 className="size-3 animate-spin" /> Counting future visits…
                  </span>
                ) : futureCount !== null ? (
                  <span className="text-xs">
                    <span className="font-semibold text-foreground">
                      {futureCount}
                    </span>{' '}
                    future visit{futureCount === 1 ? '' : 's'}
                    {futureCount >= 10
                      ? ' shown (more may exist beyond the recent 10).'
                      : ' already scheduled.'}
                  </span>
                ) : (
                  <span className="text-xs">Counting future visits…</span>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Radio group: keep vs remove future visits. */}
        <div className="space-y-2">
          <RadioGroup
            value={choice}
            onValueChange={(v) => setChoice(v as Choice)}
            className="gap-2"
          >
            <label
              htmlFor="stop-choice-keep"
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                choice === 'keep'
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <RadioGroupItem
                id="stop-choice-keep"
                value="keep"
                className="mt-0.5"
                aria-describedby="stop-choice-keep-desc"
              />
              <div className="space-y-0.5">
                <Label htmlFor="stop-choice-keep" className="cursor-pointer font-medium">
                  Keep future visits
                </Label>
                <p
                  id="stop-choice-keep-desc"
                  className="text-xs text-muted-foreground"
                >
                  Existing future visits remain on the calendar. Only NEW generation is stopped.
                </p>
              </div>
            </label>

            <label
              htmlFor="stop-choice-remove"
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                choice === 'remove'
                  ? 'border-red-500 bg-red-500/5'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <RadioGroupItem
                id="stop-choice-remove"
                value="remove"
                className="mt-0.5"
                aria-describedby="stop-choice-remove-desc"
              />
              <div className="space-y-0.5">
                <Label htmlFor="stop-choice-remove" className="cursor-pointer font-medium">
                  Remove future visits
                </Label>
                <p
                  id="stop-choice-remove-desc"
                  className="text-xs text-muted-foreground"
                >
                  Future visits will be cancelled. Completed visits are not affected.
                </p>
              </div>
            </label>
          </RadioGroup>

          {choice === 'remove' && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <p className="text-xs">
                Cancels future visits whose status is pending, assigned, or accepted.
                Jobs already in progress or completed are never touched.
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Stopping…
              </>
            ) : (
              'Stop Schedule'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default StopScheduleDialog;

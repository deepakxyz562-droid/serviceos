'use client';

/**
 * CloseJobDialog — Issue 1 (Fieseros CRM)
 * ------------------------------------------------------------------
 * Closes a SINGLE job occurrence. Does NOT touch the recurring schedule.
 *
 * Two display branches:
 *
 * 1. NORMAL job (no recurringScheduleId):
 *    Title:    "Close job with incomplete visits?"
 *    Body:     "This job will be marked as completed." (V1 simplification —
 *              the Job model has no separate Visits rows, so we just mark
 *              the job itself completed. The summary wording reflects the
 *              design intent: complete past activity + drop incomplete bits.)
 *
 * 2. RECURRING job (has recurringScheduleId):
 *    Title:    "Close this visit?"
 *    Body:     "This will close this visit. The recurring schedule will
 *              continue generating future visits."
 *              + a muted note pointing users to "Stop Recurring Schedule"
 *                in the More menu if they want to halt future generation.
 *
 * Primary action: PUT /api/jobs/${job.id} body { id, status: 'completed' }.
 * Re-uses the existing /api/jobs/[id] route — NO new endpoint.
 *
 * Note on lifecycle state machine (src/lib/job-lifecycle.ts):
 *   status='completed' is only valid from 'working' | 'in_progress' |
 *   'paused' | 'on_hold'. The route returns 400 if a caller tries to
 *   jump from 'pending' / 'assigned' / etc. directly to 'completed'.
 *   We surface that 400 as a friendly toast so the user knows to start
 *   work first (or use the lifecycle flow).
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
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getJobInvalidations } from '@/lib/invalidation-helpers';

// Minimal Job shape — only the fields this dialog reads. Keeps the
// component decoupled from the larger `Job` interface in jobs-view.tsx so
// it can be reused elsewhere (e.g. a future mobile/PWA close flow).
export interface CloseJobDialogJob {
  id: string;
  title: string;
  jobNumber?: string;
  status: string;
  recurringScheduleId?: string | null;
  customerName?: string;
}

export interface CloseJobDialogProps {
  job: CloseJobDialogJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback after a successful close — parent refetches. */
  onClosed?: () => void;
}

export function CloseJobDialog({
  job,
  open,
  onOpenChange,
  onClosed,
}: CloseJobDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = React.useState(false);

  // Reset saving state whenever the dialog closes.
  React.useEffect(() => {
    if (!open) {
      // Defer reset so the closing animation doesn't show the CTA flip back
      // to "Close Job" mid-fade.
      const t = window.setTimeout(() => setSaving(false), 200);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const isRecurring = !!job?.recurringScheduleId;

  const handleConfirm = async () => {
    if (!job) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: 'completed' }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          hint?: string;
          currentStatus?: string;
        };
        // The state machine returns 400 with a hint to use the lifecycle
        // endpoint. Translate that into a user-facing message so the user
        // understands WHY the close failed (job isn't in a closeable state).
        if (res.status === 400) {
          const friendly =
            err.hint && err.currentStatus
              ? `This job can't be closed from its current state ("${err.currentStatus}"). Start work first, then close it once the technician is on-site.`
              : err.error || 'This job cannot be closed right now.';
          toast.error(friendly);
        } else {
          toast.error(err.error || 'Failed to close job');
        }
        return;
      }
      toast.success(isRecurring ? 'Visit closed' : 'Job closed');
      // Invalidate via centralized helper — same contract as useCancelJob/useUpdateJob.
      // This closes the dialog mutation gap (Phase 1.9f performance review finding).
      for (const key of getJobInvalidations({ mutation: 'update', variables: { id: job.id } })) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onOpenChange(false);
      onClosed?.();
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
            <CheckCircle2 className="size-5 text-emerald-600" />
            {isRecurring ? 'Close this visit?' : 'Close job with incomplete visits?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {job && (
                <p>
                  Job{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {job.jobNumber || job.id.slice(0, 8).toUpperCase()}
                  </span>
                  {job.customerName ? ` · ${job.customerName}` : ''}{' '}
                  — <span className="text-foreground">{job.title}</span>
                </p>
              )}

              {isRecurring ? (
                <>
                  <p>
                    This will close this visit. The recurring schedule will continue
                    generating future visits as normal.
                  </p>
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <p className="text-xs">
                      To stop future visits from being generated, use{' '}
                      <span className="font-semibold">“Stop Recurring Schedule”</span>{' '}
                      in the More menu — this dialog only closes the current occurrence.
                    </p>
                  </div>
                </>
              ) : (
                <p>
                  This job will be marked as <span className="font-medium text-foreground">completed</span>.
                  Any past visit activity is finalized, and any incomplete visits are cancelled.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" /> Closing…
              </>
            ) : (
              'Close Job'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CloseJobDialog;

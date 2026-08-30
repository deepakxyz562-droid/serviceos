'use client';

/**
 * DeleteJobDialog — permanent single-job delete confirmation.
 *
 * AlertDialog-based confirmation that asks the user to confirm a HARD delete
 * (DELETE /api/jobs/[id]) of a single job. Surfaced from the More menu's
 * "Delete" action on both the list view per-row menu and the Job Detail page
 * header.
 *
 * Behavior notes:
 *   - Title shows the jobNumber (or first 8 chars of the id uppercased if no
 *     jobNumber is set) plus the job title.
 *   - For `status === 'completed'` jobs, an amber warning notes that linked
 *     invoices will remain (only the Job row is removed).
 *   - The primary action button is disabled while the DELETE request is in
 *     flight (`deleting` prop); the cancel button is also disabled to prevent
 *     dismiss-during-request races.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2E refactor).
 */

import { Trash2 } from 'lucide-react';
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
import type { Job } from '@/features/jobs/types/jobs-view-types';

export interface DeleteJobDialogProps {
  /** The job pending deletion, or null when the dialog is closed. */
  job: Job | null;
  /** Called with false when the user dismisses (Esc / backdrop / Cancel). */
  onOpenChange: (open: boolean) => void;
  /** Confirm handler — runs the DELETE /api/jobs/[id] request. */
  onDelete: () => void;
  /** True while the DELETE request is in flight — disables both buttons. */
  deleting: boolean;
}

export function DeleteJobDialog({ job, onOpenChange, onDelete, deleting }: DeleteJobDialogProps) {
  return (
    <AlertDialog open={!!job} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-red-600" /> Delete Job?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {job && (
              <>
                Are you sure you want to permanently delete job{' '}
                <span className="font-mono font-semibold text-foreground">{job.jobNumber || job.id.slice(0, 8).toUpperCase()}</span>
                {' '}({job.title})? This action cannot be undone.
                {job.status === 'completed' && (
                  <span className="block mt-2 text-amber-600">⚠️ This job may have linked invoices. The job record will be removed but invoices will remain.</span>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            {deleting ? 'Deleting...' : 'Delete Job'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

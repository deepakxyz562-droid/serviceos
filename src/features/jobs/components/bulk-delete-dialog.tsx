'use client';

/**
 * BulkDeleteDialog — bulk permanent-delete confirmation.
 *
 * AlertDialog-based confirmation for the "Delete Permanently" bulk action
 * (POST /api/jobs/bulk body { action: 'delete' }). Triggered from the list
 * view's bulk-action toolbar when one or more jobs are checked.
 *
 * Copy nudges users toward "Archive" instead — soft-deleted jobs stay in Job
 * History and can be restored, while hard delete drops the row entirely.
 *
 * The parent owns:
 *   - `open` / `onOpenChange` (the bulkDeleteOpen state)
 *   - `selectedCount` (the size of the selectedJobIds Set)
 *   - `running` (the bulkRunning flag — true while any bulk action is in flight)
 *   - `onConfirm` — calls `runJobBulkAction('delete')` which POSTs to /bulk.
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

export interface BulkDeleteDialogProps {
  /** Controls the modal's open state. */
  open: boolean;
  /** Called when the user dismisses the modal (Esc, backdrop, Cancel). */
  onOpenChange: (open: boolean) => void;
  /** Number of jobs selected for deletion — drives the title + body copy. */
  selectedCount: number;
  /** True while the bulk-delete POST is in flight — disables both buttons. */
  running: boolean;
  /** Confirm handler — kicks off the POST /api/jobs/bulk delete. */
  onConfirm: () => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  running,
  onConfirm,
}: BulkDeleteDialogProps) {
  const pluralSuffix = selectedCount !== 1 ? 's' : '';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-red-600" /> Delete {selectedCount} Job{pluralSuffix}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {selectedCount} selected job{pluralSuffix}.
            This action cannot be undone. Consider using <strong>Archive</strong> instead to keep
            them in Job History.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={running}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {running ? 'Deleting...' : 'Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

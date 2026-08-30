'use client';

/**
 * BookingDeleteDialog — Phase 6E extraction from booking-view.tsx.
 *
 * Replaces the inline "Delete Booking" AlertDialog. Pure presentational —
 * the parent owns the selected-booking state and the `onConfirm` mutation.
 *
 * Extracted from src/components/views/booking-view.tsx (Phase 6E refactor).
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { Booking } from '@/features/booking/types';

export interface BookingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  submitting: boolean;
  onConfirm: () => void;
}

export function BookingDeleteDialog({
  open,
  onOpenChange,
  booking,
  submitting,
  onConfirm,
}: BookingDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong>{booking?.title}</strong>? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

'use client';

/**
 * BookingCreateDialog — create a new booking for the selected customer.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure presentational component — the parent owns the open state, the form
 * fields (title / scheduledAt / address / notes), the `creating` flag, and
 * the submit handler (which POSTs to `/api/bookings` and invalidates the
 * bookings + customer360 React Query keys).
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface BookingCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  bookingTitle: string;
  setBookingTitle: (v: string) => void;
  bookingScheduledAt: string;
  setBookingScheduledAt: (v: string) => void;
  bookingAddress: string;
  setBookingAddress: (v: string) => void;
  bookingNotes: string;
  setBookingNotes: (v: string) => void;
  creating: boolean;
  onCreate: () => void;
}

export function BookingCreateDialog({
  open,
  onOpenChange,
  customerName,
  bookingTitle,
  setBookingTitle,
  bookingScheduledAt,
  setBookingScheduledAt,
  bookingAddress,
  setBookingAddress,
  bookingNotes,
  setBookingNotes,
  creating,
  onCreate,
}: BookingCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>New Booking for {customerName}</DialogTitle>
          <DialogDescription>Create a new booking — status will be auto-confirmed.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-2">
          <div>
            <Label className="text-xs">Title *</Label>
            <Input value={bookingTitle} onChange={e => setBookingTitle(e.target.value)} placeholder="e.g. Deep cleaning service" />
          </div>
          <div>
            <Label className="text-xs">Scheduled At</Label>
            <Input type="datetime-local" value={bookingScheduledAt} onChange={e => setBookingScheduledAt(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Address</Label>
            <Input value={bookingAddress} onChange={e => setBookingAddress(e.target.value)} placeholder="Service address" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} rows={3} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onCreate} disabled={creating}>
            {creating ? <><Loader2 className="size-4 mr-1 animate-spin" /> Creating...</> : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

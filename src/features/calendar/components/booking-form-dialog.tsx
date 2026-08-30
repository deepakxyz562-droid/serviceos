'use client';

/**
 * BookingFormDialog — Phase 6D extraction from calendar-view.tsx.
 *
 * Replaces the inline `renderCreateDialog()` closure that lived inside the
 * parent CalendarView component. This is the "New Booking" form dialog with
 * fields for title, customer name, employee assignment, scheduled start/end
 * datetime, duration, address, source, and notes.
 *
 * Pure presentational — all state lives in the parent CalendarView and is
 * threaded through as props. Same JSX, same handler wiring — moved to its own
 * file so calendar-view.tsx shrinks by ~165 lines.
 *
 * Extracted from src/components/views/calendar-view.tsx (Phase 6D refactor).
 */

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmployeeSelect } from '@/components/shared/employee-select';
import type { BookingFormData } from '@/features/calendar/types';

export interface BookingFormDialogProps {
  /** Controls dialog open state. */
  open: boolean;
  /** Open-state setter (called with `false` on close / cancel). */
  onOpenChange: (open: boolean) => void;
  /** Current form state — owned by parent. */
  form: BookingFormData;
  /** Patch the form (parent owns the source of truth). */
  onFormChange: (form: BookingFormData) => void;
  /** Employees list (for EmployeeSelect initial-value lookup). */
  employees: { id: string; name: string }[];
  /** True while the create request is in-flight. */
  saving: boolean;
  /** Submit handler — kicks off POST /api/bookings. */
  onCreate: () => void;
  /** Reset handler — restores the form to a blank state (called on Cancel). */
  onReset: () => void;
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
];

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'phone', label: 'Phone' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

/**
 * "New Booking" create-booking form dialog. Pure presentational — see props
 * above. The parent CalendarView owns the form state and the submit handler.
 */
export function BookingFormDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  employees,
  saving,
  onCreate,
  onReset,
}: BookingFormDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Plus className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            New Booking
          </DialogTitle>
          <DialogDescription>
            Schedule a new booking or appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Home Cleaning"
              value={form.title}
              onChange={(e) =>
                onFormChange({ ...form, title: e.target.value })
              }
            />
          </div>

          {/* Customer Name */}
          <div className="grid gap-2">
            <Label htmlFor="customerName" className="text-sm font-medium">
              Customer Name
            </Label>
            <Input
              id="customerName"
              placeholder="Customer name"
              value={form.customerName}
              onChange={(e) =>
                onFormChange({ ...form, customerName: e.target.value })
              }
            />
          </div>

          {/* Employee */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Assign Employee</Label>
            <EmployeeSelect
              value={form.employee}
              onChange={(id) =>
                onFormChange({ ...form, employee: id || '' })
              }
              initialEmployee={
                form.employee
                  ? (() => {
                      const emp = employees.find((e) => e.id === form.employee);
                      return emp ? { id: emp.id, name: emp.name } : null;
                    })()
                  : null
              }
              placeholder="Search employee…"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="scheduledAt"
                className="text-sm font-medium"
              >
                Start Date &amp; Time
              </Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  onFormChange({ ...form, scheduledAt: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="scheduledEndTime"
                className="text-sm font-medium"
              >
                End Date &amp; Time
              </Label>
              <Input
                id="scheduledEndTime"
                type="datetime-local"
                value={form.scheduledEndTime}
                onChange={(e) =>
                  onFormChange({ ...form, scheduledEndTime: e.target.value })
                }
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid gap-2">
            <Label htmlFor="duration" className="text-sm font-medium">
              Duration (minutes)
            </Label>
            <Select
              value={String(form.duration)}
              onValueChange={(val) =>
                onFormChange({ ...form, duration: parseInt(val) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Service location"
              value={form.address}
              onChange={(e) =>
                onFormChange({ ...form, address: e.target.value })
              }
            />
          </div>

          {/* Source */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Source</Label>
            <Select
              value={form.source}
              onValueChange={(val) => onFormChange({ ...form, source: val })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) =>
                onFormChange({ ...form, notes: e.target.value })
              }
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={saving || !form.title.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-1.5" />
                Create Booking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BookingFormDialog;

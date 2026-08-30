'use client';

/**
 * BookingViewDialog — Phase 6E extraction from booking-view.tsx.
 *
 * Replaces the inline "View Details" dialog that lived inside BookingView.
 * Shows full booking details + footer action buttons (Edit, Assign/Change
 * Employee dropdown, Auto Assign, Create Job, and per-status transition
 * buttons).
 *
 * Pure presentational — all state and mutations live in the parent BookingView
 * and are threaded through as props.
 *
 * Extracted from src/components/views/booking-view.tsx (Phase 6E refactor).
 */

import {
  Pencil,
  Users,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  STATUS_CONFIG,
  formatScheduleDate,
  formatScheduleTime,
  formatDuration,
  getTransitionOptions,
} from '@/features/booking/utils/booking-helpers';
import type {
  Booking,
  EmployeeOption,
} from '@/features/booking/types';

export interface BookingViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  employees: EmployeeOption[];
  submitting: boolean;
  onEdit: (booking: Booking) => void;
  onAssignEmployee: (bookingId: string, employeeId: string) => void;
  onAutoAssign: (bookingId: string) => void;
  onCreateJobFromBooking: (bookingId: string) => void;
  onStatusChange: (booking: Booking, newStatus: string) => void;
}

export function BookingViewDialog({
  open,
  onOpenChange,
  booking,
  employees,
  submitting,
  onEdit,
  onAssignEmployee,
  onAutoAssign,
  onCreateJobFromBooking,
  onStatusChange,
}: BookingViewDialogProps) {
  // Resolve status config safely (booking may be null right after close).
  const statusCfg = booking
    ? STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
    : STATUS_CONFIG.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
          <DialogDescription>
            Full details for this booking.
          </DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="grid gap-3 py-2 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-base">
                  {booking.title}
                </h4>
                {booking.description && (
                  <p className="text-muted-foreground mt-1">
                    {booking.description}
                  </p>
                )}
              </div>
              <Badge
                variant="secondary"
                className={`${statusCfg.bgClass} ${statusCfg.textClass} border-0`}
              >
                {statusCfg.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Customer
                </span>
                <p className="font-medium">
                  {booking.customerName || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Phone
                </span>
                <p className="font-medium">
                  {booking.customerPhone || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Email
                </span>
                <p className="font-medium">
                  {booking.customerEmail || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Address
                </span>
                <p className="font-medium">
                  {booking.address || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Scheduled
                </span>
                <p className="font-medium">
                  {formatScheduleDate(booking.scheduledAt)}{' '}
                  {formatScheduleTime(booking.scheduledAt)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Duration
                </span>
                <p className="font-medium">
                  {formatDuration(booking.duration)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Employee
                </span>
                <p className="font-medium">
                  {booking.employee?.name || '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Source
                </span>
                <p className="font-medium capitalize">
                  {booking.source}
                </p>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Notes
                </span>
                <p className="mt-0.5 text-muted-foreground">
                  {booking.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(booking);
                }}
              >
                <Pencil className="size-3.5 mr-1.5" /> Edit
              </Button>

              {/* Assign / Change Employee dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={submitting}>
                    <Users className="size-3.5 mr-1.5" />
                    {booking.employeeId ? 'Change Employee' : 'Assign Employee'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto w-64">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Select an employee
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {employees.length === 0 ? (
                    <DropdownMenuItem disabled>No employees available</DropdownMenuItem>
                  ) : (
                    employees.map((emp) => (
                      <DropdownMenuItem
                        key={emp.id}
                        onClick={() => {
                          onAssignEmployee(booking.id, emp.id);
                          onOpenChange(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <span>{emp.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {emp.role || '—'} · {emp.status || '—'}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                  {booking.employeeId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => {
                          onAssignEmployee(booking.id, '');
                          onOpenChange(false);
                        }}
                      >
                        Unassign
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAutoAssign(booking.id);
                  onOpenChange(false);
                }}
                disabled={submitting}
              >
                <Users className="size-3.5 mr-1.5" /> Auto Assign
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onCreateJobFromBooking(booking.id);
                  onOpenChange(false);
                }}
                disabled={submitting}
              >
                <Briefcase className="size-3.5 mr-1.5" /> Create Job
              </Button>

              {getTransitionOptions(booking.status).map((t) => (
                <Button
                  key={t.to}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    onOpenChange(false);
                    onStatusChange(booking, t.to);
                  }}
                >
                  <CheckCircle2 className="size-3.5 mr-1.5" /> {t.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

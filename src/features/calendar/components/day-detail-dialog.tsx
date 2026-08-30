'use client';

/**
 * DayDetailDialog + DayDetailSidebar + EventActionsMenu — Phase 6D
 * extraction from calendar-view.tsx.
 *
 * Replaces three inline closures that used to live inside the parent
 * CalendarView component:
 *
 *   1. `renderEventActions()`  — booking-card 3-dot dropdown menu
 *      (Assign Employee sub-menu, Auto Assign, Create Job, Mark Completed,
 *       Reschedule, Cancel Booking). Job events render null (no actions).
 *
 *   2. `renderEventDetail()`   — desktop sidebar panel showing all events
 *      for the selected date. Card layout with sticky header (date label +
 *      close button), empty state with "Add Event" button, or scrollable
 *      list of event cards.
 *
 *   3. Mobile Dialog           — same event list rendered inside a Dialog
 *      for small screens (the desktop sidebar is hidden below `lg`).
 *
 * All three are pure presentational — state and handlers live in the parent
 * CalendarView and are threaded through as props. The parent passes a
 * `renderEventActions(evt)` callback so it can keep its action handlers in
 * one place.
 *
 * Extracted from src/components/views/calendar-view.tsx (Phase 6D refactor).
 */

import type { ReactNode } from 'react';
import {
  Calendar, Clock, Plus, X, User, MapPin, Users, Briefcase,
  MoreHorizontal, Sparkles, CalendarClock, Ban, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  getStatusConfig,
  formatTime,
} from '@/features/calendar/utils/calendar-helpers';
import type { CalendarEvent } from '@/features/calendar/types';

// ─── Event Actions Menu (booking-card 3-dot dropdown) ───────────────────────

export interface EventActionsMenuProps {
  evt: CalendarEvent;
  employees: { id: string; name: string }[];
  actionInProgress: boolean;
  onAssign: (evt: CalendarEvent, employeeId: string) => void;
  onAutoAssign: (evt: CalendarEvent) => void;
  onCreateJob: (evt: CalendarEvent) => void;
  onMarkCompleted: (evt: CalendarEvent) => void;
  onReschedule: (evt: CalendarEvent) => void;
  onCancel: (evt: CalendarEvent) => void;
}

/**
 * Booking-card 3-dot dropdown menu. Returns null for job events (no booking
 * actions apply). Pure presentational — all handlers come from the parent.
 */
export function EventActionsMenu({
  evt,
  employees,
  actionInProgress,
  onAssign,
  onAutoAssign,
  onCreateJob,
  onMarkCompleted,
  onReschedule,
  onCancel,
}: EventActionsMenuProps) {
  if (evt.type !== 'booking') return null;
  const isAssigned = !!evt.employee?.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-6 p-0 shrink-0 hover:bg-background/80"
          aria-label="Booking actions"
          disabled={actionInProgress}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Assign / Change Employee with sub-menu of employees */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users className="size-4 mr-2" />
            {isAssigned ? 'Change Employee' : 'Assign Employee'}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[280px] overflow-y-auto">
            {employees.length === 0 ? (
              <DropdownMenuItem disabled>No employees available</DropdownMenuItem>
            ) : (
              employees.map((emp) => (
                <DropdownMenuItem
                  key={emp.id}
                  onClick={() => onAssign(evt, emp.id)}
                >
                  <User className="size-3.5 mr-2 text-muted-foreground" />
                  {emp.name}
                </DropdownMenuItem>
              ))
            )}
            {isAssigned && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onAssign(evt, '')}
                >
                  <Ban className="size-3.5 mr-2" /> Unassign
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={() => onAutoAssign(evt)}>
          <Sparkles className="size-4 mr-2" /> Auto Assign
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onCreateJob(evt)}>
          <Briefcase className="size-4 mr-2" /> Create Job
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onMarkCompleted(evt)}
          disabled={evt.status === 'completed'}
        >
          <CheckCircle2 className="size-4 mr-2" /> Mark Completed
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onReschedule(evt)}>
          <CalendarClock className="size-4 mr-2" /> Reschedule
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => onCancel(evt)}
          disabled={evt.status === 'cancelled'}
        >
          <Ban className="size-4 mr-2" /> Cancel Booking
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Shared Event Card (rendered by sidebar + mobile dialog) ────────────────

interface EventCardProps {
  evt: CalendarEvent;
  /** Renders the booking 3-dot action menu (or null for job events). */
  renderActions: (evt: CalendarEvent) => ReactNode | null;
}

function EventCard({ evt, renderActions }: EventCardProps) {
  const cfg = getStatusConfig(evt.status);
  const isJob = evt.type === 'job';

  return (
    <div
      className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3 transition-colors hover:shadow-sm`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`shrink-0 size-8 rounded-md flex items-center justify-center ${
            isJob
              ? 'bg-orange-100 dark:bg-orange-900/30'
              : 'bg-emerald-100 dark:bg-emerald-900/30'
          }`}
        >
          {isJob ? (
            <Briefcase className="size-4 text-orange-600 dark:text-orange-400" />
          ) : (
            <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {evt.title}
            </p>
            {/* 3-dot action menu — bookings only */}
            {!isJob && renderActions(evt)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-5 ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              <span className={`size-1.5 rounded-full ${cfg.dot} mr-1`} />
              {cfg.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground capitalize">
              {isJob ? 'Job' : 'Booking'}
            </span>
            {evt.employeeName && (
              <span className="text-[10px] text-muted-foreground truncate">
                · {evt.employeeName}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1 ml-[42px]">
        {evt.scheduledAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3 shrink-0" />
            <span>
              {formatTime(evt.scheduledAt)}
              {evt.scheduledEndTime ? ` – ${formatTime(evt.scheduledEndTime)}` : ''}
            </span>
            {'duration' in evt && evt.duration && (
              <span className="text-muted-foreground/70">({evt.duration}min)</span>
            )}
          </div>
        )}
        {evt.customerName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="size-3 shrink-0" />
            <span>{evt.customerName}</span>
          </div>
        )}
        {evt.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{evt.address}</span>
          </div>
        )}
        {isJob && evt.priority && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRight className="size-3 shrink-0" />
            <span className="capitalize">Priority: {evt.priority}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared Empty State ─────────────────────────────────────────────────────

interface EmptyStateProps {
  onAddEvent: () => void;
}

function EmptyState({ onAddEvent }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <Calendar className="size-10 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No events scheduled</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        onClick={onAddEvent}
      >
        <Plus className="size-3.5 mr-1" /> Add Event
      </Button>
    </div>
  );
}

// ─── Day Detail Sidebar (desktop) ───────────────────────────────────────────

export interface DayDetailSidebarProps {
  /** True when the sidebar should render (null otherwise). */
  open: boolean;
  /** "Friday, August 16, 2025" — already-formatted date label. */
  selectedDateLabel: string;
  /** Events scheduled for the selected date (already filtered+sorted). */
  selectedDateEvents: CalendarEvent[];
  /** Close the sidebar (parent clears `showDetailPanel` + `selectedDate`). */
  onClose: () => void;
  /** Open the create-booking dialog prefilled for this date. */
  onAddEvent: () => void;
  /** Renders the booking 3-dot action menu (or null for job events). */
  renderActions: (evt: CalendarEvent) => ReactNode | null;
}

/**
 * Desktop sidebar panel showing all events for the selected date. Renders as
 * a Card with a sticky header (date label + close button) and either an empty
 * state or a scrollable event-card list. Returns `null` when `open` is false.
 */
export function DayDetailSidebar({
  open,
  selectedDateLabel,
  selectedDateEvents,
  onClose,
  onAddEvent,
  renderActions,
}: DayDetailSidebarProps) {
  if (!open) return null;

  return (
    <div className="lg:w-80 shrink-0">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {selectedDateLabel}
            </CardTitle>
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {selectedDateEvents.length === 0 ? (
            <EmptyState onAddEvent={onAddEvent} />
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2.5">
                {selectedDateEvents.map((evt) => (
                  <EventCard
                    key={evt.id}
                    evt={evt}
                    renderActions={renderActions}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Day Detail Dialog (mobile) ─────────────────────────────────────────────

export interface DayDetailDialogProps {
  /** Controls dialog open state. */
  open: boolean;
  /** Open-state setter (called with `false` on dismiss). */
  onOpenChange: (open: boolean) => void;
  /** "Friday, August 16, 2025" — already-formatted date label. */
  selectedDateLabel: string;
  /** Events scheduled for the selected date (already filtered+sorted). */
  selectedDateEvents: CalendarEvent[];
  /** Open the create-booking dialog prefilled for this date. */
  onAddEvent: () => void;
  /** Renders the booking 3-dot action menu (or null for job events). */
  renderActions: (evt: CalendarEvent) => ReactNode | null;
}

/**
 * Mobile version of {@link DayDetailSidebar} — renders the same event list
 * inside a Dialog for small screens (the desktop sidebar is `hidden lg:block`).
 * Renders nothing when `open` is false.
 */
export function DayDetailDialog({
  open,
  onOpenChange,
  selectedDateLabel,
  selectedDateEvents,
  onAddEvent,
  renderActions,
}: DayDetailDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-[95vw] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-sm">{selectedDateLabel}</DialogTitle>
        </DialogHeader>
        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events scheduled</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={onAddEvent}
            >
              <Plus className="size-3.5 mr-1" /> Add Event
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2.5">
              {selectedDateEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  evt={evt}
                  renderActions={renderActions}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DayDetailDialog;

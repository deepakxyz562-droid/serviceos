'use client';

/**
 * RecurringSchedulesDialog — Phase 5A extraction from invoices-view.tsx.
 *
 * Replaces the inline Recurring Schedules Dialog that used to live inside the
 * parent InvoicesView component's render. The dialog is the management UI for
 * recurring invoice schedules (AMC / subscriptions / maintenance contracts).
 * A cron endpoint at /api/cron/recurring-invoices processes due schedules.
 *
 * Layout:
 *   - Dialog header (CalendarClock icon + title + description)
 *   - Counter ("X schedules · Y active") + "Create Schedule" toggle button
 *   - Inline create/edit form panel (collapsible):
 *       • Schedule Name (Input)
 *       • Customer (Select — populated from the parent's customers list)
 *       • Frequency (Select: weekly / monthly / quarterly / yearly)
 *       • Day of Week / Day of Month (Input — labelled dynamically)
 *       • Amount, Tax %, Currency (Inputs)
 *       • Timezone (Select — IANA tz keys, grouped by region)
 *       • Notes (Textarea)
 *       • Cancel / Save Changes or Create Schedule buttons
 *   - ScrollArea with the list of recurring schedule cards. Each card has:
 *       • Name + Active/Paused badge + Frequency badge + Timezone badge
 *       • Customer name + linked job number
 *       • Amount + tax % (right-aligned)
 *       • Next / Last run + execution count
 *       • Edit / Pause or Resume / Run Now / Deactivate action buttons
 *
 * The component is pure presentational — all state lives in the parent
 * InvoicesView and is threaded through as props.
 *
 * Extracted from src/components/views/invoices-view.tsx (Phase 5A refactor).
 */

import {
  CalendarClock, Plus, PlusCircle, Pencil, Loader2,
  Pause, RotateCcw, Play, Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAMPAIGN_TIMEZONES_GROUPED } from '@/lib/timezones';
import { formatShortDate } from '@/features/invoices/utils/invoice-helpers';
import type {
  Customer,
  RecurringFrequency,
  RecurringSchedule,
  RecurringScheduleForm,
} from '@/features/invoices/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original inline Recurring Schedules Dialog
// reached into from the parent InvoicesView. Each prop below corresponds 1:1
// to a parent state slot or handler; the wiring at the call site just spreads
// them in.
export interface RecurringSchedulesDialogProps {
  /** Whether the outer dialog is open. */
  open: boolean;
  /** Open-change handler. When called with `false`, the parent also clears
   *  the in-progress edit/create state so the next open starts fresh. */
  onOpenChange: (open: boolean) => void;

  // ── Schedule list state ───────────────────────────────────────────────
  /** All loaded recurring schedules (GET /api/recurring-invoices). */
  recurringSchedules: RecurringSchedule[];
  /** True while schedules are being fetched. */
  loadingRecurring: boolean;

  // ── Inline create/edit form ───────────────────────────────────────────
  /** True → the form panel is expanded (visible). */
  showRecurringForm: boolean;
  /** Toggles the form panel between collapsed / expanded. */
  onToggleForm: () => void;
  /** Closes the form panel and resets to create-mode defaults. */
  onCloseForm: () => void;
  /** Current form state. */
  recurringForm: RecurringScheduleForm;
  /** Setter for the form (top-level merge). */
  setRecurringForm: (
    updater:
      | RecurringScheduleForm
      | ((prev: RecurringScheduleForm) => RecurringScheduleForm)
  ) => void;
  /** When non-null, the form is in "edit" mode (PUT) instead of "create" (POST). */
  editingRecurringId: string | null;
  /** True while the create / update request is in-flight. */
  recurringSaving: boolean;
  /** Submit handler — calls handleCreateRecurring or handleUpdateRecurring. */
  onSubmit: () => void;
  /** Open the form pre-filled with an existing schedule (switches to edit mode). */
  onEditSchedule: (schedule: RecurringSchedule) => void;

  // ── Per-row action handlers ───────────────────────────────────────────
  /** POST /api/recurring-invoices/:id with action=run. */
  onRun: (scheduleId: string) => Promise<void> | void;
  /** POST /api/recurring-invoices/:id/pause. */
  onPause: (scheduleId: string) => Promise<void> | void;
  /** POST /api/recurring-invoices/:id/resume. */
  onResume: (scheduleId: string) => Promise<void> | void;
  /** DELETE /api/recurring-invoices/:id. */
  onDeactivate: (scheduleId: string) => Promise<void> | void;
  /** Per-row action loading flags (keyed by `${action}-${scheduleId}`). */
  recurringActionLoading: Record<string, boolean>;

  // ── Customer picker (used by the form panel) ──────────────────────────
  /** All loaded customers. */
  customers: Customer[];
  /** True while customers are being fetched. */
  loadingCustomers: boolean;
}

/**
 * Recurring invoice schedules management dialog. Pure presentational — see
 * props above.
 */
export function RecurringSchedulesDialog({
  open,
  onOpenChange,
  recurringSchedules,
  loadingRecurring,
  showRecurringForm,
  onToggleForm,
  onCloseForm,
  recurringForm,
  setRecurringForm,
  editingRecurringId,
  recurringSaving,
  onSubmit,
  onEditSchedule,
  onRun,
  onPause,
  onResume,
  onDeactivate,
  recurringActionLoading,
  customers,
  loadingCustomers,
}: RecurringSchedulesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-emerald-600" />
            Recurring Invoice Schedules
          </DialogTitle>
          <DialogDescription>
            Recurring invoice schedules automatically generate and send
            invoices on a schedule (e.g. monthly AMC, subscriptions,
            maintenance contracts). A cron endpoint at
            /api/cron/recurring-invoices processes due schedules.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {recurringSchedules.length} schedule
            {recurringSchedules.length === 1 ? '' : 's'} ·{' '}
            {recurringSchedules.filter((s) => s.active).length} active
          </p>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onToggleForm}
          >
            <Plus className="size-3.5 mr-1" />{' '}
            {showRecurringForm ? 'Cancel' : 'Create Schedule'}
          </Button>
        </div>

        {showRecurringForm && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              {editingRecurringId ? (
                <Pencil className="size-4 text-emerald-600" />
              ) : (
                <PlusCircle className="size-4 text-emerald-600" />
              )}
              <h4 className="text-sm font-semibold">
                {editingRecurringId
                  ? 'Edit Recurring Schedule'
                  : 'Create Recurring Schedule'}
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Schedule Name *</Label>
                <Input
                  placeholder="e.g., Monthly AMC - Server Maintenance"
                  value={recurringForm.name}
                  onChange={(e) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Customer *</Label>
                <Select
                  value={recurringForm.customerId}
                  onValueChange={(val) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      customerId: val,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue
                      placeholder={
                        loadingCustomers ? 'Loading...' : 'Select customer'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCustomers ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin" /> Loading...
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No customers found
                      </div>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select
                  value={recurringForm.frequency}
                  onValueChange={(val) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      frequency: val as RecurringFrequency,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {recurringForm.frequency === 'weekly'
                    ? 'Day of Week (0=Sun, 6=Sat)'
                    : 'Day of Month (1-31)'}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={recurringForm.frequency === 'weekly' ? 6 : 31}
                  value={recurringForm.dayOfMonth}
                  onChange={(e) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      dayOfMonth: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={recurringForm.amount}
                  onChange={(e) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={recurringForm.taxPercent}
                  onChange={(e) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      taxPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <Input
                  placeholder="USD"
                  value={recurringForm.currency}
                  onChange={(e) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              {/* Phase F: Timezone picker — empty = server local (backward compat) */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Timezone{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Select
                  // Radix Select treats `value=""` as "no selection" so we use a
                  // sentinel '__server_local__' to represent the legacy
                  // server-local (empty-string) state. Map back/forth in onChange.
                  value={recurringForm.timezone || '__server_local__'}
                  onValueChange={(val) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      timezone: val === '__server_local__' ? '' : val,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Server local time" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* "Clear" option → server-local legacy behavior */}
                    <SelectItem
                      value="__server_local__"
                      className="text-xs italic text-muted-foreground"
                    >
                      Server local time (default)
                    </SelectItem>
                    <SelectSeparator />
                    {CAMPAIGN_TIMEZONES_GROUPED.map((group) => (
                      <SelectGroup key={group.group}>
                        <SelectLabel className="text-[10px] font-semibold uppercase tracking-wide">
                          {group.group}
                        </SelectLabel>
                        {group.options.map((tz) => (
                          <SelectItem
                            key={tz.value}
                            value={tz.value}
                            className="text-xs"
                          >
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  IANA tz key (e.g. Asia/Kolkata). Used to compute next-run in
                  the customer&apos;s local time.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  placeholder="Optional notes for generated invoices"
                  value={recurringForm.notes}
                  onChange={(e) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onCloseForm}>
                {editingRecurringId ? 'Cancel Edit' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={recurringSaving}
                onClick={onSubmit}
              >
                {recurringSaving ? (
                  <>
                    <Loader2 className="size-3.5 mr-1 animate-spin" /> Saving...
                  </>
                ) : editingRecurringId ? (
                  'Save Changes'
                ) : (
                  'Create Schedule'
                )}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[50vh] pr-1">
          {loadingRecurring ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : recurringSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarClock className="size-10 mb-3 opacity-20" />
              <p className="font-medium">No recurring schedules yet</p>
              <p className="text-sm mt-1">
                Create a schedule to automate recurring invoices
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {recurringSchedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold">
                            {schedule.name}
                          </h4>
                          {/* Phase D3: status badge — Active (green) / Paused (amber). */}
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 ${
                              schedule.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {schedule.active ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200 capitalize"
                          >
                            {schedule.frequency}
                          </Badge>
                          {/* Phase F: show the schedule's IANA tz key (if any) so users
                              can see at-a-glance which schedules use customer-local
                              time vs the legacy server-local default. */}
                          {schedule.timezone ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 bg-purple-50 text-purple-700 border-purple-200 font-mono"
                            >
                              {schedule.timezone}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {schedule.customer?.name || '—'}
                          {schedule.job?.jobNumber
                            ? ` · Job ${schedule.job.jobNumber}`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {schedule.currency || 'USD'}{' '}
                          {Number(schedule.amount).toFixed(2)}
                        </p>
                        {schedule.taxPercent ? (
                          <p className="text-[10px] text-muted-foreground">
                            +{schedule.taxPercent}% tax
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>
                          Next:{' '}
                          {schedule.nextRunAt
                            ? formatShortDate(schedule.nextRunAt)
                            : '—'}
                        </span>
                        <span>
                          Last:{' '}
                          {schedule.lastRunAt
                            ? formatShortDate(schedule.lastRunAt)
                            : '—'}
                        </span>
                        <span>Runs: {schedule.executionCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={
                            !!recurringSaving ||
                            !!recurringActionLoading[`run-${schedule.id}`] ||
                            !!recurringActionLoading[
                              `deactivate-${schedule.id}`
                            ] ||
                            !!recurringActionLoading[`pause-${schedule.id}`] ||
                            !!recurringActionLoading[`resume-${schedule.id}`]
                          }
                          onClick={() => onEditSchedule(schedule)}
                          title="Edit schedule"
                        >
                          <Pencil className="size-3 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        {/* Phase D3: Pause (when active) or Resume (when paused) button.
                            Pause hits POST /api/recurring-invoices/[id]/pause;
                            Resume hits POST /api/recurring-invoices/[id]/resume. */}
                        {schedule.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                            disabled={
                              !!recurringActionLoading[
                                `pause-${schedule.id}`
                              ] ||
                              !!recurringActionLoading[`run-${schedule.id}`] ||
                              !!recurringActionLoading[
                                `deactivate-${schedule.id}`
                              ]
                            }
                            onClick={() => onPause(schedule.id)}
                            title="Pause schedule — no new invoices until resumed"
                          >
                            {recurringActionLoading[`pause-${schedule.id}`] ? (
                              <Loader2 className="size-3 mr-1 animate-spin" />
                            ) : (
                              <Pause className="size-3 mr-1" />
                            )}
                            <span className="hidden sm:inline">Pause</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                            disabled={
                              !!recurringActionLoading[
                                `resume-${schedule.id}`
                              ] ||
                              !!recurringActionLoading[
                                `deactivate-${schedule.id}`
                              ]
                            }
                            onClick={() => onResume(schedule.id)}
                            title="Resume schedule — recomputes next run from now"
                          >
                            {recurringActionLoading[`resume-${schedule.id}`] ? (
                              <Loader2 className="size-3 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3 mr-1" />
                            )}
                            <span className="hidden sm:inline">Resume</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={
                            !!recurringActionLoading[`run-${schedule.id}`] ||
                            !schedule.active ||
                            !!recurringActionLoading[`pause-${schedule.id}`] ||
                            !!recurringActionLoading[`resume-${schedule.id}`]
                          }
                          onClick={() => onRun(schedule.id)}
                        >
                          {recurringActionLoading[`run-${schedule.id}`] ? (
                            <Loader2 className="size-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="size-3 mr-1" />
                          )}
                          Run Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={
                            !!recurringActionLoading[
                              `deactivate-${schedule.id}`
                            ] ||
                            !!recurringActionLoading[`pause-${schedule.id}`] ||
                            !!recurringActionLoading[`resume-${schedule.id}`]
                          }
                          onClick={() => onDeactivate(schedule.id)}
                        >
                          {recurringActionLoading[
                            `deactivate-${schedule.id}`
                          ] ? (
                            <Loader2 className="size-3 mr-1 animate-spin" />
                          ) : (
                            <Power className="size-3 mr-1" />
                          )}
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

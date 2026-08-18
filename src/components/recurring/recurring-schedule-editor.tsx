'use client';

/**
 * RecurringScheduleEditor — Shared Recurrence Configuration Component
 * ================================================================
 *
 * The SINGLE component both Create Job (in jobs-view.tsx) and Recurring Jobs
 * New Schedule dialog (recurring-jobs-view.tsx) use for recurrence configuration.
 *
 * Per the user's architectural directive:
 *   - Don't maintain two independent UI implementations.
 *   - The recurrence controls must be IDENTICAL across both entry points.
 *
 * Features:
 *   - One-off / Recurring switch (when `showSwitch=true`, for Create Job form)
 *   - Repeats dropdown: Daily / Weekly / Every 2 weeks / Monthly / As needed / Custom
 *   - Multi-day "Repeat on" weekday picker (M T W T F S S)
 *   - "Every N <unit>" interval
 *   - Monthly: day-of-month OR nth-weekday-of-month ("First Monday", "Last Friday")
 *   - Time range (start → end, end auto-computed from start + duration)
 *   - Duration (minutes)
 *   - Ends: Never / After N visits / On date
 *   - "Generate first job now" toggle (default ON)
 *   - Dynamic schedule summary preview ("Aug 18 → Feb 16 · 27 visits · Weekly on Tuesday")
 *   - Timezone picker
 *
 * The component is CONTROLLED — parent owns the state via `value` + `onChange`.
 *
 * The state shape mirrors what the backend `createRecurringSchedule()` expects,
 * so the parent can pass it directly to the API on submit.
 */

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  calculateOccurrences,
  formatScheduleSummary,
  parseWeekdaysJson,
  type RecurrenceInput,
} from '@/lib/recurrence-engine';

// ─── Types ────────────────────────────────────────────────────────────────

export interface RecurringScheduleValue {
  /** Top-level switch (only used when showSwitch=true, e.g. in Create Job form) */
  enabled?: boolean;
  // Recurrence rules
  frequency: string; // 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed' | 'custom'
  dayOfWeek: number | null; // 0-6
  dayOfMonth: number | null; // 1-31
  weekOfMonth: number | null; // 1-5 (legacy nth-weekday)
  weekdaysJson: string; // JSON array [1,3,5]
  interval: number; // "Every N <unit>" multiplier (default 1)
  nthWeekdayJson: string | null; // {"week":1|2|3|4|5|-1,"weekday":0-6}
  timeOfDay: string | null; // "09:30" 24h start time
  durationMins: number; // visit duration (default 60)
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string | null; // ISO date or null
  endAfterOccurrences: number | null;
  asNeeded: boolean;
  timezone: string | null;
  // First-job behavior
  generateFirstJob: boolean;
  // Billing
  generateInvoice: boolean;
  invoiceTiming: 'on_generation' | 'on_completion';
  /**
   * UI-only: which "Ends" radio is selected.
   *
   * This field drives the radio's selected state INDEPENDENTLY of the
   * `endAfterOccurrences` / `endDate` data fields. Previously `endMode` was
   * purely derived from data (`endAfterOccurrences != null ? 'after' : ...`),
   * which caused two bugs:
   *
   *  1. Stale-closure bug in `setEndMode`: it called `set()` twice in a row,
   *     and each `set()` used the closure's captured `value` — so the second
   *     call OVERWROTE the first call's change. Clicking "After N visits"
   *     appeared to do nothing (the radio snapped back to "Never").
   *
   *  2. The radio's selected state depended on whether `endAfterOccurrences`
   *     had a value, rather than reflecting the user's explicit choice.
   *
   * Making `endMode` a real (optional) field on the value fixes both: the radio
   * reflects the user's intent, and `setEndMode` is a single `onChange` call.
   *
   * For backward compat with schedules created before this field existed,
   * `endMode` falls back to data-based inference when undefined.
   */
  endMode?: 'never' | 'after' | 'on';
}

export const EMPTY_RECURRING_VALUE: RecurringScheduleValue = {
  enabled: false,
  frequency: 'weekly',
  dayOfWeek: 1, // Monday
  dayOfMonth: 1,
  weekOfMonth: null,
  weekdaysJson: '[]',
  interval: 1,
  nthWeekdayJson: null,
  timeOfDay: '09:00',
  durationMins: 60,
  startDate: new Date().toISOString().substring(0, 10),
  endDate: null,
  endAfterOccurrences: null,
  asNeeded: false,
  timezone: null,
  generateFirstJob: true,
  generateInvoice: false,
  invoiceTiming: 'on_completion',
  endMode: 'never',
};

// ─── Preview formatting helpers (presentation-only) ─────────────────────
// These produce the human-readable strings used in the Schedule Preview
// block at the bottom of the editor. They do NOT touch occurrence-generation
// logic — that lives in `calculateOccurrences` / `calculateNextOccurrence`
// in `recurrence-engine.ts`.

const PREVIEW_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function formatPreviewDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return `${PREVIEW_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatPreviewTime(time: string | null): string {
  if (!time) return '—';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export interface RecurringScheduleEditorProps {
  value: RecurringScheduleValue;
  onChange: (next: RecurringScheduleValue) => void;
  /** Show the One-off / Recurring top-level switch (Create Job form). Default false. */
  showSwitch?: boolean;
  /** Show the "Generate first job now" toggle. Default true. */
  showGenerateFirstJob?: boolean;
  /** Show the Billing section. Default true. */
  showBilling?: boolean;
  /** Show the Timezone picker. Default true. */
  showTimezone?: boolean;
  /** Compact layout (for dialogs). Default false. */
  compact?: boolean;
  /** Class name for the root container */
  className?: string;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const DAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const TIMEZONES = [
  // IMPORTANT: Radix UI <SelectItem> forbids empty-string `value` props (throws
  // "A <Select.Item /> must have a value prop that is not an empty string").
  // The previous `{ value: '', label: 'Server local' }` crashed the editor the
  // moment a user toggled "Recurring" ON (the Timezone Select mounted with an
  // empty-value item → React error boundary → "Something went wrong").
  // Fix: use a sentinel string 'server-local' for the UI, and map it back to
  // `null` (the backend's "server local" representation) in `onValueChange`.
  { value: 'server-local', label: 'Server local' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
];

// ─── Component ────────────────────────────────────────────────────────────

export function RecurringScheduleEditor({
  value,
  onChange,
  showSwitch = false,
  showGenerateFirstJob = true,
  showBilling = true,
  showTimezone = true,
  compact = false,
  className,
}: RecurringScheduleEditorProps) {
  const set = <K extends keyof RecurringScheduleValue>(key: K, val: RecurringScheduleValue[K]) => {
    onChange({ ...value, [key]: val });
  };

  // For "After N visits" counter — compute expected visits from engine.
  const expectedVisits = useMemo(() => {
    if (value.asNeeded) return 0;
    const input: RecurrenceInput = {
      frequency: value.frequency,
      dayOfWeek: value.dayOfWeek,
      dayOfMonth: value.dayOfMonth,
      weekOfMonth: value.weekOfMonth,
      weekdaysJson: value.weekdaysJson,
      interval: value.interval,
      nthWeekdayJson: value.nthWeekdayJson,
      timeOfDay: value.timeOfDay,
      durationMins: value.durationMins,
      startDate: value.startDate ? new Date(value.startDate) : new Date(),
      endDate: value.endDate ? new Date(value.endDate) : null,
      endAfterOccurrences: value.endAfterOccurrences,
      asNeeded: value.asNeeded,
      timezone: value.timezone,
    };
    return calculateOccurrences(input, { max: 1000 }).length;
  }, [
    value.frequency, value.dayOfWeek, value.dayOfMonth, value.weekOfMonth,
    value.weekdaysJson, value.interval, value.nthWeekdayJson, value.timeOfDay,
    value.durationMins, value.startDate, value.endDate, value.endAfterOccurrences,
    value.asNeeded, value.timezone,
  ]);

  // ── Multi-day weekly picker handlers ──
  const selectedWeekdays = parseWeekdaysJson(value.weekdaysJson);
  const toggleWeekday = (day: number) => {
    const next = selectedWeekdays.includes(day)
      ? selectedWeekdays.filter((d) => d !== day)
      : [...selectedWeekdays, day].sort((a, b) => a - b);
    set('weekdaysJson', JSON.stringify(next));
  };

  // ── Frequency label helper ──
  const frequencyLabel = useMemo(() => {
    const input: RecurrenceInput = {
      frequency: value.frequency,
      dayOfWeek: value.dayOfWeek,
      dayOfMonth: value.dayOfMonth,
      weekOfMonth: value.weekOfMonth,
      weekdaysJson: value.weekdaysJson,
      interval: value.interval,
      nthWeekdayJson: value.nthWeekdayJson,
      timeOfDay: value.timeOfDay,
      durationMins: value.durationMins,
      startDate: value.startDate ? new Date(value.startDate) : new Date(),
      endDate: value.endDate ? new Date(value.endDate) : null,
      endAfterOccurrences: value.endAfterOccurrences,
      asNeeded: value.asNeeded,
      timezone: value.timezone,
    };
    return formatScheduleSummary(input);
  }, [value]);

  // ── Monthly pattern mode ──
  const monthlyMode: 'day' | 'nth' = value.nthWeekdayJson ? 'nth' : 'day';
  const setMonthlyMode = (mode: 'day' | 'nth') => {
    if (mode === 'nth') {
      // Default to "First Monday" if no nth set yet.
      if (!value.nthWeekdayJson) {
        set('nthWeekdayJson', JSON.stringify({ week: 1, weekday: 1 }));
      }
    } else {
      set('nthWeekdayJson', null);
      set('weekOfMonth', null);
    }
  };

  // ── End condition ──
  // `endMode` is now an explicit field on the value (not just derived from
  // data). This fixes the stale-closure bug where clicking "After N visits"
  // appeared to do nothing because `set()` was called twice in a row, each
  // using the closure's stale `value`, so the second call OVERWROTE the first.
  //
  // We still fall back to data-based inference for backward compat with
  // schedules created before `endMode` was added.
  const endMode: 'never' | 'after' | 'on' =
    value.endMode ??
    (value.endAfterOccurrences != null ? 'after' : value.endDate ? 'on' : 'never');

  const setEndMode = (mode: 'never' | 'after' | 'on') => {
    // CRITICAL: single onChange call. Do NOT call set() multiple times —
    // set() uses the closure's `value`, so successive calls overwrite each
    // other (the classic stale-closure bug that previously made the "Ends"
    // radio snap back to "Never" on every click).
    const next: RecurringScheduleValue = { ...value, endMode: mode };
    if (mode === 'never') {
      // "Never" means no end — null both data fields so the backend / cron
      // runner treats the schedule as ongoing.
      next.endAfterOccurrences = null;
      next.endDate = null;
    } else if (mode === 'after') {
      // Preserve an existing endAfterOccurrences if the user previously typed
      // one; only default to 10 on the first switch into "after".
      next.endAfterOccurrences = value.endAfterOccurrences ?? 10;
      // Null out endDate so the backend uses endAfterOccurrences as the limit.
      next.endDate = null;
    } else if (mode === 'on') {
      // Null out endAfterOccurrences so the backend uses endDate as the limit.
      next.endAfterOccurrences = null;
      // Preserve an existing endDate if the user previously picked one; only
      // default to start+6mo on the first switch into "on".
      if (!value.endDate) {
        const d = new Date(value.startDate);
        d.setMonth(d.getMonth() + 6);
        next.endDate = d.toISOString().substring(0, 10);
      }
    }
    onChange(next);
  };

  // ── Render ──
  return (
    <div className={cn('space-y-4', className)}>
      {/* ─── One-off / Recurring switch (optional) ─── */}
      {showSwitch && (
        <div className="flex items-center gap-2">
          <RadioGroup
            value={value.enabled ? 'recurring' : 'one-off'}
            onValueChange={(v) => set('enabled', v === 'recurring')}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="one-off" id="rec-one-off" />
              <Label htmlFor="rec-one-off" className="cursor-pointer font-medium">
                One-off
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="recurring" id="rec-recurring" />
              <Label htmlFor="rec-recurring" className="cursor-pointer font-medium">
                Recurring
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* If showSwitch=true and not enabled, render nothing else */}
      {showSwitch && !value.enabled ? null : (
        <>
          {/* ─── Start date + Time range ─── */}
          <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-start-date" className="text-xs font-medium">
                Start date
              </Label>
              <Input
                id="rec-start-date"
                type="date"
                className="form-input h-9"
                value={value.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-time" className="text-xs font-medium">
                Start time
              </Label>
              <Input
                id="rec-time"
                type="time"
                className="form-input h-9"
                value={value.timeOfDay ?? ''}
                onChange={(e) => set('timeOfDay', e.target.value || null)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-duration" className="text-xs font-medium">
                Duration (min)
              </Label>
              <Input
                id="rec-duration"
                type="number"
                min="5"
                step="5"
                className="form-input h-9"
                value={value.durationMins}
                onChange={(e) => set('durationMins', Number(e.target.value) || 60)}
              />
            </div>
          </div>

          {/* ─── Repeats dropdown ─── */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rec-frequency" className="text-xs font-medium">
                Repeats
              </Label>
              <Select
                value={value.frequency}
                onValueChange={(v) => {
                  const updates: Partial<RecurringScheduleValue> = { frequency: v };
                  if (v === 'as_needed') {
                    updates.asNeeded = true;
                  } else {
                    updates.asNeeded = false;
                  }
                  // When switching to weekly, default dayOfWeek if not set.
                  if ((v === 'weekly' || v === 'biweekly') && value.dayOfWeek == null) {
                    updates.dayOfWeek = 1;
                  }
                  // When switching to monthly, default dayOfMonth if not set.
                  if (['monthly', 'quarterly', 'annually'].includes(v) && value.dayOfMonth == null) {
                    updates.dayOfMonth = 1;
                  }
                  onChange({ ...value, ...updates });
                }}
              >
                <SelectTrigger className="form-input h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="as_needed">As needed (flexible)</SelectItem>
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interval: "Every N <unit>" — shown when frequency is daily/weekly/monthly/custom */}
            {(value.frequency === 'daily' ||
              value.frequency === 'weekly' ||
              value.frequency === 'biweekly' ||
              value.frequency === 'monthly' ||
              value.frequency === 'custom') && (
              <div className="grid gap-1.5">
                <Label htmlFor="rec-interval" className="text-xs font-medium">
                  Every
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="rec-interval"
                    type="number"
                    min="1"
                    max="12"
                    className="form-input h-9 w-20"
                    value={value.interval}
                    onChange={(e) => set('interval', Math.max(1, Number(e.target.value) || 1))}
                  />
                  <span className="text-xs text-muted-foreground">
                    {value.frequency === 'daily'
                      ? value.interval === 1 ? 'day' : 'days'
                      : value.frequency === 'weekly' || value.frequency === 'custom'
                      ? value.interval === 1 ? 'week' : 'weeks'
                      : value.interval === 1 ? 'month' : 'months'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ─── Repeat-on multi-day picker (weekly/biweekly/custom) ─── */}
          {(value.frequency === 'weekly' ||
            value.frequency === 'biweekly' ||
            value.frequency === 'custom') && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Repeat on</Label>
              <div className="flex items-center gap-1.5">
                {DAY_LABELS.map((label, idx) => {
                  const active = selectedWeekdays.includes(idx);
                  // If no weekdays selected, fall back to single dayOfWeek highlight.
                  const isFallbackSelected =
                    selectedWeekdays.length === 0 && value.dayOfWeek === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      title={WEEKDAY_NAMES[idx]}
                      className={cn(
                        'size-9 rounded-full text-xs font-medium transition-colors flex items-center justify-center',
                        active || isFallbackSelected
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {selectedWeekdays.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Tap one or more days. Currently using {DAY_FULL[value.dayOfWeek ?? 1]} (single day).
                </p>
              )}
            </div>
          )}

          {/* ─── Monthly pattern: day-of-month OR nth-weekday-of-month ─── */}
          {(value.frequency === 'monthly' ||
            value.frequency === 'quarterly' ||
            value.frequency === 'annually') && (
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Day of month</Label>
              <RadioGroup
                value={monthlyMode}
                onValueChange={(v) => setMonthlyMode(v as 'day' | 'nth')}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="day" id="rec-monthly-day" />
                  <Label htmlFor="rec-monthly-day" className="text-xs cursor-pointer">
                    Day
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    className="form-input h-8 w-16"
                    value={value.dayOfMonth ?? 1}
                    onChange={(e) => set('dayOfMonth', Number(e.target.value) || 1)}
                    disabled={monthlyMode !== 'day'}
                  />
                  <span className="text-xs text-muted-foreground">
                    of every {value.interval > 1 ? `${value.interval} ` : ''}
                    {value.frequency === 'quarterly' ? 'quarter' : value.frequency === 'annually' ? 'year' : 'month'}
                    {(!value.interval || value.interval === 1) ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nth" id="rec-monthly-nth" />
                  <Label htmlFor="rec-monthly-nth" className="text-xs cursor-pointer">
                    The
                  </Label>
                  <Select
                    value={(() => {
                      if (!value.nthWeekdayJson) return '1';
                      try {
                        const p = JSON.parse(value.nthWeekdayJson);
                        return String(p.week);
                      } catch { return '1'; }
                    })()}
                    onValueChange={(v) => {
                      const weekday = (() => {
                        if (!value.nthWeekdayJson) return 1;
                        try {
                          const p = JSON.parse(value.nthWeekdayJson);
                          return p.weekday ?? 1;
                        } catch { return 1; }
                      })();
                      set('nthWeekdayJson', JSON.stringify({ week: Number(v), weekday }));
                    }}
                    disabled={monthlyMode !== 'nth'}
                  >
                    <SelectTrigger className="form-input h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">first</SelectItem>
                      <SelectItem value="2">second</SelectItem>
                      <SelectItem value="3">third</SelectItem>
                      <SelectItem value="4">fourth</SelectItem>
                      <SelectItem value="5">fifth</SelectItem>
                      <SelectItem value="-1">last</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={(() => {
                      if (!value.nthWeekdayJson) return '1';
                      try {
                        const p = JSON.parse(value.nthWeekdayJson);
                        return String(p.weekday);
                      } catch { return '1'; }
                    })()}
                    onValueChange={(v) => {
                      const week = (() => {
                        if (!value.nthWeekdayJson) return 1;
                        try {
                          const p = JSON.parse(value.nthWeekdayJson);
                          return p.week ?? 1;
                        } catch { return 1; }
                      })();
                      set('nthWeekdayJson', JSON.stringify({ week, weekday: Number(v) }));
                    }}
                    disabled={monthlyMode !== 'nth'}
                  >
                    <SelectTrigger className="form-input h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_NAMES.map((name, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">of every {value.interval > 1 ? `${value.interval} ` : ''}month{value.interval > 1 ? 's' : ''}</span>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* ─── Ends: Never / After N / On date ─── */}
          {!value.asNeeded && (
            <div className="grid gap-2">
              <Label className="text-xs font-medium">Ends</Label>
              <RadioGroup
                value={endMode}
                onValueChange={(v) => setEndMode(v as 'never' | 'after' | 'on')}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="never" id="rec-ends-never" />
                  <Label htmlFor="rec-ends-never" className="text-xs cursor-pointer">
                    Never
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="after" id="rec-ends-after" />
                  <Label htmlFor="rec-ends-after" className="text-xs cursor-pointer">
                    After
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    className="form-input h-8 w-20"
                    value={value.endAfterOccurrences ?? 10}
                    onChange={(e) => set('endAfterOccurrences', Number(e.target.value) || 10)}
                    disabled={endMode !== 'after'}
                  />
                  <span className="text-xs text-muted-foreground">visits</span>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="on" id="rec-ends-on" />
                  <Label htmlFor="rec-ends-on" className="text-xs cursor-pointer">
                    On
                  </Label>
                  <Input
                    type="date"
                    className="form-input h-8 w-40"
                    value={value.endDate ?? ''}
                    onChange={(e) => set('endDate', e.target.value || null)}
                    disabled={endMode !== 'on'}
                  />
                </div>
              </RadioGroup>
            </div>
          )}

          {/* ─── Generate first job now ─── */}
          {showGenerateFirstJob && !value.asNeeded && (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
              <div className="grid gap-0.5">
                <Label htmlFor="rec-first-job" className="text-xs font-medium cursor-pointer">
                  Generate first job now
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {value.generateFirstJob
                    ? 'Creates the first visit immediately in the same transaction.'
                    : 'Start generating jobs from the next scheduled occurrence.'}
                </p>
              </div>
              <Switch
                id="rec-first-job"
                checked={value.generateFirstJob}
                onCheckedChange={(checked) => set('generateFirstJob', checked)}
              />
            </div>
          )}

          {/* ─── Billing ─── */}
          {showBilling && (
            <div className="grid gap-2 rounded-md border bg-muted/10 px-3 py-2.5">
              <Label className="text-xs font-medium">Billing</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="rec-generate-invoice"
                  checked={value.generateInvoice}
                  onCheckedChange={(checked) => set('generateInvoice', checked)}
                />
                <Label htmlFor="rec-generate-invoice" className="text-xs cursor-pointer">
                  Create invoice automatically
                </Label>
              </div>
              {value.generateInvoice && (
                <RadioGroup
                  value={value.invoiceTiming}
                  onValueChange={(v) => set('invoiceTiming', v as 'on_generation' | 'on_completion')}
                  className="ml-6 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="on_generation" id="rec-inv-gen" />
                    <Label htmlFor="rec-inv-gen" className="text-xs cursor-pointer">
                      When each job is generated
                      <span className="block text-[10px] text-muted-foreground">
                        Creates a draft invoice for each visit
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="on_completion" id="rec-inv-comp" />
                    <Label htmlFor="rec-inv-comp" className="text-xs cursor-pointer">
                      When each job is completed
                      <span className="block text-[10px] text-muted-foreground">
                        Creates a draft invoice after the visit is completed
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              )}
            </div>
          )}

          {/* ─── Timezone ─── */}
          {showTimezone && (
            <div className="grid gap-1.5">
              <Label htmlFor="rec-timezone" className="text-xs font-medium">
                Timezone
              </Label>
              <Select
                value={value.timezone ? value.timezone : 'server-local'}
                onValueChange={(v) => set('timezone', v === 'server-local' ? null : v)}
              >
                <SelectTrigger className="form-input h-9">
                  <SelectValue placeholder="Server local" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Schedule times are interpreted in this timezone (DST-safe).
              </p>
            </div>
          )}

          {/* ─── Schedule Preview (live summary, at the end) ─── */}
          {/* Per UX decision: positioned AFTER the recurrence controls so the
              relationship between inputs → result is obvious. NOT sticky —
              just a normal block at the bottom of the editor. */}
          <div className="rounded-md border bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="size-4 text-emerald-600 shrink-0" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Schedule Preview
              </p>
            </div>
            {value.asNeeded ? (
              <>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Starting {formatPreviewDate(value.startDate)}
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-100">
                  As needed · Flexible schedule
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 mt-1">
                  No automatic generation · First job created manually
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Starting {formatPreviewDate(value.startDate)}
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-100">
                  {frequencyLabel}
                  {' · '}
                  {formatPreviewTime(value.timeOfDay)}
                  {' · '}
                  {value.durationMins} min
                  {' · '}
                  {(() => {
                    if (endMode === 'never') return 'Ongoing';
                    if (endMode === 'after') return `Ends after ${value.endAfterOccurrences ?? 10} visits`;
                    return value.endDate ? `Through ${formatPreviewDate(value.endDate)}` : 'Ongoing';
                  })()}
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 mt-1">
                  {(() => {
                    const firstJobSuffix = value.generateFirstJob
                      ? ' · First job created immediately'
                      : ' · First job via cron';
                    if (endMode === 'never') {
                      return `Ongoing schedule${firstJobSuffix}`;
                    }
                    if (endMode === 'after') {
                      const n = value.endAfterOccurrences ?? 10;
                      return `${n} visit${n === 1 ? '' : 's'} scheduled${firstJobSuffix}`;
                    }
                    // endMode === 'on'
                    const n = expectedVisits;
                    const dateStr = value.endDate ? formatPreviewDate(value.endDate) : '';
                    return `${n} visit${n === 1 ? '' : 's'} scheduled through ${dateStr}${firstJobSuffix}`;
                  })()}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

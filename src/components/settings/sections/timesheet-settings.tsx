'use client';

/**
 * Timesheet Settings section.
 *
 * DB-backed tenant-scoped settings that mirror the Jobber "Timesheet
 * Settings" page: duration totals format, payroll period start day,
 * and timer categories (Break / Driving / Office / Supplies + up to
 * 6 custom). Reads / writes via `/api/settings/timesheet` which
 * persists under `Tenant.settingsJson.timesheetSettings` (no new
 * Prisma models).
 *
 * Pattern follows `work-settings.tsx`: card-based, emerald accents,
 * `space-y-6` rhythm, dark-mode compatible, `sonner` toast on save.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CalendarDays,
  Timer,
  Save,
  Loader2,
  Plus,
  Trash2,
  Coffee,
  Car,
  Building,
  Package,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import type {
  TimesheetSettings,
  TimerCategory,
} from '@/app/api/settings/timesheet/route';

// ─── Static dropdown option lists ────────────────────────────────────────────

const DURATION_FORMAT_OPTIONS: {
  value: 'hours_minutes' | 'decimal';
  label: string;
  example: string;
}[] = [
  { value: 'hours_minutes', label: 'Hours and minutes', example: '8h 15m' },
  { value: 'decimal', label: 'Hours', example: '8.25 hrs' },
];

const PAYROLL_DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

/** Built-in sub-labels mirroring the Jobber spec for the 4 system cats. */
const SYSTEM_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  break: 'Time for unpaid breaks. These will not count towards regular hours.',
  driving:
    'Time spent driving between job sites. Counts towards total worked time.',
  office:
    'Time spent on administrative work, dispatch, or pre-job preparation.',
  supplies:
    'Time spent picking up materials or supplies for a job.',
};

/** Lucide icon per built-in system category — adds visual scanning. */
const SYSTEM_CATEGORY_ICONS: Record<string, typeof Coffee> = {
  break: Coffee,
  driving: Car,
  office: Building,
  supplies: Package,
};

const MAX_CATEGORIES = 10;
const MAX_CUSTOMS = 6;

const DEFAULT_SETTINGS: TimesheetSettings = {
  durationFormat: 'hours_minutes',
  payrollPeriodStartDay: 0,
  timerCategories: [
    { id: 'break', label: 'Break', isPaid: false, isSystem: true },
    { id: 'driving', label: 'Driving', isPaid: true, isSystem: true },
    { id: 'office', label: 'Office', isPaid: true, isSystem: true },
    { id: 'supplies', label: 'Supplies', isPaid: true, isSystem: true },
  ],
};

export function TimesheetSettings() {
  const [settings, setSettings] = useState<TimesheetSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/timesheet', { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as { settings: TimesheetSettings };
        if (data.settings) {
          // Deep-merge with defaults to guard against missing keys.
          setSettings({
            durationFormat: data.settings.durationFormat ?? DEFAULT_SETTINGS.durationFormat,
            payrollPeriodStartDay:
              data.settings.payrollPeriodStartDay ?? DEFAULT_SETTINGS.payrollPeriodStartDay,
            timerCategories:
              Array.isArray(data.settings.timerCategories) &&
              data.settings.timerCategories.length > 0
                ? data.settings.timerCategories
                : DEFAULT_SETTINGS.timerCategories,
          });
        }
      } else if (res.status === 401) {
        toast.error('Sign in required to view timesheet settings.');
      } else {
        toast.error('Failed to load timesheet settings.');
      }
    } catch {
      toast.error('Network error loading timesheet settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/settings/timesheet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = (await res.json()) as { settings: TimesheetSettings };
        if (data.settings) setSettings(data.settings);
        toast.success('Timesheet settings saved');
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to save timesheet settings');
      }
    } catch {
      toast.error('Network error saving timesheet settings');
    } finally {
      setSaving(false);
    }
  };

  // ─── Convenience setters ──────────────────────────────────────────────────
  const updateDurationFormat = (v: 'hours_minutes' | 'decimal') =>
    setSettings((s) => ({ ...s, durationFormat: v }));
  const updatePayrollStartDay = (v: number) =>
    setSettings((s) => ({ ...s, payrollPeriodStartDay: v }));

  const updateCategory = (id: string, patch: Partial<TimerCategory>) =>
    setSettings((s) => ({
      ...s,
      timerCategories: s.timerCategories.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));

  const addCustomCategory = () => {
    setSettings((s) => {
      if (s.timerCategories.length >= MAX_CATEGORIES) return s;
      // Compute the next custom id — re-number so it's always 1..N.
      const customCount = s.timerCategories.filter((c) => !c.isSystem).length;
      const nextN = Math.min(customCount + 1, MAX_CUSTOMS);
      const next: TimerCategory = {
        id: `custom_${nextN}`,
        label: '',
        isPaid: true,
        isSystem: false,
      };
      return { ...s, timerCategories: [...s.timerCategories, next] };
    });
  };

  const removeCategory = (id: string) =>
    setSettings((s) => ({
      ...s,
      timerCategories: s.timerCategories
        .filter((c) => c.id !== id || c.isSystem)
        // Re-number remaining customs so ids stay stable: custom_1..custom_N
        .map((c, _idx, arr) => {
          if (c.isSystem) return c;
          const customsBefore = arr
            .slice(0, arr.findIndex((x) => x.id === c.id))
            .filter((x) => !x.isSystem).length;
          return { ...c, id: `custom_${customsBefore + 1}` };
        }),
    }));

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-9 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const customCount = settings.timerCategories.filter((c) => !c.isSystem).length;
  const addDisabled = settings.timerCategories.length >= MAX_CATEGORIES || customCount >= MAX_CUSTOMS;

  return (
    <div className="space-y-6">
      {/* ─── Duration Totals Format ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Duration Totals Format</CardTitle>
              <CardDescription>This will apply only to duration totals.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Display duration totals as</Label>
            <Select
              value={settings.durationFormat}
              onValueChange={(v) =>
                updateDurationFormat(v as 'hours_minutes' | 'decimal')
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select duration format" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label} ({o.example})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Applies to totals only — individual time entries are still shown with
              their start and end times.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Payroll Period ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <CalendarDays className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Payroll Period</CardTitle>
              <CardDescription>
                Select the day your payroll period starts.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payroll period start day</Label>
            <Select
              value={String(settings.payrollPeriodStartDay)}
              onValueChange={(v) => updatePayrollStartDay(parseInt(v, 10))}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a day" />
              </SelectTrigger>
              <SelectContent>
                {PAYROLL_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used to group time entries into weekly payroll runs on the timesheet.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Timers ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Timer className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">Timers</CardTitle>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  New
                </Badge>
              </div>
              <CardDescription>
                Control what timers will be available for your team. Renaming applies to
                new entries only. Existing time entries keep their current label.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.timerCategories.map((cat) => {
            const Icon = cat.isSystem ? SYSTEM_CATEGORY_ICONS[cat.id] : null;
            const description = cat.isSystem ? SYSTEM_CATEGORY_DESCRIPTIONS[cat.id] : null;
            return (
              <div
                key={cat.id}
                className="rounded-lg border p-3 sm:p-4 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Label input */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {Icon && (
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <Input
                        value={cat.label}
                        placeholder={cat.isSystem ? cat.label : 'Custom timer label'}
                        onChange={(e) => updateCategory(cat.id, { label: e.target.value })}
                        aria-label={`Timer label for ${cat.id}`}
                      />
                    </div>
                    {description && (
                      <p className="text-xs text-muted-foreground pl-6">{description}</p>
                    )}
                  </div>

                  {/* Paid toggle */}
                  <div className="flex items-center gap-2 sm:gap-3 sm:pl-3">
                    <Label
                      htmlFor={`paid-${cat.id}`}
                      className="text-xs text-muted-foreground whitespace-nowrap"
                    >
                      Paid
                    </Label>
                    <Switch
                      id={`paid-${cat.id}`}
                      checked={cat.isPaid}
                      onCheckedChange={(v) => updateCategory(cat.id, { isPaid: v })}
                      // `break` is always unpaid — hard-disable the toggle.
                      disabled={cat.id === 'break'}
                      aria-label={`Toggle paid for ${cat.label || cat.id}`}
                    />

                    {/* Delete button (disabled for system cats). */}
                    {cat.isSystem ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={0} aria-label="Built-in categories cannot be deleted">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              className="text-muted-foreground/50"
                              aria-label="Cannot delete built-in category"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Built-in categories cannot be deleted
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeCategory(cat.id)}
                        aria-label={`Delete ${cat.label || cat.id} timer`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Separator />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {customCount} of {MAX_CUSTOMS} custom timers used ({settings.timerCategories.length}/{MAX_CATEGORIES} total).
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addCustomCategory}
              disabled={addDisabled}
            >
              <Plus className="size-3.5" /> Add timer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3.5" />
          Renames apply to new time entries only — existing entries keep their label.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

'use client';

/**
 * Work Settings section.
 *
 * DB-backed tenant-scoped settings that mirror the Jobber / ServiceTitan
 * "Work settings" page: Quotes, Jobs, Invoices, Statements, and Chemical
 * Tracking. Reads / writes via `/api/settings/work` which persists under
 * `Tenant.settingsJson.workSettings` (no new Prisma models).
 *
 * Pattern follows `company-settings.tsx`: card-based, emerald accents,
 * `space-y-6` rhythm, dark-mode compatible, `sonner` toast on save.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  CalendarClock,
  FileText,
  Beaker,
  Bell,
  Save,
  Loader2,
  Plus,
  Clock,
  CalendarDays,
  StickyNote,
  Users,
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import type { WorkSettings } from '@/app/api/settings/work/route';

// ─── Static dropdown option lists ────────────────────────────────────────────

const ARRIVAL_WINDOW_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: '15m', label: '15 min' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hr' },
  { value: '2h', label: '2 hr' },
  { value: '3h', label: '3 hr' },
  { value: '4h', label: '4 hr' },
];

const PAYMENT_TERM_OPTIONS: { value: string; label: string; days: number | string }[] = [
  { value: 'due_on_receipt', label: 'Due upon receipt', days: 0 },
  { value: 'net_7', label: 'Net 7', days: 7 },
  { value: 'net_15', label: 'Net 15', days: 15 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_45', label: 'Net 45', days: 45 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'end_of_month', label: 'End of the month', days: 'EOM' },
  { value: 'end_of_next_month', label: 'End of next month', days: 'EOM+1' },
];

const DEFAULT_SETTINGS: WorkSettings = {
  quotes: { reminderEnabled: false, reminderDays: 3 },
  jobs: {
    defaultArrivalWindow: 'none',
    arrivalWindowStyle: 'after',
    visitTitleTemplate: '{{CLIENT_NAME}} - {{JOB_TITLE}}',
  },
  invoices: {
    subject: 'For Services Rendered',
    useQuoteJobTitle: false,
    defaultResidentialTerm: 'due_on_receipt',
    defaultCommercialTerm: 'net_30',
    invoiceRemindersAssigneeId: null,
  },
  statements: { sortOrder: 'newest', contractDisclaimer: '' },
  chemicalTracking: { enabled: false },
};

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
}

export function WorkSettings() {
  const [settings, setSettings] = useState<WorkSettings>(DEFAULT_SETTINGS);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/work', { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as { settings: WorkSettings; employees: EmployeeOption[] };
        // Deep-merge with defaults to guard against missing keys.
        setSettings({
          quotes: { ...DEFAULT_SETTINGS.quotes, ...data.settings?.quotes },
          jobs: { ...DEFAULT_SETTINGS.jobs, ...data.settings?.jobs },
          invoices: { ...DEFAULT_SETTINGS.invoices, ...data.settings?.invoices },
          statements: { ...DEFAULT_SETTINGS.statements, ...data.settings?.statements },
          chemicalTracking: { ...DEFAULT_SETTINGS.chemicalTracking, ...data.settings?.chemicalTracking },
        });
        setEmployees(data.employees || []);
      } else if (res.status === 401) {
        toast.error('Sign in required to view work settings.');
      } else {
        toast.error('Failed to load work settings.');
      }
    } catch {
      toast.error('Network error loading work settings.');
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
      const res = await authFetch('/api/settings/work', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = (await res.json()) as { settings: WorkSettings };
        if (data.settings) setSettings(data.settings);
        toast.success('Work settings saved successfully');
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to save work settings');
      }
    } catch {
      toast.error('Network error saving work settings');
    } finally {
      setSaving(false);
    }
  };

  // Convenience setters for nested keys.
  const updateQuotes = (patch: Partial<WorkSettings['quotes']>) =>
    setSettings((s) => ({ ...s, quotes: { ...s.quotes, ...patch } }));
  const updateJobs = (patch: Partial<WorkSettings['jobs']>) =>
    setSettings((s) => ({ ...s, jobs: { ...s.jobs, ...patch } }));
  const updateInvoices = (patch: Partial<WorkSettings['invoices']>) =>
    setSettings((s) => ({ ...s, invoices: { ...s.invoices, ...patch } }));
  const updateStatements = (patch: Partial<WorkSettings['statements']>) =>
    setSettings((s) => ({ ...s, statements: { ...s.statements, ...patch } }));
  const updateChemical = (patch: Partial<WorkSettings['chemicalTracking']>) =>
    setSettings((s) => ({ ...s, chemicalTracking: { ...s.chemicalTracking, ...patch } }));

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* ─── Quotes ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Briefcase className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Quotes</CardTitle>
              <CardDescription>Configure how your team handles quote reminders and follow-ups</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Reminder</Label>
              <p className="text-xs text-muted-foreground">
                Add a reminder to your calendar to check in on quotes that haven&apos;t been converted after N days.
              </p>
            </div>
            <Switch
              checked={settings.quotes.reminderEnabled}
              onCheckedChange={(v) => updateQuotes({ reminderEnabled: v })}
              aria-label="Toggle quote reminder"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reminder days</Label>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                type="number"
                min={1}
                max={365}
                value={String(settings.quotes.reminderDays)}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  updateQuotes({ reminderDays: Number.isFinite(n) && n > 0 ? n : 1 });
                }}
                disabled={!settings.quotes.reminderEnabled}
                aria-label="Reminder days"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
            </div>
            {!settings.quotes.reminderEnabled && (
              <p className="text-xs text-muted-foreground">
                Enable the reminder above to set the number of days.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Jobs ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <CalendarClock className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Jobs</CardTitle>
              <CardDescription>Defaults for arrival windows and visit titles on scheduled jobs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Default arrival window</Label>
            <Select
              value={settings.jobs.defaultArrivalWindow}
              onValueChange={(v) => updateJobs({ defaultArrivalWindow: v })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select arrival window" />
              </SelectTrigger>
              <SelectContent>
                {ARRIVAL_WINDOW_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The default arrival window applied to new job visits when no specific time is set.
            </p>
          </div>

          {settings.jobs.defaultArrivalWindow !== 'none' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">Arrival window style</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={
                      'flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ' +
                      (settings.jobs.arrivalWindowStyle === 'after'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-input hover:bg-accent')
                    }
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="arrivalWindowStyle"
                        className="accent-emerald-600"
                        checked={settings.jobs.arrivalWindowStyle === 'after'}
                        onChange={() => updateJobs({ arrivalWindowStyle: 'after' })}
                      />
                      <span className="text-sm font-medium">Add window after start time</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-6">ex. 9:00 AM – 10:00 AM</span>
                  </label>
                  <label
                    className={
                      'flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ' +
                      (settings.jobs.arrivalWindowStyle === 'center'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-input hover:bg-accent')
                    }
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="arrivalWindowStyle"
                        className="accent-emerald-600"
                        checked={settings.jobs.arrivalWindowStyle === 'center'}
                        onChange={() => updateJobs({ arrivalWindowStyle: 'center' })}
                      />
                      <span className="text-sm font-medium">Center window on start time</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-6">ex. 8:30 AM – 9:30 AM</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <StickyNote className="size-3.5" /> Visit title template
            </Label>
            <Input
              placeholder="{{CLIENT_NAME}} - {{JOB_TITLE}}"
              value={settings.jobs.visitTitleTemplate}
              onChange={(e) => updateJobs({ visitTitleTemplate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use variables like <code className="rounded bg-muted px-1 py-0.5">{'{{CLIENT_NAME}}'}</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5">{'{{JOB_TITLE}}'}</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5">{'{{VISIT_DATE}}'}</code>, and{' '}
              <code className="rounded bg-muted px-1 py-0.5">{'{{ASSIGNEE_NAME}}'}</code> to compose visit titles automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Invoices ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <FileText className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Invoices</CardTitle>
              <CardDescription>Invoice subjects, default payment terms, and reminder assignee</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Invoice subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Invoice subject</Label>
            <Input
              placeholder="For Services Rendered"
              value={settings.invoices.subject}
              onChange={(e) => updateInvoices({ subject: e.target.value })}
            />
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="useQuoteJobTitle"
                checked={settings.invoices.useQuoteJobTitle}
                onCheckedChange={(v) => updateInvoices({ useQuoteJobTitle: v === true })}
              />
              <Label htmlFor="useQuoteJobTitle" className="text-sm font-normal cursor-pointer">
                Use quote or job title as invoice subject if available
              </Label>
            </div>
          </div>

          <Separator />

          {/* Payment terms */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Payment terms</Label>
              <p className="text-xs text-muted-foreground">
                Default terms applied to residential and commercial invoices.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Default residential term</Label>
                <Select
                  value={settings.invoices.defaultResidentialTerm}
                  onValueChange={(v) => updateInvoices({ defaultResidentialTerm: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select residential term" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERM_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Default commercial term</Label>
                <Select
                  value={settings.invoices.defaultCommercialTerm}
                  onValueChange={(v) => updateInvoices({ defaultCommercialTerm: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select commercial term" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERM_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Terms table — static reference of the available payment terms */}
            <div className="rounded-lg border">
              <div className="grid grid-cols-2 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Term name</span>
                <span className="text-right">Number of days</span>
              </div>
              <div className="divide-y">
                {PAYMENT_TERM_OPTIONS.map((o) => (
                  <div key={o.value} className="grid grid-cols-2 px-3 py-2 text-sm">
                    <span>{o.label}</span>
                    <span className="text-right text-muted-foreground">
                      {o.days === 0 ? '0' : o.days}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                toast.info('Custom payment terms are coming soon.', {
                  description: 'Available on Connect, Grow, and Plus plans.',
                })
              }
            >
              <Plus className="size-3.5" /> Add New
            </Button>
          </div>

          <Separator />

          {/* Invoice reminders */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Bell className="size-3.5" /> Invoice reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Reassign all incomplete invoice reminders to a specific team member.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor="assignee">
                Reassign all incomplete invoice reminders
              </Label>
              <Select
                value={settings.invoices.invoiceRemindersAssigneeId ?? '__none__'}
                onValueChange={(v) =>
                  updateInvoices({ invoiceRemindersAssigneeId: v === '__none__' ? null : v })
                }
              >
                <SelectTrigger id="assignee" className="sm:flex-1">
                  <SelectValue placeholder="Select an assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No one</SelectItem>
                  {employees.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      No team members available
                    </SelectItem>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Statements ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <CalendarDays className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Statements</CardTitle>
              <CardDescription>Billing statement sort order and disclaimer footer</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort order of billing history</Label>
            <Select
              value={settings.statements.sortOrder}
              onValueChange={(v: 'newest' | 'oldest') => updateStatements({ sortOrder: v })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contract / disclaimer</Label>
            <Textarea
              placeholder="This message will appear at the bottom of every statement."
              value={settings.statements.contractDisclaimer}
              onChange={(e) => updateStatements({ contractDisclaimer: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This message will appear at the bottom of every statement.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Chemical tracking ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Beaker className="size-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">Chemical tracking</CardTitle>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Connect, Grow, &amp; Plus plan feature
                </Badge>
              </div>
              <CardDescription>Track chemical and pesticide usage across jobs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Track chemical and pesticide usage</Label>
              <p className="text-xs text-muted-foreground">
                Chemical tracking will appear in your settings under Business Management once enabled.
              </p>
            </div>
            <Switch
              checked={settings.chemicalTracking.enabled}
              onCheckedChange={(v) => updateChemical({ enabled: v })}
              aria-label="Toggle chemical tracking"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3.5" />
          Changes apply to all new quotes, jobs, invoices, and statements going forward.
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

      {/* Helpful footer note for the assignee source */}
      {employees.length === 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users className="size-3.5" />
          Add team members under Manage Team to populate the invoice reminder assignee list.
        </p>
      )}
    </div>
  );
}

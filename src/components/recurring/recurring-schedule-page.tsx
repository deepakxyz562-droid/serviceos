'use client';

// ─── RecurringSchedulePage — full-page create/edit form ─────────────────────
//
// Shared by both /recurring-jobs/new (mode='create') and
// /recurring-jobs/[id]/edit (mode='edit'). This is a STANDALONE Next.js route
// page, NOT a modal — it replaces the legacy dialog-based editor inside
// RecurringJobsView (which still exists as the SPA fallback per user
// decision D).
//
// Architecture:
//   - This is a 'use client' component — it needs useEffect/useRouter/useState.
//   - It fetches supporting data (customers, employees, services, checklists)
//     on mount, then renders the form. The recurrence config section delegates
//     to the shared <RecurringScheduleEditor /> (the SAME component Create Job
//     uses), guaranteeing identical recurrence UX across both entry points.
//   - On submit, it POSTs to /api/recurring-jobs (create) or PUTs to
//     /api/recurring-jobs/[id] (edit). The body shape mirrors the
//     RecurringScheduleValue interface so the backend's createRecurringSchedule
//     domain service consumes it directly.
//
// In edit mode, we map DB → RecurringScheduleValue on load (inverse of what
// the POST endpoint does). See `scheduleToForm()` below.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Loader2,
  Save,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  RecurringScheduleEditor,
  EMPTY_RECURRING_VALUE,
  type RecurringScheduleValue,
} from '@/components/recurring/recurring-schedule-editor';

import { apiGet, authFetch } from '@/lib/api';
import { CustomerSelect } from '@/components/shared/customer-select';
import {
  formatSchedulePreview,
  type RecurrenceInput,
} from '@/lib/recurrence-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface Employee {
  id: string;
  name: string;
  role?: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
}

interface Checklist {
  id: string;
  title: string;
  category?: string | null;
}

interface LineItem {
  description: string;
  quantity: string;
  rate: string;
}

interface ScheduleForm {
  title: string;
  customerId: string;
  description: string;
  visitInstructions: string;
  assigneeIds: string[];
  serviceId: string;
  checklistIds: string[];
  lineItems: LineItem[];
  recurring: RecurringScheduleValue;
}

const EMPTY_FORM: ScheduleForm = {
  title: '',
  customerId: '',
  description: '',
  visitInstructions: '',
  assigneeIds: [],
  serviceId: '',
  checklistIds: [],
  lineItems: [],
  recurring: { ...EMPTY_RECURRING_VALUE, enabled: true },
};

export interface RecurringSchedulePageProps {
  mode: 'create' | 'edit';
  scheduleId?: string;
  onBack: () => void;
  onSaved: (id?: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecurringSchedulePage({ mode, scheduleId, onBack, onSaved }: RecurringSchedulePageProps) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);

  const [loadingSupporting, setLoadingSupporting] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // ─── Load supporting data (employees/services/checklists) ──────────────
  // Performance fix: reduced limits from 200 → 50. These are supporting
  // datasets for the form, not the full list. 50 is enough for most tenants;
  // if a tenant has more, the select components should use server-side search.
  // Customers are NO LONGER fetched upfront — the CustomerSelect component
  // does debounced server-side search on demand (max 10 results).
  const loadSupporting = useCallback(async () => {
    try {
      setLoadingSupporting(true);
      const [empRes, svcRes, chkRes] = await Promise.all([
        authFetch('/api/employees?limit=50'),
        authFetch('/api/services?limit=50'),
        authFetch('/api/checklists?limit=50'),
      ]);
      if (empRes.ok) {
        const d = await empRes.json();
        setEmployees(d.employees || d || []);
      }
      if (svcRes.ok) {
        const d = await svcRes.json();
        setServices(d.services || d || []);
      }
      if (chkRes.ok) {
        const d = await chkRes.json();
        setChecklists(Array.isArray(d) ? d : d.checklists || []);
      }
    } catch (err) {
      console.error('[RecurringSchedulePage] failed to load supporting data:', err);
      toast.error('Failed to load employees or services.');
    } finally {
      setLoadingSupporting(false);
    }
  }, []);

  // ─── Load existing schedule (edit mode only) ────────────────────────────
  // NOTE: apiGet() in @/lib/api does NOT throw on HTTP 4xx/5xx — it just returns
  // the parsed JSON body. We need to inspect the response shape ourselves to
  // distinguish success ({ schedule, recentJobs }) from failure ({ error }).
  const loadSchedule = useCallback(async () => {
    if (!isEdit || !scheduleId) return;
    try {
      setLoadingSchedule(true);
      const data = await apiGet<
        | { schedule: Record<string, unknown>; recentJobs?: unknown[] }
        | { error: string }
      >(`/api/recurring-jobs/${scheduleId}`);
      if (data && 'error' in data) {
        throw new Error(data.error);
      }
      if (!data || !data.schedule) {
        throw new Error('Schedule not found');
      }
      setForm(scheduleToForm(data.schedule));
    } catch (err) {
      console.error('[RecurringSchedulePage] failed to load schedule:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to load schedule. It may have been deleted.';
      toast.error(message);
      onBack();
    } finally {
      setLoadingSchedule(false);
    }
  }, [isEdit, scheduleId, onBack]);

  useEffect(() => {
    loadSupporting();
  }, [loadSupporting]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ─── Live schedule preview ──────────────────────────────────────────────
  const preview = useMemo(() => {
    const r = form.recurring;
    const input: RecurrenceInput = {
      frequency: r.frequency,
      dayOfWeek: r.dayOfWeek,
      dayOfMonth: r.dayOfMonth,
      weekOfMonth: r.weekOfMonth,
      weekdaysJson: r.weekdaysJson,
      interval: r.interval,
      nthWeekdayJson: r.nthWeekdayJson,
      timeOfDay: r.timeOfDay,
      durationMins: r.durationMins,
      startDate: r.startDate ? new Date(r.startDate) : new Date(),
      endDate: r.endDate ? new Date(r.endDate) : null,
      endAfterOccurrences: r.endAfterOccurrences,
      asNeeded: r.asNeeded,
      timezone: r.timezone,
    };
    return formatSchedulePreview(input);
  }, [form.recurring]);

  // ─── Form helpers ────────────────────────────────────────────────────────
  const set = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((a) => a !== id)
        : [...f.assigneeIds, id],
    }));
  };

  const toggleChecklist = (id: string) => {
    setForm((f) => ({
      ...f,
      checklistIds: f.checklistIds.includes(id)
        ? f.checklistIds.filter((c) => c !== id)
        : [...f.checklistIds, id],
    }));
  };

  const addLineItem = () =>
    setForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { description: '', quantity: '1', rate: '0' }],
    }));

  const removeLineItem = (idx: number) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

  const updateLineItem = (
    idx: number,
    field: keyof LineItem,
    value: string,
  ) =>
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li, i) => (i === idx ? { ...li, [field]: value } : li)),
    }));

  // ─── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.customerId) {
      toast.error('Please select a customer');
      return;
    }
    const r = form.recurring;
    if (!r.startDate) {
      toast.error('Start date is required');
      return;
    }

    const payload = {
      title: form.title.trim(),
      customerId: form.customerId || null,
      description: form.description.trim() || null,
      visitInstructions: form.visitInstructions.trim() || null,
      assigneeIds: form.assigneeIds,
      serviceId: form.serviceId || null,
      checklistIds: form.checklistIds,
      lineItemsJson: JSON.stringify(form.lineItems.filter((li) => li.description.trim())),
      // Recurrence rules (from the shared editor — identical shape to Create Job)
      frequency: r.frequency,
      dayOfWeek: r.dayOfWeek,
      dayOfMonth: r.dayOfMonth,
      weekOfMonth: r.weekOfMonth,
      weekdaysJson: r.weekdaysJson,
      interval: r.interval,
      nthWeekdayJson: r.nthWeekdayJson,
      timeOfDay: r.timeOfDay,
      durationMins: r.durationMins,
      startDate: r.startDate,
      endDate: r.endDate || null,
      endAfterOccurrences: r.endAfterOccurrences,
      asNeeded: r.asNeeded,
      timezone: r.timezone,
      generateFirstJob: r.generateFirstJob,
      generateInvoice: r.generateInvoice,
      invoiceTiming: r.invoiceTiming,
    };

    try {
      setSubmitting(true);
      // IMPORTANT: apiPut/apiPost in @/lib/api do NOT throw on HTTP 4xx/5xx —
      // they just return the parsed JSON. So we use authFetch and check res.ok
      // ourselves, then parse the JSON body to extract the server-side error
      // message. This is what surfaces plan-gate (402) and validation (400)
      // failures to the user as a toast instead of a misleading success.
      const headers = { 'Content-Type': 'application/json' };
      if (isEdit && scheduleId) {
        const res = await authFetch(`/api/recurring-jobs/${scheduleId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          let message = `Failed to update schedule (HTTP ${res.status})`;
          try {
            const err = await res.json();
            if (err?.error) message = err.error;
            else if (err?.message) message = err.message;
          } catch {
            // ignore JSON parse error
          }
          throw new Error(message);
        }
        toast.success('Schedule updated');
        onSaved(scheduleId);
      } else {
        const res = await authFetch('/api/recurring-jobs', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          let message = `Failed to create schedule (HTTP ${res.status})`;
          try {
            const err = await res.json();
            if (err?.error) message = err.error;
            else if (err?.message) message = err.message;
          } catch {
            // ignore JSON parse error
          }
          throw new Error(message);
        }
        const result = (await res.json()) as {
          id?: string;
          firstJobCreated?: boolean;
          schedule?: { id: string };
        };
        toast.success(
          result?.firstJobCreated
            ? 'Schedule created — first job generated'
            : 'Schedule created',
        );
        const newId = result?.schedule?.id || result?.id;
        onSaved(newId);
      }
    } catch (err) {
      console.error('[RecurringSchedulePage] save failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message)
            : 'Failed to save schedule';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state (edit mode loads the schedule first) ─────────────────
  if (loadingSchedule) {
    return (
      <main className="p-4 sm:p-6 w-full space-y-6">
        <SchedulePageHeaderSkeleton />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <main className="p-4 sm:p-6 w-full space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-4 mr-1.5" />
            Recurring Jobs
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Edit Recurring Job Schedule' : 'New Recurring Job Schedule'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure how and when visits are scheduled.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={submitting}
          >
            <X className="size-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={submitting || loadingSupporting}
          >
            {submitting ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : isEdit ? (
              <Save className="size-4 mr-1.5" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            {isEdit ? 'Save changes' : 'Create Schedule'}
          </Button>
        </div>
      </header>

      {/* ─── Live preview banner ────────────────────────────────────────── */}
      <div className="rounded-md border bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <CalendarClock className="size-4 mt-0.5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              {preview}
            </p>
            {!form.recurring.asNeeded && (
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                {isEdit
                  ? 'Updates to schedule timing apply to the next generated visit.'
                  : form.recurring.generateFirstJob
                    ? 'A first visit will be created when you save.'
                    : 'Visits start on the next scheduled date after you save.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Job details ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job details</CardTitle>
          <CardDescription>
            The title, customer, and team that will be applied to every generated job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSupporting ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Monthly HVAC inspection"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">
                    Customer <span className="text-destructive">*</span>
                  </Label>
                  <CustomerSelect
                    value={form.customerId}
                    onChange={(id) => set('customerId', id || '')}
                    initialCustomer={form.customerId ? (() => {
                      const c = customers.find((c) => c.id === form.customerId);
                      return c ? { id: c.id, name: c.name, phone: c.phone } : null;
                    })() : null}
                    placeholder="Search customer…"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="serviceId">Service (optional)</Label>
                  <Select
                    value={form.serviceId || '__none__'}
                    onValueChange={(v) => set('serviceId', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger id="serviceId">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="__none__">— None —</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Optional notes about this schedule"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>

              {/* Assignees */}
              <div className="grid gap-2">
                <Label>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> Assignees
                  </span>
                </Label>
                {employees.length === 0 ? (
                  <div className="rounded-md border border-dashed border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      No team members yet
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                      Add employees in your workspace first to assign them to
                      generated visits. You can still save the schedule without
                      assignees.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid gap-2">
                    {employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={form.assigneeIds.includes(emp.id)}
                          onCheckedChange={() => toggleAssignee(emp.id)}
                        />
                        <span>{emp.name}</span>
                        {emp.role && (
                          <span className="text-xs text-muted-foreground">({emp.role})</span>
                        )}
                        {form.assigneeIds[0] === emp.id && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            primary
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  The first selected assignee becomes the primary for every generated job.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="visitInstructions">Visit instructions</Label>
                <Textarea
                  id="visitInstructions"
                  rows={3}
                  placeholder="Notes shown to the assigned employee on-site"
                  value={form.visitInstructions}
                  onChange={(e) => set('visitInstructions', e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Schedule (shared editor — identical to Create Job) ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="size-4" /> Schedule
          </CardTitle>
          <CardDescription>
            How often, when, and for how long this recurring schedule runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecurringScheduleEditor
            value={form.recurring}
            onChange={(next) => set('recurring', next)}
            showSwitch={false}
            // Hide the "Generate first job now" toggle in edit mode — the
            // first job was already generated at create time and PUT does NOT
            // honor this field, so showing it would be misleading.
            showGenerateFirstJob={!isEdit}
            showBilling
            showTimezone
          />
        </CardContent>
      </Card>

      {/* ─── Checklists ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="size-4" /> Checklists
          </CardTitle>
          <CardDescription>
            Attach checklist templates to every generated job — captured on-site by the assignee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSupporting ? (
            <Skeleton className="h-24 w-full" />
          ) : checklists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No checklist templates exist yet. Create one first to attach it here.
            </p>
          ) : (
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid gap-2">
              {checklists.map((chk) => (
                <label
                  key={chk.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={form.checklistIds.includes(chk.id)}
                    onCheckedChange={() => toggleChecklist(chk.id)}
                  />
                  <span>{chk.title}</span>
                  {chk.category && (
                    <span className="text-xs text-muted-foreground">({chk.category})</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Line items ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items (copied to generated jobs)</CardTitle>
          <CardDescription>
            Default itemized list every generated job starts with. Editable per job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No line items. Generated jobs will start with an empty list.
            </p>
          ) : (
            <div className="space-y-2">
              {form.lineItems.map((li, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-12 sm:col-span-6"
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  />
                  <Input
                    className="col-span-4 sm:col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                  />
                  <Input
                    className="col-span-6 sm:col-span-3"
                    type="number"
                    placeholder="Rate"
                    value={li.rate}
                    onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="col-span-2 sm:col-span-1"
                    onClick={() => removeLineItem(idx)}
                    aria-label="Remove line item"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <CheckCircle2 className="size-3.5 mr-1.5" /> Add line item
          </Button>
        </CardContent>
      </Card>

      {/* ─── Bottom action bar ─────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 mt-6 border-t bg-background/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground hidden sm:block">
          <User className="size-3 inline mr-1" />
          {isEdit ? 'Editing existing schedule' : 'Creating a new schedule'}
        </p>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={submitting || loadingSupporting}
          >
            {submitting ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : isEdit ? (
              <Save className="size-4 mr-1.5" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            {isEdit ? 'Save changes' : 'Create Schedule'}
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map a DB schedule row (snake_case Prisma fields) → the form's `ScheduleForm`
 * shape. This is the INVERSE of what the POST endpoint does in
 * src/app/api/recurring-jobs/route.ts.
 *
 * Field-by-field mapping notes:
 *  - assigneeIdsJson → string[] (parse JSON)
 *  - checklistIdsJson → string[] (parse JSON)
 *  - lineItemsJson → LineItem[] (parse JSON, coerce to strings)
 *  - startDate/endDate → ISO date strings sliced to YYYY-MM-DD for the
 *    <input type="date">
 *  - The shared editor wants `enabled=true` here because we always render it
 *    expanded (no showSwitch). The DB has no `enabled` column — once a schedule
 *    exists, it IS recurring.
 */
function scheduleToForm(s: Record<string, unknown>): ScheduleForm {
  const parseStrArr = (json: unknown): string[] => {
    if (typeof json !== 'string' || !json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  };

  const parseLineItems = (json: unknown): LineItem[] => {
    if (typeof json !== 'string' || !json) return [];
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((li: Record<string, unknown>) => ({
        description: String(li?.description ?? ''),
        quantity: String(li?.quantity ?? '1'),
        rate: String(li?.rate ?? '0'),
      }));
    } catch {
      return [];
    }
  };

  const toDateString = (iso: unknown): string | null => {
    if (!iso || typeof iso !== 'string') return null;
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return null;
    }
  };

  const recurring: RecurringScheduleValue = {
    enabled: true,
    frequency: (s.frequency as string) || 'weekly',
    dayOfWeek: s.dayOfWeek == null ? null : Number(s.dayOfWeek),
    dayOfMonth: s.dayOfMonth == null ? null : Number(s.dayOfMonth),
    weekOfMonth: s.weekOfMonth == null ? null : Number(s.weekOfMonth),
    weekdaysJson: (s.weekdaysJson as string) || '[]',
    interval: s.interval == null ? 1 : Number(s.interval),
    nthWeekdayJson: (s.nthWeekdayJson as string | null) ?? null,
    timeOfDay: (s.timeOfDay as string | null) ?? null,
    durationMins: s.durationMins == null ? 60 : Number(s.durationMins),
    startDate: toDateString(s.startDate) ?? new Date().toISOString().slice(0, 10),
    endDate: toDateString(s.endDate),
    endAfterOccurrences:
      s.endAfterOccurrences == null ? null : Number(s.endAfterOccurrences),
    asNeeded: Boolean(s.asNeeded),
    timezone: (s.timezone as string | null) ?? null,
    generateFirstJob: false, // not relevant for edit — first job already exists & PUT doesn't read this field
    generateInvoice: Boolean(s.generateInvoice),
    invoiceTiming:
      s.invoiceTiming === 'on_generation' ? 'on_generation' : 'on_completion',
  };

  return {
    title: (s.title as string) || '',
    customerId: (s.customerId as string) || '',
    description: (s.description as string) || '',
    visitInstructions: (s.visitInstructions as string) || '',
    assigneeIds: parseStrArr(s.assigneeIdsJson),
    serviceId: (s.serviceId as string) || '',
    checklistIds: parseStrArr(s.checklistIdsJson),
    lineItems: parseLineItems(s.lineItemsJson),
    recurring,
  };
}

// ─── Skeleton pieces ────────────────────────────────────────────────────────

function SchedulePageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

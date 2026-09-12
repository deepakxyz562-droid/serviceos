'use client';

/**
 * RecurringSchedulePage — Modern 2-Column Jobber-Style Create/Edit Surface
 * =======================================================================
 *
 * Provides a responsive 2-column layout matching JobFormPage and BookingFormPage:
 *
 *   Top Header: FormPageHeader with Back navigation, title, Cancel & Save actions.
 *   Left Column (Main Content - 8 cols / ~67%):
 *     1. Title & Client (CustomerPicker + Schedule Title & Description)
 *     2. Recurrence Rhythm & Timing (RecurringScheduleEditor + Live Preview banner)
 *     3. Products & Services (Line items table with unit pricing & real-time total)
 *     4. Scope & Visit Instructions (Guidelines displayed to on-site technicians)
 *   Right Column (Sidebar - 4 cols / ~33%):
 *     1. Team & Technician Assignment (Multi-assignee picker with primary tag)
 *     2. Automated Billing & Invoicing (Auto-generate invoice toggle + timing)
 *     3. Quality Checklists (Attach SOP inspection templates to each visit)
 *     4. Schedule Summary & Status (Recurrence overview & first run date)
 *   Bottom Action Bar: Sticky bar with Cancel and Primary Save actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Repeat,
  Save,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import { CustomerPicker } from '@/features/line-items';

import {
  RecurringScheduleEditor,
  EMPTY_RECURRING_VALUE,
  type RecurringScheduleValue,
} from '@/components/recurring/recurring-schedule-editor';

import { apiGet, authFetch } from '@/lib/api';
import {
  formatSchedulePreview,
  type RecurrenceInput,
} from '@/lib/recurrence-engine';
import { cn } from '@/lib/utils';

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

export function RecurringSchedulePage({
  mode,
  scheduleId,
  onBack,
  onSaved,
}: RecurringSchedulePageProps) {
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

  // Line items calculated subtotal
  const lineItemsSubtotal = useMemo(() => {
    return form.lineItems.reduce((acc, li) => {
      const q = parseFloat(li.quantity) || 0;
      const r = parseFloat(li.rate) || 0;
      return acc + q * r;
    }, 0);
  }, [form.lineItems]);

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
            // ignore
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
            // ignore
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
            ? 'Schedule created — first visit generated'
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

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loadingSchedule) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
        <SchedulePageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <main className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      {/* ─── 1. Header ────────────────────────────────────────────────────── */}
      <FormPageHeader
        title={isEdit ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
        subtitle="Configure repeat service intervals, customer details, line items, and automated dispatch."
        onBack={onBack}
        backLabel="Recurring Jobs"
        primaryAction={{
          label: isEdit ? 'Save Changes' : 'Create Schedule',
          onClick: handleSubmit,
          disabled: submitting || loadingSupporting,
          loading: submitting,
          icon: isEdit ? Save : CheckCircle2,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: onBack,
          disabled: submitting,
        }}
      />

      {/* ─── 2. Responsive 2-Column Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── LEFT COLUMN: Main Content (8 cols / ~67%) ─────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Title & Client */}
          <FormSectionCard
            title="Title & Client"
            description="The title and customer profile associated with this recurring schedule."
            icon={Repeat}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sched-title" className="text-xs font-semibold">
                  Schedule Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sched-title"
                  placeholder="e.g. Monthly Commercial HVAC Maintenance & Filter Replacement"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={200}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Customer <span className="text-destructive">*</span>
                </Label>
                <CustomerPicker
                  selectedCustomerId={form.customerId}
                  selectedCustomer={
                    form.customerId
                      ? {
                          id: form.customerId,
                          name: customers.find((c) => c.id === form.customerId)?.name || '',
                          phone: customers.find((c) => c.id === form.customerId)?.phone,
                        }
                      : null
                  }
                  onPick={(c) => set('customerId', c.id)}
                  onClear={() => set('customerId', '')}
                  onCustomerCreated={(c) => set('customerId', c.id)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sched-desc" className="text-xs font-semibold">
                  Schedule Notes / Description
                </Label>
                <Textarea
                  id="sched-desc"
                  rows={2}
                  placeholder="Add any context, account numbers, or notes for this recurring contract..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="text-xs sm:text-sm resize-y"
                />
              </div>
            </div>
          </FormSectionCard>

          {/* Section 2: Recurrence Rhythm & Timing */}
          <FormSectionCard
            title="Recurrence Rhythm & Schedule"
            description="Control how often, on which days, and at what times visits are automatically created."
            icon={CalendarClock}
          >
            <div className="space-y-4">
              {/* Dynamic Live Schedule Preview Banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
                <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Repeat className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    {preview}
                  </p>
                  <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 mt-0.5">
                    {isEdit
                      ? 'Timing updates will apply to the next generated visit.'
                      : form.recurring.generateFirstJob
                        ? 'A first visit will be created immediately upon saving.'
                        : 'Visits will start generating automatically on the first scheduled date.'}
                  </p>
                </div>
              </div>

              {/* Shared Recurrence Editor */}
              <div className="pt-2">
                <RecurringScheduleEditor
                  value={form.recurring}
                  onChange={(next) => set('recurring', next)}
                  showSwitch={false}
                  showGenerateFirstJob={!isEdit}
                  showBilling={false}
                  showTimezone
                />
              </div>
            </div>
          </FormSectionCard>

          {/* Section 3: Scope & Visit Instructions */}
          <FormSectionCard
            title="On-Site Visit Instructions"
            description="Work scope and guidelines displayed directly to technicians on each generated visit."
            icon={ClipboardList}
          >
            <div className="space-y-1.5">
              <Textarea
                id="sched-instructions"
                rows={3}
                placeholder="e.g. Enter through side loading dock. Check in with property manager on arrival. Check filter gauges before replacing."
                value={form.visitInstructions}
                onChange={(e) => set('visitInstructions', e.target.value)}
                className="text-xs sm:text-sm resize-y"
              />
            </div>
          </FormSectionCard>

          {/* Section 4: Products & Services (Line Items) */}
          <FormSectionCard
            title="Products, Services & Line Items"
            description="Default itemized items and labor rates copied to every generated visit."
            icon={FileText}
          >
            <div className="space-y-4">
              {/* Optional Primary Service dropdown */}
              {services.length > 0 && (
                <div className="space-y-1.5 max-w-sm">
                  <Label htmlFor="sched-service" className="text-xs font-semibold">
                    Primary Service Category
                  </Label>
                  <Select
                    value={form.serviceId || '__none__'}
                    onValueChange={(v) => set('serviceId', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger id="sched-service" className="h-9 text-xs">
                      <SelectValue placeholder="— Select service category —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Line items table */}
              {form.lineItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-6 text-center space-y-2 bg-muted/20">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No default line items added. Each generated job will start with an empty invoice items list.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-8 text-xs gap-1.5">
                    <Plus className="size-3.5" /> Add First Line Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {form.lineItems.map((li, idx) => {
                      const rowTotal = (parseFloat(li.quantity) || 0) * (parseFloat(li.rate) || 0);
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border/60 bg-muted/20"
                        >
                          <div className="col-span-12 sm:col-span-6">
                            <Input
                              placeholder="Item description or service title"
                              value={li.description}
                              onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={li.quantity}
                              onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                              className="h-8 text-xs"
                              min="0"
                              step="any"
                            />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <Input
                              type="number"
                              placeholder="Rate"
                              value={li.rate}
                              onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                              className="h-8 text-xs"
                              min="0"
                              step="any"
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-1 text-right text-xs font-semibold text-foreground">
                            ${rowTotal.toFixed(2)}
                          </div>
                          <div className="col-span-1 sm:col-span-1 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLineItem(idx)}
                              aria-label="Remove item"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-8 text-xs gap-1.5">
                      <Plus className="size-3.5" /> Add Line Item
                    </Button>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground mr-2">Estimated Visit Subtotal:</span>
                      <span className="text-sm font-bold text-foreground">
                        ${lineItemsSubtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FormSectionCard>
        </div>

        {/* ─── RIGHT COLUMN: Sidebar (4 cols / ~33%) ─────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 1: Team & Technician Assignment */}
          <FormSectionCard
            title="Assigned Technicians"
            description="Assign field staff to every generated visit."
            icon={Users}
          >
            <div className="space-y-3">
              {employees.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold">No employees found</p>
                  <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Visits will be created unassigned until team members are added.
                  </p>
                </div>
              ) : (
                <div className="border border-border/70 rounded-xl p-2.5 max-h-56 overflow-y-auto space-y-1.5 divide-y divide-border/40">
                  {employees.map((emp) => {
                    const isSelected = form.assigneeIds.includes(emp.id);
                    const isPrimary = form.assigneeIds[0] === emp.id;
                    return (
                      <label
                        key={emp.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors pt-2 first:pt-1.5',
                          isSelected ? 'bg-emerald-500/10' : 'hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAssignee(emp.id)}
                          />
                          <Avatar className="size-7 rounded-md text-[11px] font-bold border">
                            <AvatarFallback className="rounded-md">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{emp.name}</p>
                            {emp.role && (
                              <p className="text-[10px] text-muted-foreground truncate">{emp.role}</p>
                            )}
                          </div>
                        </div>
                        {isPrimary && (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4">
                            Primary
                          </Badge>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                The first selected technician is designated as the primary assignee.
              </p>
            </div>
          </FormSectionCard>

          {/* Section 2: Automated Invoicing & Billing */}
          <FormSectionCard
            title="Billing & Invoicing Automation"
            description="Automatically generate drafts or invoices per visit."
            icon={DollarSign}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <Label htmlFor="sched-gen-inv" className="text-xs font-semibold cursor-pointer">
                    Auto-Generate Invoice
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Create invoice automatically when visits trigger
                  </p>
                </div>
                <Switch
                  id="sched-gen-inv"
                  checked={form.recurring.generateInvoice}
                  onCheckedChange={(val) =>
                    set('recurring', { ...form.recurring, generateInvoice: val })
                  }
                />
              </div>

              {form.recurring.generateInvoice && (
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <Label htmlFor="sched-inv-timing" className="text-xs font-semibold">
                    Invoice Creation Trigger
                  </Label>
                  <Select
                    value={form.recurring.invoiceTiming}
                    onValueChange={(val: 'on_generation' | 'on_completion') =>
                      set('recurring', { ...form.recurring, invoiceTiming: val })
                    }
                  >
                    <SelectTrigger id="sched-inv-timing" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_completion">
                        When visit is completed by technician
                      </SelectItem>
                      <SelectItem value="on_generation">
                        Immediately when visit is generated
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </FormSectionCard>

          {/* Section 3: Quality Checklists */}
          <FormSectionCard
            title="Quality & Inspection Checklists"
            description="Attach standard operating procedures to every visit."
            icon={ListChecks}
          >
            <div className="space-y-3">
              {checklists.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No checklist templates available. Create templates in Checklists to attach them here.
                </p>
              ) : (
                <div className="border border-border/70 rounded-xl p-2.5 max-h-48 overflow-y-auto space-y-1.5 divide-y divide-border/40">
                  {checklists.map((chk) => {
                    const isChecked = form.checklistIds.includes(chk.id);
                    return (
                      <label
                        key={chk.id}
                        className={cn(
                          'flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors pt-2 first:pt-1.5',
                          isChecked ? 'bg-emerald-500/10' : 'hover:bg-muted/40'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleChecklist(chk.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{chk.title}</p>
                          {chk.category && (
                            <p className="text-[10px] text-muted-foreground truncate">{chk.category}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </FormSectionCard>

          {/* Section 4: Schedule Status & Information */}
          <FormSectionCard
            title="Schedule Configuration"
            description="Overview of initial automation settings."
            icon={Zap}
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Frequency Rhythm:</span>
                <Badge variant="outline" className="font-semibold text-xs capitalize">
                  {form.recurring.frequency}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-medium text-foreground">
                  {form.recurring.startDate || 'Today'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Default Time:</span>
                <span className="font-medium text-foreground">
                  {form.recurring.timeOfDay || '09:00'} ({form.recurring.durationMins || 60}m)
                </span>
              </div>
              {form.recurring.timezone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timezone:</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">
                    {form.recurring.timezone}
                  </span>
                </div>
              )}
            </div>
          </FormSectionCard>
        </div>
      </div>

      {/* ─── 3. Sticky Bottom Action Bar ──────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 mt-8 border-t border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg">
        <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
          <Repeat className="size-3.5 text-emerald-600" />
          <span>{isEdit ? 'Editing recurring schedule' : 'Configuring new recurring schedule'}</span>
        </p>

        <div className="flex items-center gap-2.5 ml-auto">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={submitting}
            className="h-9 text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 shadow-xs h-9 text-xs sm:text-sm font-semibold px-5"
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
            {isEdit ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    generateFirstJob: false,
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SchedulePageHeaderSkeleton() {
  return (
    <div className="space-y-2 pb-2 border-b">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}

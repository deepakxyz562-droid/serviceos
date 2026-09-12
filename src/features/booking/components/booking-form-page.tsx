'use client';

/**
 * BookingFormPage
 * ===============
 * Modern 2-column Jobber-style Create/Edit Booking page.
 *
 * Provides a responsive full-page layout consistent with New Job, New Lead,
 * New Quote, and New Invoice:
 *
 *   Top Header: FormPageHeader with Back button, title, and primary actions.
 *   Left Column (Main Content):
 *     1. Title & Client (CustomerPicker + contact details fallback)
 *     2. Products & Services (LineItemsSection with real-time totals & catalog picker)
 *     3. Schedule & Timing (Date/Time picker, quick duration chips, end-time preview)
 *     4. Scope & Customer Instructions (Description textarea)
 *   Right Column (Sidebar):
 *     1. Team Assignment (Unassigned / Assign Now / Auto Assign with employee picker)
 *     2. Booking Status & Source (Status with colored badges + Source selector)
 *     3. Service Location (Address input synced with Customer properties)
 *     4. Financials & Internal Notes (Subtotal summary + Internal Team Notes)
 *   Bottom Action Bar: Sticky bar with Save Booking, Save & Assign, and Save & Create Job.
 */

import { useState, useMemo } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  MapPin,
  ClipboardList,
  FileText,
  DollarSign,
  StickyNote,
  Users,
  Tag,
  Briefcase,
  UserCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import {
  type CatalogService,
  type LineItem,
  lineItemsSubtotal,
  CreateCustomerDialog,
  CreatePropertyDialog,
  CustomerPicker,
  LineItemsSection,
} from '@/features/line-items';
import {
  STATUS_CONFIG,
  STATUS_OPTIONS,
  SOURCE_OPTIONS,
} from '@/features/booking/utils/booking-helpers';
import type {
  Booking,
  BookingFormData,
  EmployeeOption,
  ServiceOption,
  CustomerOption,
} from '@/features/booking/types';

export interface BookingFormPageProps {
  /** Booking being edited, or null when creating a new one. */
  editingBooking: Booking | null;
  /** Current form state. */
  formData: BookingFormData;
  /** Setter for form state. */
  setFormData: (updater: BookingFormData | ((prev: BookingFormData) => BookingFormData)) => void;
  /** Primary save handler. */
  onSave: () => void;
  /** Save and immediately open employee dispatch / assignment. */
  onSaveAndAssign?: () => void;
  /** Save and convert directly to a new Job. */
  onSaveAndCreateJob?: () => void;
  /** Cancel / Back to list handler. */
  onCancel: () => void;
  /** True while the request is in-flight. */
  saving: boolean;

  // ── Customer picker ───────────────────────────────────────────────────────
  customers: CustomerOption[];
  onPickCustomer: (c: CustomerOption) => void;
  customerQuery?: string;
  setCustomerQuery?: (v: string) => void;
  customerPickerOpen?: boolean;
  setCustomerPickerOpen?: (v: boolean) => void;
  onOpenCreateCustomer?: (nameQuery: string) => void;

  // ── Create-customer & Create-property dialogs ─────────────────────────────
  showCreateCustomerDialog?: boolean;
  setShowCreateCustomerDialog?: (v: boolean) => void;
  createCustomerPrefill?: { name: string; phone?: string; email?: string };
  onCustomerCreated?: (c: CustomerOption) => void;

  // ── Service catalog & Line items ──────────────────────────────────────────
  services: ServiceOption[];
  onServiceCreated?: (svc: CatalogService) => void;
  /** Currency symbol (defaults to "$"). */
  symbol?: string;

  // ── Employees ─────────────────────────────────────────────────────────────
  employees: EmployeeOption[];
}

const DURATION_PRESETS = [
  { label: '30m', value: '30' },
  { label: '45m', value: '45' },
  { label: '1h', value: '60' },
  { label: '1.5h', value: '90' },
  { label: '2h', value: '120' },
  { label: '3h', value: '180' },
  { label: '4h', value: '240' },
];

export function BookingFormPage({
  editingBooking,
  formData,
  setFormData,
  onSave,
  onSaveAndAssign,
  onSaveAndCreateJob,
  onCancel,
  saving,
  customers,
  customerQuery = '',
  setCustomerQuery,
  customerPickerOpen = false,
  setCustomerPickerOpen,
  onPickCustomer,
  onOpenCreateCustomer,
  showCreateCustomerDialog = false,
  setShowCreateCustomerDialog,
  createCustomerPrefill,
  onCustomerCreated,
  services,
  onServiceCreated,
  symbol = '$',
  employees,
}: BookingFormPageProps) {
  // Local dialog state for adding a property
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);

  // Convert ServiceOption[] to CatalogService[] for LineItemsSection
  const catalogServices: CatalogService[] = useMemo(() => {
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      basePrice: s.basePrice,
      duration: s.duration,
      unitPrice: s.basePrice,
      unitType: 'fixed',
      serviceType: 'service',
      isActive: s.isActive,
    }));
  }, [services]);

  // Find currently selected customer
  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return customers.find((c) => c.id === formData.customerId) || null;
  }, [customers, formData.customerId]);

  // Compute subtotal from line items
  const subtotal = useMemo(() => {
    return lineItemsSubtotal(formData.lineItems || []);
  }, [formData.lineItems]);

  // Compute calculated end time based on scheduledAt + duration
  const scheduledEndTimeFormatted = useMemo(() => {
    if (!formData.scheduledAt) return null;
    try {
      const start = new Date(formData.scheduledAt);
      if (isNaN(start.getTime())) return null;
      const durationMins = parseInt(formData.duration, 10) || 60;
      const end = new Date(start.getTime() + durationMins * 60 * 1000);
      return end.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }, [formData.scheduledAt, formData.duration]);

  function updateField<K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Handle line item changes
  function handleLineItemsChange(items: LineItem[]) {
    setFormData((prev) => ({
      ...prev,
      lineItems: items,
      // If serviceId is empty and first item has serviceId, sync it
      serviceId: items[0]?.serviceId || prev.serviceId,
    }));
  }

  // Quick date pickers (+Today, +Tomorrow, +Next Monday)
  function setQuickDate(daysFromNow: number, defaultHour = 9) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(defaultHour, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    updateField('scheduledAt', localISOTime);
  }

  const isFormValid = formData.title.trim().length > 0;

  return (
    <div className="w-full space-y-6 pb-28">
      {/* ── STICKY TOP HEADER ── */}
      <FormPageHeader
        onBack={onCancel}
        icon={CalendarCheck}
        title={editingBooking ? `Edit Booking: ${editingBooking.title}` : 'New Booking'}
        subtitle={
          editingBooking
            ? `Update booking schedule, team assignment, and service details`
            : 'Schedule a customer appointment or service booking'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            {onSaveAndCreateJob && !editingBooking && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                onClick={onSaveAndCreateJob}
                disabled={!isFormValid || saving}
              >
                <Briefcase className="size-4 mr-1.5" />
                Save & Create Job
              </Button>
            )}
            {onSaveAndAssign && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden md:inline-flex text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800"
                onClick={onSaveAndAssign}
                disabled={!isFormValid || saving}
              >
                <UserCheck className="size-4 mr-1.5" />
                Save & Assign
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={onSave}
              disabled={!isFormValid || saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="size-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarCheck className="size-4 mr-1.5" />
                  {editingBooking ? 'Save Changes' : 'Save Booking'}
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* ── 2-COLUMN MAIN CONTENT (100% Width) ── */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-6 items-start">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: Main Form Details                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-6 min-w-0">
            {/* 1. Title & Client Card */}
            <FormSectionCard
              icon={CalendarCheck}
              title="Booking Title & Client"
              description="Name this booking and attach an existing customer or enter contact info."
            >
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="booking-title" className="text-sm font-semibold">
                    Booking Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="booking-title"
                    placeholder="e.g. AC Maintenance & Filter Replacement"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="h-10 text-base"
                    autoFocus={!editingBooking}
                  />
                </div>

                <div className="pt-2 border-t border-border/60 space-y-3">
                  <Label className="text-sm font-semibold flex items-center justify-between">
                    <span>Client Details</span>
                    {selectedCustomer && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Selected: {selectedCustomer.name}
                      </Badge>
                    )}
                  </Label>

                  <CustomerPicker
                    selectedCustomerId={formData.customerId}
                    selectedCustomer={selectedCustomer}
                    selectedAddress={formData.address}
                    customers={customers}
                    onPick={(c) => {
                      onPickCustomer(c);
                      updateField('customerId', c.id);
                      updateField('customerName', c.name);
                      updateField('customerPhone', c.phone || '');
                      updateField('customerEmail', c.email || '');
                      if (c.address) {
                        updateField('address', c.address);
                      }
                    }}
                    onClear={() => {
                      updateField('customerId', '');
                      updateField('customerName', '');
                      updateField('customerPhone', '');
                      updateField('customerEmail', '');
                    }}
                    onAddressSelect={(addr) => updateField('address', addr)}
                    onCustomAddressChange={(addr) => updateField('address', addr)}
                    onAddAddressClick={() => setShowPropertyDialog(true)}
                  />

                  {/* Manual fallback input fields if no customer from picker is linked */}
                  {!selectedCustomer && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1">
                        <Label htmlFor="cust-name-manual" className="text-xs text-muted-foreground">
                          Contact Name
                        </Label>
                        <Input
                          id="cust-name-manual"
                          placeholder="John Doe"
                          value={formData.customerName}
                          onChange={(e) => updateField('customerName', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cust-phone-manual" className="text-xs text-muted-foreground">
                          Phone Number
                        </Label>
                        <Input
                          id="cust-phone-manual"
                          placeholder="+1 234 567 890"
                          value={formData.customerPhone}
                          onChange={(e) => updateField('customerPhone', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cust-email-manual" className="text-xs text-muted-foreground">
                          Email Address
                        </Label>
                        <Input
                          id="cust-email-manual"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.customerEmail}
                          onChange={(e) => updateField('customerEmail', e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FormSectionCard>

            {/* 2. Products & Services (Line Items) */}
            <FormSectionCard
              icon={ClipboardList}
              title="Products & Services"
              description="Add services or products included in this booking."
              badge={
                (formData.lineItems?.length || 0) > 0 ? (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formData.lineItems.length} item{formData.lineItems.length === 1 ? '' : 's'} · {symbol}
                    {subtotal.toFixed(2)}
                  </Badge>
                ) : undefined
              }
            >
              <LineItemsSection
                items={formData.lineItems || []}
                services={catalogServices}
                onChange={handleLineItemsChange}
                onServicesUpdate={(svc) => onServiceCreated?.(svc)}
                symbol={symbol}
              />
            </FormSectionCard>

            {/* 3. Schedule & Timing */}
            <FormSectionCard
              icon={CalendarDays}
              title="Schedule & Timing"
              description="Set the date, start time, and estimated duration for this appointment."
            >
              <div className="space-y-4">
                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Quick Select:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setQuickDate(0, 9)}
                  >
                    Today 9 AM
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setQuickDate(0, 14)}
                  >
                    Today 2 PM
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setQuickDate(1, 10)}
                  >
                    Tomorrow 10 AM
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-scheduledAt" className="text-sm font-medium">
                      Date & Start Time
                    </Label>
                    <Input
                      id="booking-scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => updateField('scheduledAt', e.target.value)}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="booking-duration" className="text-sm font-medium">
                        Duration (Minutes)
                      </Label>
                      {scheduledEndTimeFormatted && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3 text-emerald-600" />
                          Ends approx. {scheduledEndTimeFormatted}
                        </span>
                      )}
                    </div>
                    <Input
                      id="booking-duration"
                      type="number"
                      min="5"
                      step="5"
                      placeholder="60"
                      value={formData.duration}
                      onChange={(e) => updateField('duration', e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Duration preset pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">Duration chips:</span>
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => updateField('duration', preset.value)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                        formData.duration === preset.value
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-background hover:bg-accent text-foreground border-border'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </FormSectionCard>

            {/* 4. Scope & Customer Instructions */}
            <FormSectionCard
              icon={FileText}
              title="Scope & Customer Instructions"
              description="Special requests, entry codes, instructions, or scope summary."
            >
              <Textarea
                placeholder="e.g. Customer requested gate code #4492. Dogs in backyard must stay inside during service."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="resize-y"
              />
            </FormSectionCard>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: Sidebar Metadata & Actions                       */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-6 min-w-0">
            {/* 1. Team Assignment */}
            <FormSectionCard
              icon={Users}
              title="Team Assignment"
              description="Assign to a technician or use auto-dispatch."
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-lg">
                  {(
                    [
                      { value: 'unassigned', label: 'Unassigned' },
                      { value: 'assign_now', label: 'Assign Now' },
                      { value: 'auto_assign', label: 'Auto' },
                    ] as const
                  ).map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-8 text-xs font-medium ${
                        formData.assignmentType === opt.value
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => updateField('assignmentType', opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>

                {formData.assignmentType === 'assign_now' && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="booking-employeeId" className="text-xs font-medium">
                      Select Technician / Team Member
                    </Label>
                    <Select
                      value={formData.employeeId || '_none'}
                      onValueChange={(v) => updateField('employeeId', v === '_none' ? '' : v)}
                    >
                      <SelectTrigger id="booking-employeeId" className="h-9">
                        <SelectValue placeholder="Choose employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Select an employee —</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                            {emp.role && (
                              <span className="text-xs text-muted-foreground ml-1.5">
                                ({emp.role})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.assignmentType === 'auto_assign' && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <Zap className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      Smart dispatch will auto-assign the best matching technician based on real-time availability and workload.
                    </span>
                  </div>
                )}
              </div>
            </FormSectionCard>

            {/* 2. Status & Source */}
            <FormSectionCard
              icon={Tag}
              title="Status & Source"
            >
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="booking-status" className="text-xs font-medium">
                    Booking Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => updateField('status', v)}
                  >
                    <SelectTrigger id="booking-status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => {
                        const cfg = STATUS_CONFIG[s.value];
                        return (
                          <SelectItem key={s.value} value={s.value}>
                            <div className="flex items-center gap-2">
                              <span
                                className={`size-2 rounded-full ${
                                  cfg ? cfg.bgClass : 'bg-muted'
                                }`}
                              />
                              {s.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="booking-source" className="text-xs font-medium">
                    Lead / Booking Source
                  </Label>
                  <Select
                    value={formData.source}
                    onValueChange={(v) => updateField('source', v)}
                  >
                    <SelectTrigger id="booking-source" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSectionCard>

            {/* 3. Service Location */}
            <FormSectionCard
              icon={MapPin}
              title="Service Location"
              description="Address where work will be performed."
            >
              <div className="space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="123 Main Street, Suite 100, City..."
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="pl-8.5 h-9 text-sm"
                  />
                </div>
                {selectedCustomer?.properties && selectedCustomer.properties.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tip: Use the &ldquo;Change Address&rdquo; dropdown in Client Details to switch between saved properties.
                  </p>
                )}
              </div>
            </FormSectionCard>

            {/* 4. Financials & Internal Notes */}
            <FormSectionCard
              icon={DollarSign}
              title="Summary & Internal Notes"
            >
              <div className="space-y-3.5">
                <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground">Estimated Total</span>
                  <span className="font-mono text-base font-bold text-foreground">
                    {symbol}{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="booking-notes" className="text-xs font-medium flex items-center gap-1.5">
                    <StickyNote className="size-3.5 text-muted-foreground" />
                    Internal Team Notes
                  </Label>
                  <Textarea
                    id="booking-notes"
                    placeholder="Private team notes (not visible to customer)..."
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>
            </FormSectionCard>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR (100% Width) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg py-3 px-4 sm:px-6 lg:px-8">
        <div className="w-full flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {onSaveAndCreateJob && !editingBooking && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                onClick={onSaveAndCreateJob}
                disabled={!isFormValid || saving}
              >
                <Briefcase className="size-4 mr-1.5" />
                Save & Create Job
              </Button>
            )}

            {onSaveAndAssign && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800"
                onClick={onSaveAndAssign}
                disabled={!isFormValid || saving}
              >
                <UserCheck className="size-4 mr-1.5" />
                Save & Assign
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5"
              onClick={onSave}
              disabled={!isFormValid || saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="size-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarCheck className="size-4 mr-1.5" />
                  {editingBooking ? 'Save Changes' : 'Save Booking'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── CREATE PROPERTY MODAL ── */}
      {selectedCustomer && (
        <CreatePropertyDialog
          open={showPropertyDialog}
          onOpenChange={setShowPropertyDialog}
          customerId={selectedCustomer.id}
          onPropertyCreated={(prop) => {
            setShowPropertyDialog(false);
            const formatted = [prop.street, prop.city, prop.state, prop.zip]
              .filter(Boolean)
              .join(', ');
            updateField('address', formatted || prop.street);
          }}
        />
      )}

      {/* ── CREATE CUSTOMER MODAL ── */}
      {showCreateCustomerDialog && (
        <CreateCustomerDialog
          open={showCreateCustomerDialog}
          onOpenChange={setShowCreateCustomerDialog || (() => {})}
          prefill={createCustomerPrefill}
          onCustomerCreated={(c) => {
            onCustomerCreated?.(c);
            onPickCustomer(c);
            updateField('customerId', c.id);
            updateField('customerName', c.name);
            updateField('customerPhone', c.phone || '');
            updateField('customerEmail', c.email || '');
            if (c.address) {
              updateField('address', c.address);
            }
          }}
        />
      )}
    </div>
  );
}

'use client';

/**
 * BookingFormDialog — Phase 6E extraction from booking-view.tsx.
 *
 * Bundles two form dialogs that previously lived inline in booking-view.tsx:
 *
 *   - <CreateBookingDialog /> — "New Booking" form. Calls `onSave`,
 *     `onSaveAndAssign`, and `onSaveAndCreateJob` depending on which footer
 *     button is clicked.
 *   - <EditBookingDialog /> — edit existing booking form. Shows the Status
 *     field (Create doesn't) and calls `onSave` / `onSaveAndCreateJob`.
 *     When the user has chosen "Auto Assign" assignmentType, the Save button
 *     first runs `onSave` then `onAutoAssign`.
 *
 * Pure presentational — all state lives in the parent BookingView and is
 * threaded through as props. Same JSX, same handler wiring — moved to its own
 * file so booking-view.tsx shrinks by ~560 lines.
 *
 * Extracted from src/components/views/booking-view.tsx (Phase 6E refactor).
 */

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
import { SOURCE_OPTIONS, STATUS_OPTIONS } from '@/features/booking/utils/booking-helpers';
import type {
  BookingFormData,
  EmployeeOption,
  ServiceOption,
} from '@/features/booking/types';

// ─── Shared form body ───────────────────────────────────────────────────────

interface BookingFormBodyProps {
  form: BookingFormData;
  onFormChange: (form: BookingFormData) => void;
  services: ServiceOption[];
  employees: EmployeeOption[];
  /** Show the Status field (edit mode only). */
  showStatusField: boolean;
  /** "create" or "edit" — used for HTML id prefixes. */
  idPrefix: string;
}

function BookingFormBody({
  form,
  onFormChange,
  services,
  employees,
  showStatusField,
  idPrefix,
}: BookingFormBodyProps) {
  function updateForm<K extends keyof BookingFormData>(field: K, value: BookingFormData[K]) {
    onFormChange({ ...form, [field]: value });
  }

  // When a service is selected, auto-fill title (if empty or matches a
  // previously-selected service name) and duration from the catalog.
  function handleServiceSelect(selectedId: string) {
    const normalized = selectedId === '_none' ? '' : selectedId;
    if (!normalized) {
      updateForm('serviceId', '');
      return;
    }
    const svc = services.find((s) => s.id === normalized);
    if (!svc) {
      updateForm('serviceId', normalized);
      return;
    }
    onFormChange({
      ...form,
      serviceId: normalized,
      title:
        !form.title.trim() || services.some((s) => s.name === form.title)
          ? svc.name
          : form.title,
      duration: String(svc.duration || form.duration || 60),
    });
  }

  const selectedService = form.serviceId
    ? services.find((s) => s.id === form.serviceId)
    : null;

  return (
    <div className="grid gap-4 py-2">
      {/* Service Catalog dropdown — auto-fills title + duration */}
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-serviceId`}>
          Service{' '}
          <span className="text-xs font-normal text-muted-foreground">
            (from catalog — optional)
          </span>
        </Label>
        <Select
          value={form.serviceId || '_none'}
          onValueChange={handleServiceSelect}
        >
          <SelectTrigger id={`${idPrefix}-serviceId`}>
            <SelectValue
              placeholder={
                services.length === 0
                  ? 'No services in catalog'
                  : 'Select a service to auto-fill details'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— No service —</SelectItem>
            {services.map((svc) => (
              <SelectItem key={svc.id} value={svc.id}>
                {svc.name}
                <span className="text-xs text-muted-foreground ml-1">
                  · {svc.category} · {svc.duration}m ·
                  ${svc.basePrice.toFixed(2)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedService && (
          <p className="text-xs text-muted-foreground">
            Auto-filled from catalog:{' '}
            <span className="font-medium text-foreground">
              {selectedService.name}
            </span>{' '}
            · {selectedService.duration} min · $
            {selectedService.basePrice.toFixed(2)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-title`}>
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`${idPrefix}-title`}
          placeholder="e.g. Deep Cleaning Service"
          value={form.title}
          onChange={(e) => updateForm('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-customerName`}>Customer Name</Label>
          <Input
            id={`${idPrefix}-customerName`}
            placeholder="John Doe"
            value={form.customerName}
            onChange={(e) => updateForm('customerName', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-customerPhone`}>Phone</Label>
          <Input
            id={`${idPrefix}-customerPhone`}
            placeholder="+1 234 567 890"
            value={form.customerPhone}
            onChange={(e) => updateForm('customerPhone', e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-customerEmail`}>Email</Label>
        <Input
          id={`${idPrefix}-customerEmail`}
          type="email"
          placeholder="john@example.com"
          value={form.customerEmail}
          onChange={(e) => updateForm('customerEmail', e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Input
          id={`${idPrefix}-address`}
          placeholder="123 Main St, City"
          value={form.address}
          onChange={(e) => updateForm('address', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-scheduledAt`}>Scheduled At</Label>
          <Input
            id={`${idPrefix}-scheduledAt`}
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => updateForm('scheduledAt', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-duration`}>Duration (min)</Label>
          <Input
            id={`${idPrefix}-duration`}
            type="number"
            min="5"
            value={form.duration}
            onChange={(e) => updateForm('duration', e.target.value)}
          />
        </div>
      </div>

      {showStatusField && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-status`}>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => updateForm('status', v)}
          >
            <SelectTrigger id={`${idPrefix}-status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-source`}>Source</Label>
        <Select
          value={form.source}
          onValueChange={(v) => updateForm('source', v)}
        >
          <SelectTrigger id={`${idPrefix}-source`}>
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

      {/* Assignment Type */}
      <div className="grid gap-2">
        <Label>Assignment Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'assign_now', label: 'Assign Now' },
              { value: 'auto_assign', label: 'Auto Assign' },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={
                form.assignmentType === opt.value ? 'default' : 'outline'
              }
              size="sm"
              className={
                form.assignmentType === opt.value
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : ''
              }
              onClick={() => updateForm('assignmentType', opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Assigned Employee — only shown when assignmentType === 'assign_now' */}
      {form.assignmentType === 'assign_now' && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-employeeId`}>Assigned Employee</Label>
          <Select
            value={form.employeeId}
            onValueChange={(v) => updateForm('employeeId', v)}
          >
            <SelectTrigger id={`${idPrefix}-employeeId`}>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No employees available
                </SelectItem>
              ) : (
                employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                    <span className="text-xs text-muted-foreground ml-1">
                      · {emp.role || '—'} · {emp.status || '—'}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Auto-assign strategy hint */}
      {form.assignmentType === 'auto_assign' && (
        <div className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded p-2">
          After the booking is created, the system will auto-assign the
          best available employee based on workload, rating, and
          availability.
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          placeholder="Describe the booking..."
          value={form.description}
          onChange={(e) => updateForm('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder="Internal notes..."
          value={form.notes}
          onChange={(e) => updateForm('notes', e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}

// ─── Create Booking Dialog ──────────────────────────────────────────────────

export interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BookingFormData;
  onFormChange: (form: BookingFormData) => void;
  services: ServiceOption[];
  employees: EmployeeOption[];
  saving: boolean;
  onSave: () => void;
  onSaveAndAssign: () => void;
  onSaveAndCreateJob: () => void;
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  services,
  employees,
  saving,
  onSave,
  onSaveAndAssign,
  onSaveAndCreateJob,
}: CreateBookingDialogProps) {
  const titleValid = form.title.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
          <DialogDescription>
            Create a new service booking or appointment.
          </DialogDescription>
        </DialogHeader>

        <BookingFormBody
          form={form}
          onFormChange={onFormChange}
          services={services}
          employees={employees}
          showStatusField={false}
          idPrefix="create"
        />

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onSave}
            disabled={saving || !titleValid}
          >
            Save Booking
          </Button>
          <Button
            variant="outline"
            onClick={onSaveAndAssign}
            disabled={
              saving ||
              !titleValid ||
              (form.assignmentType === 'assign_now' && !form.employeeId)
            }
            title="Save and assign the selected employee"
          >
            Save &amp; Assign
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onSaveAndCreateJob}
            disabled={saving || !titleValid}
          >
            {saving ? 'Creating...' : 'Save & Create Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Booking Dialog ────────────────────────────────────────────────────

export interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BookingFormData;
  onFormChange: (form: BookingFormData) => void;
  services: ServiceOption[];
  employees: EmployeeOption[];
  saving: boolean;
  onSave: () => Promise<void> | void;
  onSaveAndCreateJob: () => void;
  onAutoAssign: () => Promise<void> | void;
}

export function EditBookingDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  services,
  employees,
  saving,
  onSave,
  onSaveAndCreateJob,
  onAutoAssign,
}: EditBookingDialogProps) {
  const titleValid = form.title.trim().length > 0;

  async function handleSaveChanges() {
    // When user picked Auto Assign, save first then auto-assign.
    if (form.assignmentType === 'auto_assign') {
      await onSave();
      await onAutoAssign();
    } else {
      await onSave();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update booking details and status.
          </DialogDescription>
        </DialogHeader>

        <BookingFormBody
          form={form}
          onFormChange={onFormChange}
          services={services}
          employees={employees}
          showStatusField
          idPrefix="edit"
        />

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveChanges}
            disabled={saving || !titleValid}
          >
            Save Changes
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onSaveAndCreateJob}
            disabled={saving || !titleValid}
          >
            {saving ? 'Saving...' : 'Save & Create Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

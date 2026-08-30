'use client';

/**
 * JobFormPage — Phase 2C extraction from jobs-view.tsx.
 *
 * Replaces the inline `renderJobFormPage()` closure that used to live inside
 * the parent JobsView component. The form renders the full-page Create/Edit
 * Job surface (Jobber-style) with these sections:
 *
 *   1. FormPageHeader (Back / Save)
 *   2. Title & Client + #job / Customize (merged card)
 *   3. Job Type & Schedule (One-off toggle + start/end times, OR Recurring
 *      editor for new jobs)
 *   4. Assigned To (employee picker)
 *   5. Visit Details (instructions textarea)
 *   6. Capture On-Site Details (ChecklistAttachPicker + linked chips)
 *   7. Billing (invoice-on-close reminder)
 *   8. Equipment (only when the customer has tracked assets)
 *   9. Product / Service (LineItemsSection)
 *  10. Location (address + priority + estimated duration)
 *  11. Notes & Attachments (notes + file upload drop zone)
 *  12. Link to related (Invoices + Quotes checkboxes + quote picker)
 *  13. Bottom action bar (Cancel / Save)
 *  14. CreateCustomerDialog (opened from the CustomerPicker)
 *
 * The component is a controlled form: ALL state lives in the parent JobsView
 * and is threaded through as props. The new file is a pure extraction — same
 * JSX, same handler wiring, same prop dependencies — moved to its own file
 * so jobs-view.tsx shrinks by ~660 lines.
 *
 * Extracted from src/components/views/jobs-view.tsx (Phase 2C refactor).
 */

import type { RefObject } from 'react';
import {
  Briefcase, Plus, RefreshCw, CalendarDays, Repeat, UserCircle,
  StickyNote, ClipboardList, FileText, Wrench, MapPin, Tag, Link2,
  UploadCloud, File as FileIcon, X, Loader2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/format-utils';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import {
  type CatalogService,
  type LineItem,
  lineItemsSubtotal,
  CreateCustomerDialog,
  CustomerPicker,
  LineItemsSection,
} from '@/features/line-items';
import {
  ChecklistAttachPicker,
} from '@/components/views/checklists-view';
import {
  RecurringScheduleEditor,
} from '@/components/recurring/recurring-schedule-editor';
import type {
  Job,
  Employee,
  CustomField,
  JobFormData,
  CustomerAssetOption,
  QuoteOption,
  CustomerOption,
} from '@/features/jobs/types/jobs-view-types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderJobFormPage()` reached
// into from the parent JobsView. Each prop below corresponds 1:1 to a parent
// state slot or handler; the wiring at the call site just spreads them in.

export interface JobFormPageProps {
  // ── Form state ──
  jobForm: JobFormData;
  setJobForm: React.Dispatch<React.SetStateAction<JobFormData>>;
  editingJob: Job | null;
  prefillLeadId: string | null;
  saving: boolean;

  // ── Customer picker state ──
  customers: CustomerOption[];
  selectedCustomer: CustomerOption | null;
  setSelectedCustomer: (c: CustomerOption | null) => void;
  customerQuery: string;
  setCustomerQuery: (v: string) => void;
  customerPickerOpen: boolean;
  setCustomerPickerOpen: (v: boolean) => void;
  showCreateCustomerDialog: boolean;
  setShowCreateCustomerDialog: (v: boolean) => void;
  createCustomerPrefill: { name: string; phone: string; email: string };

  // ── Catalog data ──
  employees: Employee[];
  checklists: { id: string; title: string }[];
  customerAssets: CustomerAssetOption[];
  customerQuotes: QuoteOption[];
  services: CatalogService[];
  symbol: string;

  // ── File upload state ──
  uploadingFiles: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;

  // ── Handlers ──
  closeJobForm: () => void;
  handleSaveJob: () => void;
  handlePickCustomer: (c: CustomerOption) => void;
  openCreateCustomerDialog: (nameQuery: string) => void;
  addCustomerToList: (c: CustomerOption) => void;
  addCustomField: () => void;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
  openChecklistBuilder: (existing?: { id: string; title: string }, fromForm?: boolean) => void;
  addServiceToCatalog: (svc: CatalogService) => void;
  handleFileUpload: (files: FileList | null) => void;
  removeAttachment: (idx: number) => void;
}

export function JobFormPage({
  jobForm,
  setJobForm,
  editingJob,
  prefillLeadId,
  saving,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  customerQuery,
  setCustomerQuery,
  customerPickerOpen,
  setCustomerPickerOpen,
  showCreateCustomerDialog,
  setShowCreateCustomerDialog,
  createCustomerPrefill,
  employees,
  checklists,
  customerAssets,
  customerQuotes,
  services,
  symbol,
  uploadingFiles,
  fileInputRef,
  closeJobForm,
  handleSaveJob,
  handlePickCustomer,
  openCreateCustomerDialog,
  addCustomerToList,
  addCustomField,
  updateCustomField,
  removeCustomField,
  openChecklistBuilder,
  addServiceToCatalog,
  handleFileUpload,
  removeAttachment,
}: JobFormPageProps) {
  const subtotal = lineItemsSubtotal(jobForm.lineItems as LineItem[]);
  const isEditing = !!editingJob;
  const fromLead = !!prefillLeadId;

  return (
    <div className="w-full space-y-6">
      {/* ─── Page header with Back button ─────────────────────── */}
      <FormPageHeader
        icon={Briefcase}
        iconBg="bg-emerald-600"
        title={isEditing ? 'Edit Job' : fromLead ? 'New Job from Lead' : 'New Job'}
        subtitle={isEditing ? 'Update job details' : fromLead ? 'Review and create the job from this lead' : 'Schedule a new service job'}
        onBack={closeJobForm}
        onSubmit={handleSaveJob}
        submitting={saving}
        submitLabel={isEditing ? 'Update Job' : 'Create Job'}
      />

      {/* ─── Title & Client + #job / Customize (merged) ────────── */}
      <FormSectionCard>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          {/* Left: Title + Client */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="job-title">Title <span className="text-red-500 font-medium">*</span></Label>
              <Input
                id="job-title"
                className="form-input h-10"
                placeholder="Add a title (e.g. AC repair at customer site)"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Select a client</Label>
              <CustomerPicker
                customers={selectedCustomer && !customers.find(c => c.id === selectedCustomer.id) ? [selectedCustomer, ...customers] : customers}
                selectedCustomerId={jobForm.customerId}
                onPick={handlePickCustomer}
                onClear={() => { setSelectedCustomer(null); setJobForm({ ...jobForm, customerId: '' }); }}
                onCreate={openCreateCustomerDialog}
                query={customerQuery}
                setQuery={setCustomerQuery}
                open={customerPickerOpen}
                setOpen={setCustomerPickerOpen}
              />
              <p className="text-xs text-muted-foreground">
                Pick an existing client or click <span className="text-emerald-700 font-medium">+ Create new client</span> to add one on the fly.
              </p>
            </div>
            {editingJob?.jobNumber && (
              <div className="grid gap-2">
                <Label>Job #</Label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground">
                  {editingJob.jobNumber}
                </div>
              </div>
            )}
          </div>

          {/* Right: #job / Customize (light grey panel) */}
          <div className="rounded-lg bg-muted/40 border border-muted-foreground/15 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">#job / Customize</span>
              </div>
              <button
                type="button"
                onClick={addCustomField}
                className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-md text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
              >
                <Plus className="size-3" /> Add Field
              </button>
            </div>
            {jobForm.customFields.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No custom fields. Add labelled info like PO Number, Site Contact, Access Code.
              </p>
            ) : (
              <div className="space-y-1.5">
                {jobForm.customFields.map((f) => (
                  <div key={f.id} className="space-y-1">
                    <Input
                      className="form-input h-8 text-xs"
                      placeholder="Label (e.g. PO #)"
                      value={f.label}
                      onChange={(e) => updateCustomField(f.id, { label: e.target.value })}
                    />
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="form-input h-8 text-xs flex-1"
                        placeholder="Value"
                        value={f.value}
                        onChange={(e) => updateCustomField(f.id, { value: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-red-500 hover:text-red-600 shrink-0"
                        onClick={() => removeCustomField(f.id)}
                        title="Remove field"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Job Type & Schedule ────────────────────────────────── */}
      {/* Slimmed per UX decision: this section now contains ONLY the Type
          toggle, plus (when One-off) the Start date / Start time / End time
          row. For Recurring jobs, the scheduling fields live inside the
          RecurringScheduleEditor below — one source of scheduling truth per
          mode, so the user never sees two competing schedules. */}
      <FormSectionCard icon={CalendarDays} title="Job Type & Schedule">
        <div className="space-y-4">
          {/* Job type toggle — SINGLE source of truth.
              Clicking One-off/Recurring here sets BOTH `jobType` (the job
              payload field) AND `recurring.enabled` (the editor's internal
              flag). The editor below is rendered with `showSwitch={false}`
              so it has no toggle of its own — this toggle is the only one. */}
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Type</Label>
            <div className="inline-flex rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setJobForm((prev) => ({
                  ...prev,
                  jobType: 'one-off',
                  recurring: { ...prev.recurring, enabled: false },
                }))}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-md transition-colors',
                  jobForm.jobType === 'one-off' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                One-off
              </button>
              <button
                type="button"
                onClick={() => setJobForm((prev) => ({
                  ...prev,
                  jobType: 'recurring',
                  recurring: { ...prev.recurring, enabled: true },
                }))}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-md transition-colors',
                  jobForm.jobType === 'recurring' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Recurring
              </button>
            </div>
          </div>

          {/* Start date / Start time / End time — ONLY for One-off jobs.
              For Recurring jobs, the schedule lives inside the
              RecurringScheduleEditor (Start date + Start time + Duration).
              Showing both would create two competing scheduling sources. */}
          {jobForm.jobType === 'one-off' && (
            <>
              <div className="border-t border-border/40" />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="job-date">Start date</Label>
                  <Input
                    id="job-date"
                    type="date"
                    className="form-input h-10"
                    value={jobForm.scheduledDate}
                    onChange={(e) => setJobForm({ ...jobForm, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="job-start">Start time</Label>
                  <Input
                    id="job-start"
                    type="time"
                    className="form-input h-10"
                    value={jobForm.scheduledTime}
                    onChange={(e) => setJobForm({ ...jobForm, scheduledTime: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="job-end">End time</Label>
                  <Input
                    id="job-end"
                    type="time"
                    className="form-input h-10"
                    value={jobForm.endTime}
                    onChange={(e) => setJobForm({ ...jobForm, endTime: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </FormSectionCard>

      {/* ─── Recurring Schedule (New Job only, only when Type = Recurring) ── */}
      {/* Single source of truth: the Type toggle above drives both
          `jobForm.jobType` and `jobForm.recurring.enabled`. The editor is
          rendered with `showSwitch={false}` so it has NO toggle of its own.
          The save handler reads `jobForm.recurring.enabled` and attaches
          the recurring block to the POST /api/jobs body — no backend
          changes needed. */}
      {!editingJob && jobForm.jobType === 'recurring' && (
        <FormSectionCard icon={Repeat} title="Recurring Schedule">
          <RecurringScheduleEditor
            value={jobForm.recurring}
            onChange={(next) => setJobForm((prev) => ({ ...prev, recurring: next }))}
            showSwitch={false}
            showGenerateFirstJob
            showBilling
            showTimezone
          />
        </FormSectionCard>
      )}

      {/* ─── Assigned To ─────────────────────────────────────────── */}
      {/* Extracted from "Job Type & Schedule" per UX decision: assignment
          is a separate concern from scheduling. Using UserCircle icon
          (individual employee assignment; reserve `Users` for multi-assignee
          teams later). This separation also prepares for future
          technician-rotation features (e.g. Every Monday → Team A). */}
      <FormSectionCard icon={UserCircle} title="Assigned To">
        <div className="grid gap-2">
          <Label htmlFor="job-assignee">Employee</Label>
          <Select value={jobForm.assigneeId} onValueChange={(v) => setJobForm({ ...jobForm, assigneeId: v })}>
            <SelectTrigger id="job-assignee" className="form-input h-10"><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No assignee</SelectItem>
              {employees.filter((e) => e.status !== 'inactive').map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role}{typeof emp.rating === 'number' ? ` (${emp.rating.toFixed(1)} ★)` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSectionCard>

      {/* ─── Visit Details ───────────────────────────────────────── */}
      {/* Visit instructions extracted into its own section per UX decision:
          Schedule / Assignment / Visit details / Capture — four distinct
          logical groupings instead of one monolithic "Job Type & Schedule". */}
      <FormSectionCard icon={StickyNote} title="Visit Details">
        <div className="grid gap-2">
          <Label htmlFor="job-instructions">Visit instructions</Label>
          <Textarea
            id="job-instructions"
            rows={3}
            className="form-input"
            placeholder="Visit instructions (shown to the assigned employee on-site)"
            value={jobForm.visitInstructions}
            onChange={(e) => setJobForm({ ...jobForm, visitInstructions: e.target.value })}
          />
        </div>
      </FormSectionCard>

      {/* ─── Capture On-Site Details (checklists) ────────────────── */}
      {/* Extracted from "Job Type & Schedule" into its own section.
          ONE primary action ("+ Create checklist") in the header — the
          picker's own empty state / bottom button were consolidated to
          avoid duplicate actions. */}
      <FormSectionCard
        icon={ClipboardList}
        title="Capture On-Site Details"
        description="Attach custom-built checklists so that nothing gets missed."
        action={
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-emerald-700 hover:text-emerald-800 px-0 h-auto"
            onClick={() => openChecklistBuilder(undefined, true)}
          >
            + Create checklist
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Attached checklists (clickable to edit, X to remove) */}
          {jobForm.linkedChecklists.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {jobForm.linkedChecklists.map((cid) => {
                const cl = checklists.find((c) => c.id === cid);
                if (!cl) return null;
                return (
                  <Badge
                    key={cid}
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 pr-1 cursor-pointer hover:bg-emerald-100"
                    onClick={() => openChecklistBuilder(cl, true)}
                    title="Click to edit"
                  >
                    <ClipboardList className="size-3" />
                    {cl.title}
                    <button
                      type="button"
                      className="ml-0.5 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setJobForm((prev) => ({
                          ...prev,
                          linkedChecklists: prev.linkedChecklists.filter((x) => x !== cid),
                        }));
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          <ChecklistAttachPicker
            checklists={checklists.filter((c) => !jobForm.linkedChecklists.includes(c.id))}
            selectedIds={[]}
            onChange={(ids) => {
              // For the picker, any checked id gets ADDED to linkedChecklists
              setJobForm((prev) => ({
                ...prev,
                linkedChecklists: [...new Set([...prev.linkedChecklists, ...ids])],
              }));
            }}
            onCreateNew={() => openChecklistBuilder(undefined, true)}
          />
        </div>
      </FormSectionCard>

      {/* ─── Billing ──────────────────────────────────────────── */}
      <FormSectionCard icon={FileText} title="Billing">
        <div className="flex items-center gap-2">
          <Checkbox
            id="job-invoice"
            checked={jobForm.invoiceOnClose}
            onCheckedChange={(v) => setJobForm({ ...jobForm, invoiceOnClose: v === true })}
          />
          <Label htmlFor="job-invoice" className="text-sm font-normal cursor-pointer">
            Remind me to invoice when I close the job
          </Label>
        </div>
      </FormSectionCard>

      {/* ─── Equipment (linked asset) ──────────────────────────── */}
      {/* Only show this section when the selected customer has at least one
          tracked asset. If the customer has no equipment, the entire section
          is hidden (per product decision V1.6) — no empty-state message. */}
      {jobForm.customerId && customerAssets.length > 0 && (
        <FormSectionCard icon={Wrench} title="Equipment" description="Link this job to a customer asset to track service history">
          <div className="space-y-2">
            <Select
              value={jobForm.assetId || 'none'}
              onValueChange={(v) => setJobForm({ ...jobForm, assetId: v === 'none' ? '' : v })}
            >
              <SelectTrigger className="form-input h-10">
                <SelectValue placeholder="None — no specific equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — no specific equipment</SelectItem>
                {customerAssets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.assetType}){a.brand ? ` · ${a.brand}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {jobForm.assetId && (
              <p className="text-[11px] text-muted-foreground">
                Service history will be auto-recorded on this asset when the job completes.
              </p>
            )}
          </div>
        </FormSectionCard>
      )}

      {/* ─── Product / Service (line items) ───────────────────── */}
      <FormSectionCard icon={Briefcase} title="Product / Service" description="Search the catalog or add a custom item">
        <div className="space-y-3">
          <LineItemsSection
            items={jobForm.lineItems}
            services={services}
            symbol={symbol}
            onServicesUpdate={addServiceToCatalog}
            onChange={(items) => setJobForm((prev) => ({ ...prev, lineItems: items }))}
          />
          {jobForm.lineItems.length > 0 && (
            <div className="flex items-center justify-end gap-4 text-sm">
              <span className="text-muted-foreground">Total price</span>
              <span className="font-bold text-emerald-700">{symbol}{subtotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      </FormSectionCard>

      {/* ─── Address & Priority ───────────────────────────────── */}
      <FormSectionCard icon={MapPin} title="Location">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="job-address">Address</Label>
            <Input
              id="job-address"
              className="form-input h-10"
              placeholder="Service location address"
              value={jobForm.address}
              onChange={(e) => setJobForm({ ...jobForm, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={jobForm.priority} onValueChange={(v) => setJobForm({ ...jobForm, priority: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                Est. duration <span className="text-xs font-normal text-muted-foreground">(min)</span>
              </Label>
              <Input
                type="number"
                min="5"
                className="form-input h-10"
                placeholder="60"
                value={jobForm.estimatedDuration}
                onChange={(e) => setJobForm({ ...jobForm, estimatedDuration: e.target.value })}
              />
            </div>
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Notes & Attachments (merged into one box) ────────── */}
      <FormSectionCard icon={StickyNote} title="Notes & Attachments">
        <div className="space-y-4">
          {/* Notes */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Use @ in notes to mention your team</p>
            <Textarea
              rows={3}
              className="form-input"
              placeholder="Add a note for your team..."
              value={jobForm.notes}
              onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })}
            />
          </div>

          <div className="border-t border-border/40" />

          {/* Attach files & photos */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            {/* Drop zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
              className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-emerald-400/50 transition-colors px-4 py-6 text-sm flex flex-col items-center gap-1.5 disabled:opacity-50"
            >
              {uploadingFiles ? (
                <>
                  <Loader2 className="size-5 animate-spin text-emerald-600" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="size-5 text-emerald-600" />
                  <span className="font-medium text-foreground">Select or drag files here to upload</span>
                  <span className="text-xs text-muted-foreground">Click to browse — photos, PDFs, docs, etc.</span>
                </>
              )}
            </button>
            {/* Attached files list */}
            {jobForm.attachments.length > 0 && (
              <div className="space-y-1.5">
                {jobForm.attachments.map((att, idx) => {
                  const isImage = att.type?.startsWith('image/');
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                    >
                      {isImage ? (
                        <img src={att.url} alt={att.name} className="size-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{att.name}</p>
                        {att.size ? (
                          <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                        ) : null}
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 hover:underline shrink-0"
                      >
                        View
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-500 hover:text-red-600 shrink-0"
                        onClick={() => removeAttachment(idx)}
                        title="Remove"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Link to related ─────────────────────────────────── */}
      <FormSectionCard icon={Link2} title="Link to related">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Choose which related records should be linked to this job.
          </p>
          <div className="space-y-2">
            {([
              { id: 'invoices', label: 'Invoices', hint: 'Create a draft invoice from this job\'s line items' },
              { id: 'quotes', label: 'Quotes', hint: 'Link an existing quote to this job' },
            ] as const).map((opt) => {
              const checked = jobForm.linkToRelated.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      setJobForm((prev) => ({
                        ...prev,
                        linkToRelated: v
                          ? [...prev.linkToRelated, opt.id]
                          : prev.linkToRelated.filter((x) => x !== opt.id),
                        // Clear the linked quote when unchecking Quotes.
                        ...(opt.id === 'quotes' && !v ? { linkedQuoteId: '' } : {}),
                      }));
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.hint}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* ── Quote picker (shown only when "Quotes" is checked) ── */}
          {jobForm.linkToRelated.includes('quotes') && (
            <div className="space-y-1.5 rounded-md border border-dashed bg-muted/20 p-3">
              <p className="text-xs font-medium">Select a quote to link</p>
              {!jobForm.customerId ? (
                <p className="text-xs text-muted-foreground italic">
                  Select a customer first to see their quotes.
                </p>
              ) : customerQuotes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  This customer has no linkable quotes (only draft and sent quotes can be linked).
                </p>
              ) : (
                <Select
                  value={jobForm.linkedQuoteId || 'none'}
                  onValueChange={(v) => setJobForm({ ...jobForm, linkedQuoteId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="form-input h-10">
                    <SelectValue placeholder="None — no specific quote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — no specific quote</SelectItem>
                    {customerQuotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.title} · {q.currency} {q.total.toFixed(2)} ({q.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {jobForm.linkedQuoteId && (
                <p className="text-[11px] text-muted-foreground">
                  The selected quote will be marked as &quot;accepted&quot; and linked to this job when you save.
                </p>
              )}
            </div>
          )}

          {/* ── Invoice note (shown only when "Invoices" is checked) ── */}
          {jobForm.linkToRelated.includes('invoices') && (
            <div className="rounded-md border border-dashed bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground">
                A draft invoice will be created from this job&apos;s line items when you save.
                {jobForm.lineItems.every((li) => !li.name.trim() && !Number(li.unitPrice)) && (
                  <span className="text-amber-600 font-medium">
                    {' '}⚠ Add at least one line item to the job for the invoice to have content.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </FormSectionCard>

      {/* ─── Bottom action bar ────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pb-4">
        <Button variant="outline" onClick={closeJobForm}>Cancel</Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveJob} disabled={saving}>
          {saving && <RefreshCw className="size-4 mr-1 animate-spin" />}
          {isEditing ? 'Update Job' : 'Create Job'}
        </Button>
      </div>

      {/* ─── Create-customer dialog (opened from the picker) ──── */}
      <CreateCustomerDialog
        open={showCreateCustomerDialog}
        onOpenChange={setShowCreateCustomerDialog}
        prefillName={createCustomerPrefill.name}
        prefillPhone={createCustomerPrefill.phone}
        prefillEmail={createCustomerPrefill.email}
        onCreated={addCustomerToList}
      />
    </div>
  );
}

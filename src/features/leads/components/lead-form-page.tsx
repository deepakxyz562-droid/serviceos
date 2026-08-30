'use client';

/**
 * LeadFormPage — Phase 4 extraction from leads-view.tsx.
 *
 * Replaces the inline `renderLeadFormPage()` closure that used to live inside
 * the parent LeadsView component. The form renders the full-page Create/Edit
 * Lead surface (Jobber-style) with these sections:
 *
 *   1. FormPageHeader (Back / Save)
 *   2. Title & Client (title input + CustomerPicker)
 *   3. Contact info (name / phone / email / source — hidden when a client is
 *      already linked via the picker)
 *   4. Overview (service-details textarea + ImageUploader)
 *   5. On-site assessment (assessment ImageUploader)
 *   6. Product / Service (LineItemsSection)
 *   7. Details (address / priority / value)
 *   8. Notes
 *   9. Bottom action bar (Cancel / Save)
 *  10. CreateCustomerDialog (opened from the CustomerPicker)
 *
 * The component is a controlled form: ALL state lives in the parent LeadsView
 * and is threaded through as props. Pure extraction — same JSX, same handler
 * wiring, same prop dependencies — moved to its own file so leads-view.tsx
 * shrinks by ~261 lines.
 *
 * Extracted from src/components/views/leads-view.tsx (Phase 4 refactor).
 */

import {
  UserPlus, User, FileText, Camera, Briefcase, MapPin,
  StickyNote, RefreshCw, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FormSectionCard, FormPageHeader } from '@/components/shared/form-section-card';
import {
  type CatalogService,
  type LineItem,
  lineItemsSubtotal,
  CreateCustomerDialog,
  CustomerPicker,
  ImageUploader,
  LineItemsSection,
} from '@/features/line-items';
import {
  SOURCE_CONFIG,
  PRIORITY_CONFIG,
} from '@/features/leads/utils/lead-helpers';
import type {
  Lead, LeadFormData, CustomerOption,
} from '@/features/leads/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderLeadFormPage()` reached
// into from the parent LeadsView. Each prop below corresponds 1:1 to a parent
// state slot or handler; the wiring at the call site just spreads them in.
export interface LeadFormPageProps {
  /** Lead being edited, or null when creating a new one. */
  editingLead: Lead | null;
  /** Current form state. */
  leadForm: LeadFormData;
  /** Setter for any form field (top-level merge). */
  setLeadForm: (updater: LeadFormData | ((prev: LeadFormData) => LeadFormData)) => void;
  /** Save handler — kicks off the POST/PUT. */
  onSave: () => void;
  /** Cancel / back to list handler. */
  onCancel: () => void;
  /** True while the save request is in-flight. */
  saving: boolean;

  // ── Customer picker ───────────────────────────────────────────────────
  /** Local list of customers (used for the picker's chip view). */
  customers: CustomerOption[];
  /** Customer-picker search query. */
  customerQuery: string;
  setCustomerQuery: (v: string) => void;
  /** Customer-picker dropdown open state. */
  customerPickerOpen: boolean;
  setCustomerPickerOpen: (v: boolean) => void;
  /** Called when the user picks an existing customer. */
  onPickCustomer: (c: CustomerOption) => void;
  /** Opens the CreateCustomerDialog with the current query pre-filled. */
  onOpenCreateCustomer: (nameQuery: string) => void;

  // ── Create-customer dialog ────────────────────────────────────────────
  showCreateCustomerDialog: boolean;
  setShowCreateCustomerDialog: (v: boolean) => void;
  createCustomerPrefill: { name: string; phone?: string; email?: string };
  /** Adds a freshly-created customer to the local list + selects it. */
  onCustomerCreated: (c: CustomerOption) => void;

  // ── Service catalog (line items) ──────────────────────────────────────
  services: CatalogService[];
  /** Adds a freshly-created service to the local catalog. */
  onServiceCreated: (svc: CatalogService) => void;

  // ── Currency ──────────────────────────────────────────────────────────
  /** Currency symbol for the current tenant (e.g. "$", "₹"). */
  symbol: string;
}

/**
 * Full-page Create/Edit Lead form. Pure presentational — see props above.
 */
export function LeadFormPage({
  editingLead,
  leadForm,
  setLeadForm,
  onSave,
  onCancel,
  saving,
  customers,
  customerQuery,
  setCustomerQuery,
  customerPickerOpen,
  setCustomerPickerOpen,
  onPickCustomer,
  onOpenCreateCustomer,
  showCreateCustomerDialog,
  setShowCreateCustomerDialog,
  createCustomerPrefill,
  onCustomerCreated,
  services,
  onServiceCreated,
  symbol,
}: LeadFormPageProps) {
  return (
    <div className="w-full space-y-6">
      {/* ─── Page header with Back button ─────────────────────── */}
      <FormPageHeader
        icon={UserPlus}
        title={editingLead ? 'Edit Lead' : 'New Request'}
        subtitle={editingLead ? 'Update lead information' : 'Add a new lead to your pipeline'}
        onBack={onCancel}
        onSubmit={onSave}
        submitting={saving}
        submitLabel={editingLead ? 'Update Lead' : 'Add Lead'}
      />

      {/* ─── Title & Client ───────────────────────────────────── */}
      <FormSectionCard>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-title">Title</Label>
            <Input
              id="lead-title"
              className="form-input h-10"
              placeholder="Add a title (e.g. Kitchen sink repair)"
              value={leadForm.title}
              onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Select a client</Label>
            <CustomerPicker
              customers={customers}
              selectedCustomerId={leadForm.customerId}
              onPick={onPickCustomer}
              onClear={() => setLeadForm({ ...leadForm, customerId: '' })}
              onCreate={onOpenCreateCustomer}
              query={customerQuery}
              setQuery={setCustomerQuery}
              open={customerPickerOpen}
              setOpen={setCustomerPickerOpen}
            />
            <p className="text-xs text-muted-foreground">
              Pick an existing client or click <span className="text-emerald-700 font-medium">+ Create new client</span> to add one on the fly.
            </p>
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Contact info ─────────────────────────────────────── */}
      {/* When a customer is already linked via the picker above, the
          Name/Phone/Email fields are redundant (they come from the
          customer record and are auto-filled). In that case we hide the
          contact inputs and only show Source + a small note. The hidden
          values are still sent to the API so the lead's name/phone/email
          stay in sync with the customer. */}
      <FormSectionCard>
        {leadForm.customerId ? (
          <div className="grid gap-4 sm:grid-cols-2 items-start">
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2 sm:col-span-1">
              <User className="size-3.5 mt-0.5 shrink-0" />
              <span>Contact details are pulled from the selected client above. Clear the client to edit them manually.</span>
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">Name <span className="text-red-500 font-medium">*</span></Label>
              <Input
                id="lead-name"
                className="form-input h-10"
                placeholder="Full name"
                value={leadForm.name}
                onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Phone <span className="text-red-500 font-medium">*</span></Label>
              <Input
                id="lead-phone"
                className="form-input h-10"
                placeholder="+1 234 567 8900"
                value={leadForm.phone}
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                className="form-input h-10"
                placeholder="email@example.com"
                value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </FormSectionCard>

      {/* ─── Overview (Service details + images) ──────────────── */}
      <FormSectionCard icon={FileText} title="Overview">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Service details</Label>
            <p className="text-xs text-muted-foreground">Please provide as much information as you can</p>
            <Textarea
              rows={4}
              className="form-input"
              placeholder="Describe the work requested, symptoms, urgency, etc."
              value={leadForm.serviceDetails}
              onChange={(e) => setLeadForm({ ...leadForm, serviceDetails: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Share images of the work to be done</Label>
            <ImageUploader
              images={leadForm.images}
              onChange={(imgs: string[]) => setLeadForm({ ...leadForm, images: imgs })}
            />
          </div>
        </div>
      </FormSectionCard>

      {/* ─── On-site assessment ───────────────────────────────── */}
      <FormSectionCard icon={Camera} title="On-site assessment">
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
            <ClipboardList className="size-4 mt-0.5 shrink-0" />
            <span>Visit the property to assess the job before you do the work.</span>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Assessment photos</Label>
            <ImageUploader
              images={leadForm.assessmentImages}
              onChange={(imgs: string[]) => setLeadForm({ ...leadForm, assessmentImages: imgs })}
              bucket="lead-assessment"
            />
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Product / Service (line items) ───────────────────── */}
      <FormSectionCard icon={Briefcase} title="Product / Service" description="Search the catalog or add a custom item">
        <LineItemsSection
          items={leadForm.lineItems}
          services={services}
          symbol={symbol}
          onServicesUpdate={onServiceCreated}
          onChange={(items: LineItem[]) =>
            setLeadForm((prev: LeadFormData) => ({
              ...prev,
              lineItems: items,
              serviceId: items.find((it) => it.serviceId)?.serviceId || '',
              serviceType: prev.serviceType,
              value: items.length > 0 ? lineItemsSubtotal(items).toFixed(2) : prev.value,
            }))
          }
        />
      </FormSectionCard>

      {/* ─── Details (Address / Priority / Value) ─────────────── */}
      <FormSectionCard icon={MapPin} title="Details">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="lead-address">Address</Label>
            <Input
              id="lead-address"
              className="form-input h-10"
              placeholder="Street address, city, state"
              value={leadForm.address}
              onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={leadForm.priority} onValueChange={(v) => setLeadForm({ ...leadForm, priority: v })}>
                <SelectTrigger className="form-input h-10"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-value" className="flex items-center gap-1">
                Value ({symbol})
                {leadForm.lineItems.length > 0 && (
                  <span className="text-[10px] font-normal text-muted-foreground">(auto)</span>
                )}
              </Label>
              <Input
                id="lead-value"
                type="number"
                className="form-input h-10"
                placeholder="0"
                value={leadForm.value}
                onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })}
                disabled={leadForm.lineItems.length > 0}
              />
            </div>
          </div>
        </div>
      </FormSectionCard>

      {/* ─── Notes ────────────────────────────────────────────── */}
      <FormSectionCard icon={StickyNote} title="Notes">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Use @ in notes to mention your team</p>
          <Textarea
            rows={3}
            className="form-input"
            placeholder="Add a note for your team..."
            value={leadForm.notes}
            onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
          />
        </div>
      </FormSectionCard>

      {/* ─── Bottom action bar ────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pb-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onSave} disabled={saving}>
          {saving && <RefreshCw className="size-4 mr-1 animate-spin" />}
          {editingLead ? 'Update Lead' : 'Add Lead'}
        </Button>
      </div>

      {/* ─── Create-customer dialog (opened from the picker) ──── */}
      <CreateCustomerDialog
        open={showCreateCustomerDialog}
        onOpenChange={setShowCreateCustomerDialog}
        prefillName={createCustomerPrefill.name}
        prefillPhone={createCustomerPrefill.phone}
        prefillEmail={createCustomerPrefill.email}
        onCreated={onCustomerCreated}
      />
    </div>
  );
}

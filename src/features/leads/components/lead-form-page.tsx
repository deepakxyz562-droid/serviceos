'use client';

/**
 * LeadFormPage — Phase 4 extraction from leads-view.tsx.
 *
 * Full-page Create/Edit Lead surface (Jobber-style) with a modern 2-column layout:
 *
 *   Top Header: Sticky Back button, icon badge, Title, Subtitle, and Save/Cancel actions.
 *   Left Column:
 *     1. Title & Client (CustomerPicker + manual contact fallback if no customer selected)
 *     2. Product / Service (LineItemsSection with real-time total syncing)
 *     3. Overview & Scope (service-details textarea + ImageUploader for site photos)
 *     4. On-site Assessment (assessment info banner + ImageUploader for assessment photos)
 *   Right Column (Sidebar):
 *     1. Pipeline & Priority (Priority with color dots + Lead Source dropdown)
 *     2. Financials & Estimated Value (Value input with currency symbol & auto-calc badge)
 *     3. Service Location (Address input synced with CustomerPicker)
 *     4. Internal Team Notes (Notes textarea for team collaboration)
 *   Bottom Action Bar: Cancel and Save buttons for quick access when scrolled down.
 */

import {
  UserPlus, User, FileText, Camera, Briefcase, MapPin,
  StickyNote, RefreshCw, ClipboardList, DollarSign,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  /** Called when the user picks an existing customer. */
  onPickCustomer: (c: CustomerOption) => void;
  /** Optional customer picker props */
  customers?: CustomerOption[];
  customerQuery?: string;
  setCustomerQuery?: (v: string) => void;
  customerPickerOpen?: boolean;
  setCustomerPickerOpen?: (v: boolean) => void;
  onOpenCreateCustomer?: (nameQuery: string) => void;

  // ── Create-customer dialog ────────────────────────────────────────────
  showCreateCustomerDialog?: boolean;
  setShowCreateCustomerDialog?: (v: boolean) => void;
  createCustomerPrefill?: { name: string; phone?: string; email?: string };
  /** Adds a freshly-created customer to the local list + selects it. */
  onCustomerCreated?: (c: CustomerOption) => void;

  // ── Service catalog (line items) ──────────────────────────────────────
  services: CatalogService[];
  /** Adds a freshly-created service to the local catalog. */
  onServiceCreated: (svc: CatalogService) => void;

  // ── Currency ──────────────────────────────────────────────────────────
  /** Currency symbol for the current tenant (e.g. "$", "₹"). */
  symbol: string;
}

/**
 * Full-page Create/Edit Lead form with 2-column Jobber layout.
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
  const lineItemsCount = leadForm.lineItems?.length || 0;
  const computedSubtotal = lineItemsSubtotal(leadForm.lineItems || []);

  return (
    <div className="w-full space-y-6">
      {/* ─── Page header with Back button & actions ─────────────── */}
      <FormPageHeader
        icon={UserPlus}
        title={editingLead ? 'Edit Lead' : 'New Request / Lead'}
        subtitle={editingLead ? `Update details for ${leadForm.name || 'lead'}` : 'Capture a new client lead or service request'}
        onBack={onCancel}
        onSubmit={onSave}
        submitting={saving}
        submitLabel={editingLead ? 'Update Lead' : 'Create Lead'}
      />

      {/* ─── Main content: 2-column Jobber-style grid ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ─── Left Column (Primary Scope & Details) ───────────── */}
        <div className="space-y-6 min-w-0">
          {/* Title & Client Section */}
          <FormSectionCard icon={User} title="Client & Request Details">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-title" className="text-sm font-medium">Request Title</Label>
                <Input
                  id="lead-title"
                  className="form-input h-10"
                  placeholder="e.g. Backyard landscaping, AC maintenance, Kitchen sink repair"
                  value={leadForm.title}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Select Client *</Label>
                <CustomerPicker
                  selectedCustomerId={leadForm.customerId}
                  selectedAddress={leadForm.address}
                  customers={customers}
                  query={customerQuery}
                  setQuery={setCustomerQuery}
                  open={customerPickerOpen}
                  setOpen={setCustomerPickerOpen}
                  onPick={onPickCustomer}
                  onClear={() => setLeadForm((prev) => ({ ...prev, customerId: '' }))}
                  onAddressSelect={(addr) => setLeadForm((prev) => ({ ...prev, address: addr }))}
                  onCustomAddressChange={(addr) => setLeadForm((prev) => ({ ...prev, address: addr }))}
                  onCreate={onOpenCreateCustomer}
                  onCustomerCreated={onCustomerCreated}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pick an existing client or click <span className="text-emerald-700 font-medium">+ Create new client</span> to add one.
                </p>
              </div>

              {/* Manual contact fallback when no client is picked */}
              {!leadForm.customerId && (
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <User className="size-3.5 text-emerald-600" />
                    <span>Or enter new client contact details</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="lead-name" className="text-xs">Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="lead-name"
                        className="form-input h-9 text-sm"
                        placeholder="Full name"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lead-phone" className="text-xs">Phone <span className="text-red-500">*</span></Label>
                      <Input
                        id="lead-phone"
                        className="form-input h-9 text-sm"
                        placeholder="+1 234 567 8900"
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="lead-email" className="text-xs">Email</Label>
                      <Input
                        id="lead-email"
                        type="email"
                        className="form-input h-9 text-sm"
                        placeholder="email@example.com"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FormSectionCard>

          {/* Product / Service (Line Items) */}
          <FormSectionCard
            icon={Briefcase}
            title="Product / Service"
            description="Add services from your catalog or custom line items"
          >
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

          {/* Overview & Scope */}
          <FormSectionCard icon={FileText} title="Work Scope & Details" description="Describe symptoms, requirements, and urgency">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Service Description</Label>
                <Textarea
                  rows={4}
                  className="form-input text-sm"
                  placeholder="Describe the requested work in detail (e.g. leaking pipe under master bathroom sink, need urgent repair)..."
                  value={leadForm.serviceDetails}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, serviceDetails: e.target.value }))}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Camera className="size-4 text-emerald-600" />
                  Site & Work Photos
                </Label>
                <p className="text-xs text-muted-foreground">Upload photos of the site, damage, or work area</p>
                <ImageUploader
                  images={leadForm.images}
                  onChange={(imgs: string[]) => setLeadForm((prev) => ({ ...prev, images: imgs }))}
                />
              </div>
            </div>
          </FormSectionCard>

          {/* On-site Assessment */}
          <FormSectionCard icon={ClipboardList} title="On-site Assessment">
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5">
                <ClipboardList className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Visit the property to assess requirements and measure the job before providing a final quote.</span>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assessment Photos & Notes</Label>
                <ImageUploader
                  images={leadForm.assessmentImages}
                  onChange={(imgs: string[]) => setLeadForm((prev) => ({ ...prev, assessmentImages: imgs }))}
                  bucket="lead-assessment"
                />
              </div>
            </div>
          </FormSectionCard>
        </div>

        {/* ─── Right Column (Sidebar & Pipeline Meta) ─────────── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* Pipeline & Priority */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="size-4 text-emerald-600" /> Pipeline & Priority
              </h4>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Priority Level</Label>
                <Select
                  value={leadForm.priority}
                  onValueChange={(v) => setLeadForm((prev) => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger className="form-input h-9 text-sm">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${val.dotColor}`} />
                          <span>{val.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Lead Source</Label>
                <Select
                  value={leadForm.source}
                  onValueChange={(v) => setLeadForm((prev) => ({ ...prev, source: v }))}
                >
                  <SelectTrigger className="form-input h-9 text-sm">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financials / Estimated Value */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="size-4 text-emerald-600" /> Estimated Value
              </h4>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lead-value" className="text-xs font-medium text-muted-foreground">
                    Total Value ({symbol})
                  </Label>
                  {lineItemsCount > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      Auto from line items
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                    {symbol}
                  </span>
                  <Input
                    id="lead-value"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input h-10 pl-7 text-sm font-bold text-foreground"
                    placeholder="0.00"
                    value={lineItemsCount > 0 ? computedSubtotal.toFixed(2) : leadForm.value}
                    onChange={(e) => setLeadForm((prev) => ({ ...prev, value: e.target.value }))}
                    disabled={lineItemsCount > 0}
                  />
                </div>
                {lineItemsCount > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Calculated automatically from {lineItemsCount} line {lineItemsCount === 1 ? 'item' : 'items'}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Location / Address */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="size-4 text-emerald-600" /> Service Location
              </h4>

              <div className="space-y-1.5">
                <Label htmlFor="lead-address" className="text-xs font-medium text-muted-foreground">Address</Label>
                <Input
                  id="lead-address"
                  className="form-input h-9 text-sm"
                  placeholder="Street address, city, state, zip"
                  value={leadForm.address}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, address: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Synced with the client&apos;s chosen service property.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Internal Team Notes */}
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <StickyNote className="size-4 text-emerald-600" /> Internal Notes
              </h4>

              <div className="space-y-1.5">
                <Textarea
                  rows={3}
                  className="form-input text-xs"
                  placeholder="Add internal notes, gate codes, or instructions for your team..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Internal notes are only visible to your team.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Bottom action bar ────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
          onClick={onSave}
          disabled={saving}
        >
          {saving && <RefreshCw className="size-4 mr-2 animate-spin" />}
          {editingLead ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>

      {/* ─── Create-customer dialog (opened from the picker) ──── */}
      {showCreateCustomerDialog !== undefined && setShowCreateCustomerDialog && (
        <CreateCustomerDialog
          open={showCreateCustomerDialog}
          onOpenChange={setShowCreateCustomerDialog}
          prefillName={createCustomerPrefill?.name || ''}
          prefillPhone={createCustomerPrefill?.phone || ''}
          prefillEmail={createCustomerPrefill?.email || ''}
          onCreated={onCustomerCreated}
        />
      )}
    </div>
  );
}

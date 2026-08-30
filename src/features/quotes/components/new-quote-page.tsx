'use client';

/**
 * NewQuotePage — Phase 5B extraction from quotes-view.tsx.
 *
 * Replaces the inline `renderNewQuotePage()` closure that used to live
 * inside the parent QuotesView component. The form renders the full-page
 * Create/Edit Quote surface (Jobber-style) with these sections:
 *
 *   1. Sticky page header (Back + Cancel / Create Quote or Update Quote)
 *   2. Two-column layout:
 *      Left column:
 *        - AI auto-fill banner (Sparkles + "Auto-fill with AI" CTA, locked
 *          behind the ai_quote_generator plan-gate)
 *        - Quote Details (Title, Client picker, Quote #, Valid Until,
 *          Description)
 *        - Product / Service (line items editor: service picker / qty /
 *          unit price / line total / remove-row)
 *        - Add-ons (name / price / remove-row)
 *        - Contract / Disclaimer (textarea with "Apply to all future
 *          quotes" checkbox — currently cosmetic, not wired to state)
 *        - Notes (textarea bound to form.description)
 *      Right column (summary sidebar):
 *        - Summary card (Subtotal, Discount, Tax, Total)
 *        - Discount card (type + value)
 *        - Tax card (% rate + absolute tax amount)
 *        - "Preview WhatsApp" button (builds a synthetic preview Quote
 *          from the form state and opens the Email Preview dialog)
 *
 * The component is a controlled form: ALL state lives in the parent
 * QuotesView and is threaded through as props. Pure extraction — same JSX,
 * same handler wiring, same prop dependencies — moved to its own file so
 * quotes-view.tsx shrinks by ~400 lines.
 *
 * Extracted from src/components/views/quotes-view.tsx (Phase 5B refactor).
 */

import {
  FileText, ShoppingCart, ScrollText, StickyNote, Calculator,
  PlusCircle, MinusCircle, Plus, Loader2, Sparkles, Lock,
  MessageCircle, Tag, Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerSelect } from '@/components/shared/customer-select';
import { FormSectionCard } from '@/components/shared/form-section-card';
import {
  MOCK_SERVICE_CATALOG,
  type QuoteSummary,
} from '@/features/quotes/utils/quote-helpers';
import type {
  Customer,
  QuoteAddOn,
  QuoteFormData,
  QuoteServiceItem,
} from '@/features/quotes/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderNewQuotePage()` reached
// into from the parent QuotesView. Each prop below corresponds 1:1 to a
// parent state slot or handler; the wiring at the call site just spreads
// them in.
export interface NewQuotePageProps {
  /** ID of the quote being edited, or null when creating a new one. */
  editingQuoteId: string | null;
  /** Current form state. */
  form: QuoteFormData;
  /** Setter for any form field (top-level merge). */
  setForm: (
    updater: QuoteFormData | ((prev: QuoteFormData) => QuoteFormData)
  ) => void;
  /** Save handler — kicks off the POST/PUT. */
  onSave: () => void;
  /** Cancel / back to list handler. */
  onCancel: () => void;
  /** True while the save request is in-flight. */
  saving: boolean;

  // ── Customer picker ───────────────────────────────────────────────────
  /** All loaded customers — used to resolve customerName when the picker
   *  selection changes. */
  customers: Customer[];

  // ── AI Quote Generator ────────────────────────────────────────────────
  /** Open the AI Quote Generator dialog (or the UpgradeModal when locked). */
  onOpenAiDialog: () => void;
  /** True when the ai_quote_generator feature is gated by the current plan. */
  aiLocked: boolean;

  // ── Line item handlers ────────────────────────────────────────────────
  /** Add a fresh empty service item to the form. */
  onAddServiceItem: () => void;
  /** Remove a service item by id. */
  onRemoveServiceItem: (id: string) => void;
  /** Service-catalog picker change — fills name + price from the catalog. */
  onServiceSelect: (itemId: string, serviceId: string) => void;
  /** Update a single field on a service item (qty / price). */
  onServiceFieldChange: (
    itemId: string,
    field: keyof QuoteServiceItem,
    value: string | number
  ) => void;

  // ── Add-on handlers ───────────────────────────────────────────────────
  /** Add a fresh empty add-on to the form. */
  onAddAddOn: () => void;
  /** Remove an add-on by id. */
  onRemoveAddOn: (id: string) => void;
  /** Update a single field on an add-on (name / price). */
  onAddOnChange: (
    id: string,
    field: keyof QuoteAddOn,
    value: string | number
  ) => void;

  // ── Computed totals (derived in parent from form state) ───────────────
  /** Full summary (subtotal / discount / tax / total) computed via
   *  `calcSummary(form.services, form.addOns, form.discountType,
   *  form.discountValue, form.taxRate)`. */
  formSummary: QuoteSummary;

  // ── Currency ──────────────────────────────────────────────────────────
  /** Company base currency code (e.g. 'USD'). Used in the WhatsApp-preview
   *  synthetic Quote's currency / baseCurrency / exchangeRate fields. */
  currency: string;
  /** Currency formatter from useCompanyCurrency hook (e.g. $1,234.50). */
  format: (n: number, sourceCurrency?: string) => string;
  /** Currency symbol for the company's currency (e.g. '$'). */
  symbol: string;

  // ── Preview dialog trigger ────────────────────────────────────────────
  /** Build a synthetic preview Quote from the current form state and open
   *  the Email Preview dialog. The parent owns `selectedQuote` and
   *  `showPreviewDialog` state, so the synthetic Quote construction stays
   *  in the parent (it has access to `form` + `customers` + `currency`
   *  already). */
  onPreviewWhatsApp: () => void;
}

/**
 * Full-page Create/Edit Quote form. Pure presentational — see props above.
 */
export function NewQuotePage({
  editingQuoteId,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  customers,
  onOpenAiDialog,
  aiLocked,
  onAddServiceItem,
  onRemoveServiceItem,
  onServiceSelect,
  onServiceFieldChange,
  onAddAddOn,
  onRemoveAddOn,
  onAddOnChange,
  formSummary,
  currency: _currency,
  format,
  symbol,
  onPreviewWhatsApp,
}: NewQuotePageProps) {
  return (
    <div className="w-full space-y-6">
      {/* ─── Sticky page header (Back + title + actions) ────────── */}
      <div className="form-page-header -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mb-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <Separator orientation="vertical" className="h-8 bg-border/60 hidden sm:block" />
            <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
              <Plus className="size-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                {editingQuoteId ? 'Edit Quote' : 'New Quote'}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {editingQuoteId ? 'Update the quote details below' : 'Fill in the details to create a new quote'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</>
              ) : editingQuoteId ? (
                'Update Quote'
              ) : (
                <><Plus className="size-4 mr-1.5" /> Create Quote</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Main content: two-column layout ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left column: form fields */}
        <div className="space-y-6">
          {/* AI auto-fill banner */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:bg-emerald-950/20 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex items-center justify-center size-9 rounded-lg bg-emerald-600 shrink-0 shadow-sm">
                <Sparkles className="size-5 text-white" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  Auto-fill with AI
                  {aiLocked && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                      <Lock className="size-3 mr-1" /> Pro
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Describe the job and let AI build the entire quote — line items, pricing, timeline, and risk assessment.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenAiDialog}
              className="border-emerald-600/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 shrink-0"
            >
              {aiLocked ? (
                <Lock className="size-4 mr-1.5" />
              ) : (
                <Sparkles className="size-4 mr-1.5" />
              )}
              Auto-fill with AI
            </Button>
          </div>

          {/* Quote metadata */}
          <FormSectionCard icon={FileText} title="Quote Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Window Cleaning"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Client *</Label>
                <CustomerSelect
                  value={form.customerId}
                  onChange={(id) => {
                    const customer = id ? customers.find((c) => c.id === id) : null;
                    setForm((prev) => ({ ...prev, customerId: id || '', customerName: customer?.name || '' }));
                  }}
                  initialCustomer={form.customerId && form.customerName ? { id: form.customerId, name: form.customerName } : null}
                  placeholder="Search for a client…"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Quote #</Label>
                <Input
                  placeholder="Auto-generated"
                  disabled
                  className="bg-muted/30 font-mono text-sm"
                  value={editingQuoteId ? `#${editingQuoteId.slice(-6).toUpperCase()}` : 'Auto'}
                />
              </div>
              <div className="space-y-2">
                <Label>Valid Until *</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Description</Label>
              <Textarea
                placeholder="Quote description or notes..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="text-sm"
              />
            </div>
          </FormSectionCard>

          {/* Product / Service section */}
          <FormSectionCard
            icon={ShoppingCart}
            title="Product / Service"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
                onClick={onAddServiceItem}
              >
                <PlusCircle className="size-3.5 mr-1" /> Add Line Item
              </Button>
            }
          >
            <div className="space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Name</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>
              {form.services.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center">
                    <Select
                      value={item.serviceId}
                      onValueChange={(val) => onServiceSelect(item.id, val)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_SERVICE_CATALOG.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} — {format(s.basePrice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={1}
                      value={item.quantity}
                      onChange={(e) => onServiceFieldChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-9 text-sm"
                      placeholder="Qty"
                    />
                    <Input
                      type="number" min={0}
                      value={item.price}
                      onChange={(e) => onServiceFieldChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="h-9 text-sm"
                      placeholder="Price"
                    />
                    <div className="text-right text-sm font-medium pr-1">
                      {format(item.price * item.quantity)}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      disabled={form.services.length <= 1}
                      onClick={() => onRemoveServiceItem(item.id)}
                    >
                      <MinusCircle className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </FormSectionCard>

          {/* Add-ons section */}
          <FormSectionCard
            icon={PlusCircle}
            title="Add-ons"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
                onClick={onAddAddOn}
              >
                <PlusCircle className="size-3.5 mr-1" /> Add Add-on
              </Button>
            }
          >
            {form.addOns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No add-ons added yet</p>
            ) : (
              <div className="space-y-2">
                {form.addOns.map((addon) => (
                  <div key={addon.id} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                    <Input
                      placeholder="Add-on name"
                      value={addon.name}
                      onChange={(e) => onAddOnChange(addon.id, 'name', e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number" min={0}
                      value={addon.price}
                      onChange={(e) => onAddOnChange(addon.id, 'price', parseFloat(e.target.value) || 0)}
                      className="h-9 text-sm"
                      placeholder="Price"
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      onClick={() => onRemoveAddOn(addon.id)}
                    >
                      <MinusCircle className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormSectionCard>

          {/* Contract / Disclaimer section */}
          <FormSectionCard icon={ScrollText} title="Contract / Disclaimer">
            <Textarea
              defaultValue="This quote is valid for the next 30 days, after which values may be subject to change."
              rows={3}
              className="text-sm"
              placeholder="Add contract or disclaimer text..."
            />
            <label className="flex items-center gap-2 mt-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              Apply to all future quotes
            </label>
          </FormSectionCard>

          {/* Notes section */}
          <FormSectionCard icon={StickyNote} title="Notes">
            <Textarea
              placeholder="Leave an internal note for yourself or a team member"
              rows={3}
              className="text-sm"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </FormSectionCard>
        </div>

        {/* Right column: summary sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card>
            <CardContent className="p-5">
              <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-1.5">
                <Calculator className="size-4 text-emerald-600" /> Summary
              </h4>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{format(formSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount {form.discountType === 'percentage' ? `(${form.discountValue}%)` : ''}
                  </span>
                  <span className="font-medium text-red-600">-{format(formSummary.discount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({form.taxRate}%)</span>
                  <span className="font-medium">+{format(formSummary.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-emerald-700">{format(formSummary.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discount settings */}
          <Card>
            <CardContent className="p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Tag className="size-4 text-emerald-600" /> Discount
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select
                    value={form.discountType}
                    onValueChange={(val: 'fixed' | 'percentage') => setForm((prev) => ({ ...prev, discountType: val }))}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed ({symbol})</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  <Input
                    type="number" min={0}
                    value={form.discountValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax settings */}
          <Card>
            <CardContent className="p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Percent className="size-4 text-emerald-600" /> Tax
              </h4>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={form.taxRate}
                  onChange={(e) => setForm((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="h-9 text-sm w-24"
                />
                <span className="text-sm text-muted-foreground">% rate</span>
                <span className="text-sm ml-auto font-medium">{format(formSummary.tax)}</span>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Preview button */}
          {form.customerId && form.title && (
            <Button
              variant="outline"
              className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              onClick={onPreviewWhatsApp}
            >
              <MessageCircle className="size-4 mr-1.5" /> Preview WhatsApp
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * NewInvoicePage — Phase 5A extraction from invoices-view.tsx.
 *
 * Replaces the inline `renderNewInvoicePage()` closure that used to live
 * inside the parent InvoicesView component. The form renders the full-page
 * Create/Edit Invoice surface (Jobber-style) with these sections:
 *
 *   1. Sticky page header (Back + Cancel / Create Invoice or Save Changes)
 *   2. Two-column layout:
 *      Left column:
 *        - Invoice Details (Subject, Client picker, Invoice #, Issued Date,
 *          Due Date, Payment Terms)
 *        - Product / Service (line items editor: description / qty / rate /
 *          total / remove-row)
 *        - Contract / Disclaimer (textarea)
 *        - Notes (textarea)
 *      Right column:
 *        - Summary card (Subtotal, Discount, Tax %, Total, Invoice Balance)
 *
 * The component is a controlled form: ALL state lives in the parent
 * InvoicesView and is threaded through as props. Pure extraction — same JSX,
 * same handler wiring, same prop dependencies — moved to its own file so
 * invoices-view.tsx shrinks by ~295 lines.
 *
 * Extracted from src/components/views/invoices-view.tsx (Phase 5A refactor).
 */

import {
  FileText, ShoppingCart, ScrollText, StickyNote, Calculator,
  PlusCircle, MinusCircle, Pencil, Plus, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormSectionCard } from '@/components/shared/form-section-card';
import type { LineItem } from '@/features/invoices/types';
import type {
  Customer,
  Invoice,
  InvoiceFormData,
} from '@/features/invoices/types';

// ── Props contract ──────────────────────────────────────────────────────────
// Mirrors the closure variables the original `renderNewInvoicePage()` reached
// into from the parent InvoicesView. Each prop below corresponds 1:1 to a
// parent state slot or handler; the wiring at the call site just spreads them
// in.
export interface NewInvoicePageProps {
  /** Invoice being edited, or null when creating a new one. */
  editingInvoice: Invoice | null;
  /** Current form state. */
  form: InvoiceFormData;
  /** Setter for any form field (top-level merge). */
  setForm: (
    updater: InvoiceFormData | ((prev: InvoiceFormData) => InvoiceFormData)
  ) => void;
  /** Save handler — kicks off the POST/PUT. */
  onSave: () => void;
  /** Cancel / back to list handler. */
  onCancel: () => void;
  /** True while the save request is in-flight. */
  saving: boolean;

  // ── Customer picker ───────────────────────────────────────────────────
  /** All loaded customers — used to populate the client <Select> options. */
  customers: Customer[];
  /** True while customers are being fetched (drives the picker placeholder). */
  loadingCustomers: boolean;

  // ── Line items handlers ───────────────────────────────────────────────
  /** Add a fresh empty line item to the form. */
  onAddLineItem: () => void;
  /** Remove a line item by id. */
  onRemoveLineItem: (id: string) => void;
  /** Update a single field on a line item. */
  onLineItemChange: (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => void;

  // ── Computed totals (derived in parent from form state) ───────────────
  /** Subtotal of all line items (sum of qty × rate). */
  formSubtotal: number;
  /** Absolute tax amount (subtotal × taxPercent / 100). */
  formTax: number;
  /** Final total (subtotal + tax − discount). */
  formTotal: number;

  // ── Currency ──────────────────────────────────────────────────────────
  /** Currency formatter from useCompanyCurrency hook (e.g. $1,234.50). */
  format: (n: number, sourceCurrency?: string) => string;
}

/**
 * Full-page Create/Edit Invoice form. Pure presentational — see props above.
 */
export function NewInvoicePage({
  editingInvoice,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  customers,
  loadingCustomers,
  onAddLineItem,
  onRemoveLineItem,
  onLineItemChange,
  formSubtotal,
  formTax,
  formTotal,
  format,
}: NewInvoicePageProps) {
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
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
            <Separator
              orientation="vertical"
              className="h-8 bg-border/60 hidden sm:block"
            />
            <div className="flex items-center justify-center size-9 rounded-lg shrink-0 shadow-sm bg-emerald-600">
              {editingInvoice ? (
                <Pencil className="size-5 text-white" strokeWidth={2.2} />
              ) : (
                <Plus className="size-5 text-white" strokeWidth={2.2} />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
                {editingInvoice
                  ? `Edit Invoice ${editingInvoice.number}`
                  : 'New Invoice'}
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {editingInvoice
                  ? 'Update the invoice details'
                  : 'Fill in the details to create a new invoice'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              className={
                editingInvoice
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...
                </>
              ) : editingInvoice ? (
                <>
                  <Pencil className="size-4 mr-1.5" /> Save Changes
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-1.5" /> Create Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Main content: two-column layout ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left column: form fields */}
        <div className="space-y-6">
          {/* Invoice header info */}
          <FormSectionCard icon={FileText} title="Invoice Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  placeholder="For Services Rendered"
                  value={
                    form.notes && form.notes.includes('For Services Rendered')
                      ? 'For Services Rendered'
                      : ''
                  }
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={form.customer}
                  onValueChange={(val) =>
                    setForm((prev) => ({ ...prev, customer: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCustomers
                          ? 'Loading customers...'
                          : 'Select a client'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCustomers ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin" /> Loading...
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No customers found
                      </div>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` · ${c.phone}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input
                  placeholder="Auto-generated"
                  disabled
                  className="bg-muted/30 font-mono text-sm"
                  value={editingInvoice ? editingInvoice.number : 'Auto'}
                />
              </div>
              <div className="space-y-2">
                <Label>Issued Date</Label>
                <Input
                  type="date"
                  value={
                    editingInvoice
                      ? editingInvoice.createdAt.split('T')[0]
                      : new Date().toISOString().split('T')[0]
                  }
                  disabled
                  className="bg-muted/30 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select
                  value={form.dueDate ? 'custom' : 'due_receipt'}
                  onValueChange={(val) => {
                    if (val === 'due_receipt') {
                      setForm((prev) => ({
                        ...prev,
                        dueDate: new Date().toISOString().split('T')[0],
                      }));
                    } else if (val === 'net15') {
                      const d = new Date();
                      d.setDate(d.getDate() + 15);
                      setForm((prev) => ({
                        ...prev,
                        dueDate: d.toISOString().split('T')[0],
                      }));
                    } else if (val === 'net30') {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setForm((prev) => ({
                        ...prev,
                        dueDate: d.toISOString().split('T')[0],
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_receipt">
                      Due upon receipt
                    </SelectItem>
                    <SelectItem value="net15">Net 15 days</SelectItem>
                    <SelectItem value="net30">Net 30 days</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                onClick={onAddLineItem}
              >
                <PlusCircle className="size-3.5 mr-1" /> Add Line Item
              </Button>
            }
          >
            <div className="space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Name</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>
              {form.lineItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 items-center">
                    <Input
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) =>
                        onLineItemChange(item.id, 'description', e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        onLineItemChange(
                          item.id,
                          'quantity',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={item.rate}
                      onChange={(e) =>
                        onLineItemChange(
                          item.id,
                          'rate',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-9 text-sm"
                    />
                    <div className="text-right text-sm font-medium pr-1">
                      {format(item.quantity * item.rate)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      disabled={form.lineItems.length <= 1}
                      onClick={() => onRemoveLineItem(item.id)}
                    >
                      <MinusCircle className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </FormSectionCard>

          {/* Contract / Disclaimer section */}
          <FormSectionCard icon={ScrollText} title="Contract / Disclaimer">
            <Textarea
              defaultValue="Thank you for your business. Please contact us with any questions regarding this invoice."
              rows={3}
              className="text-sm"
              placeholder="Add contract or disclaimer text..."
            />
          </FormSectionCard>

          {/* Notes section */}
          <FormSectionCard icon={StickyNote} title="Notes">
            <Textarea
              placeholder="Leave an internal note for yourself or a team member"
              rows={3}
              className="text-sm"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
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
                  <span className="font-medium">{format(formSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={form.discount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          discount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="h-7 w-20 text-sm text-right"
                    />
                    <span className="font-medium">-{format(form.discount)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.taxPercent}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          taxPercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="h-7 w-16 text-sm text-right"
                    />
                    <span className="text-muted-foreground">%</span>
                    <span className="font-medium ml-2">{format(formTax)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-emerald-700">{format(formTotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice Balance</span>
                  <span className="font-medium">{format(formTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

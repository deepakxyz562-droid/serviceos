'use client';

/**
 * InvoiceCreateDialog — create a new draft invoice with line items.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Pure presentational component — the parent owns:
 *   • `open`, `onOpenChange` — dialog open state.
 *   • `invoiceItems`, `setInvoiceItems` — dynamic line item rows.
 *   • `invoiceDueDate`, `setInvoiceDueDate` — optional due date.
 *   • `invoiceNotes`, `setInvoiceNotes` — optional notes.
 *   • `creating` — submission in-flight flag.
 *   • `onCreate` — submit handler (POSTs to `/api/invoices`, invalidates
 *     the customer360 query).
 *   • `format` — company currency formatter (for the subtotal preview).
 */

import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { CurrencyFormatFn, InvoiceLineItem } from '../types';

interface InvoiceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  invoiceItems: InvoiceLineItem[];
  setInvoiceItems: (items: InvoiceLineItem[]) => void;
  invoiceDueDate: string;
  setInvoiceDueDate: (v: string) => void;
  invoiceNotes: string;
  setInvoiceNotes: (v: string) => void;
  creating: boolean;
  onCreate: () => void;
  format: CurrencyFormatFn;
}

export function InvoiceCreateDialog({
  open,
  onOpenChange,
  customerName,
  invoiceItems,
  setInvoiceItems,
  invoiceDueDate,
  setInvoiceDueDate,
  invoiceNotes,
  setInvoiceNotes,
  creating,
  onCreate,
  format,
}: InvoiceCreateDialogProps) {
  const updateItem = (idx: number, patch: Partial<InvoiceLineItem>) => {
    const next = [...invoiceItems];
    next[idx] = { ...next[idx], ...patch };
    setInvoiceItems(next);
  };

  const removeItem = (idx: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, rate: 0 }]);
  };

  const subtotal = invoiceItems.reduce((s, it) => s + it.quantity * it.rate, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>New Invoice for {customerName}</DialogTitle>
          <DialogDescription>Add line items. Invoice will be created as draft.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-2">
          <div className="space-y-2">
            {invoiceItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                    placeholder="Service or product"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Rate</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={e => updateItem(idx, { rate: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1">
                  {invoiceItems.length > 1 && (
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeItem(idx)}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-3.5 mr-1" /> Add Line Item
          </Button>
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{format(subtotal)}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} rows={2} placeholder="Optional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onCreate} disabled={creating}>
            {creating ? <><Loader2 className="size-4 mr-1 animate-spin" /> Creating...</> : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

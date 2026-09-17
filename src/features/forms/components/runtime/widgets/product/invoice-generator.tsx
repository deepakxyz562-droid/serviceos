'use client';

import React, { useState } from 'react';
import { ReceiptText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { WidgetProps } from '../widget-props';

interface InvoiceLine {
  description: string;
  qty: number;
  price: number;
}

interface InvoiceValue {
  invoiceNumber: string;
  lineItems: InvoiceLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

interface InvoiceConfig {
  currency?: string;
  taxRate?: number;
  invoicePrefix?: string;
  defaultLineItems?: InvoiceLine[];
  company?: string;
}

export function InvoiceGenerator({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as InvoiceConfig;
  const currency = String(cfg.currency ?? 'USD');
  const taxRate = Number(cfg.taxRate ?? 0);
  const label = String(field?.label ?? 'Invoice');

  const existing = value as InvoiceValue | undefined;
  const [invoiceNumber, setInvoiceNumber] = useState<string>(existing?.invoiceNumber || `${cfg.invoicePrefix || 'INV'}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [lines, setLines] = useState<InvoiceLine[]>(() => {
    if (existing?.lineItems?.length) return existing.lineItems;
    return cfg.defaultLineItems || [{ description: 'Item or service', qty: 1, price: 0 }];
  });

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const taxAmount = +(subtotal * taxRate / 100).toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);

  const emit = (nextLines: InvoiceLine[]) => {
    const sub = nextLines.reduce((s, l) => s + l.qty * l.price, 0);
    const tax = +(sub * taxRate / 100).toFixed(2);
    const next: InvoiceValue = {
      invoiceNumber, lineItems: nextLines, subtotal: +sub.toFixed(2),
      taxRate, taxAmount: tax, total: +(sub + tax).toFixed(2), currency,
    };
    onChange(next);
  };

  const updateLine = (idx: number, patch: Partial<InvoiceLine>) => {
    const next = lines.map((l, i) => i === idx ? { ...l, ...patch } : l);
    setLines(next); emit(next);
  };
  const addLine = () => {
    const next = [...lines, { description: '', qty: 1, price: 0 }];
    setLines(next); emit(next);
  };
  const removeLine = (idx: number) => {
    const next = lines.filter((_, i) => i !== idx);
    setLines(next.length ? next : [{ description: '', qty: 1, price: 0 }]); emit(next);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ReceiptText className="size-4 text-blue-600" />
          <span className="text-xs font-bold">Invoice Preview</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{invoiceNumber}</span>
      </div>
      {cfg.company && <p className="text-[11px] text-muted-foreground">{cfg.company}</p>}
      <div className="space-y-1.5">
        <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-muted-foreground px-1">
          <div className="col-span-6">Description</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-1"></div>
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-1 items-center">
            <Input value={line.description} onChange={(e) => updateLine(idx, { description: e.target.value })} disabled={disabled} placeholder="Item / service" className="col-span-6 h-8 text-xs" />
            <Input type="number" min={1} value={line.qty} onChange={(e) => updateLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })} disabled={disabled} className="col-span-2 h-8 text-xs text-center" />
            <Input type="number" min={0} step="0.01" value={line.price} onChange={(e) => updateLine(idx, { price: Number(e.target.value) || 0 })} disabled={disabled} className="col-span-3 h-8 text-xs text-right font-mono" />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={disabled} className="col-span-1 h-8 w-8 p-0 text-muted-foreground hover:text-red-500" aria-label="Remove line">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={disabled} className="text-xs gap-1 h-7">
        <Plus className="size-3" /> Add line
      </Button>
      <Separator />
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{subtotal.toFixed(2)} {currency}</span></div>
        {taxRate > 0 && (
          <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="font-mono">{taxAmount.toFixed(2)} {currency}</span></div>
        )}
        <div className="flex justify-between pt-1 border-t border-border/60"><span className="font-bold">Total Due</span><span className="font-black text-emerald-600 dark:text-emerald-400">{total.toFixed(2)} {currency}</span></div>
      </div>
    </div>
  );
}

export default InvoiceGenerator;

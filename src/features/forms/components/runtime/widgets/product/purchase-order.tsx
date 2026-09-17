'use client';

import React, { useState } from 'react';
import { FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { WidgetProps } from '../widget-props';

interface PurchaseOrderValue {
  poNumber: string;
  terms: string;
  billingEmail?: string;
  amount: number;
  currency: string;
}

interface PurchaseOrderConfig {
  amount?: number;
  currency?: string;
  termsText?: string;
  defaultTerms?: string;
}

export function PurchaseOrder({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as PurchaseOrderConfig;
  const amount = Number(cfg.amount ?? 0);
  const currency = String(cfg.currency ?? 'USD');
  const termsText = cfg.termsText || 'By submitting this purchase order, you authorize our billing team to invoice your organization under the selected payment terms. Invoices are due per the terms specified above.';
  const label = String(field?.label ?? 'Purchase Order');

  const existing = value as PurchaseOrderValue | undefined;
  const [poNumber, setPoNumber] = useState(existing?.poNumber || '');
  const [terms, setTerms] = useState(existing?.terms || cfg.defaultTerms || 'net_30');
  const [email, setEmail] = useState(existing?.billingEmail || '');
  const [submitted, setSubmitted] = useState(Boolean(existing?.poNumber));

  const handleSubmit = () => {
    if (disabled || !poNumber.trim()) return;
    const next: PurchaseOrderValue = {
      poNumber: poNumber.trim(), terms, billingEmail: email || undefined, amount, currency,
    };
    onChange(next);
    setSubmitted(true);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <FileText className="size-4 text-slate-700 dark:text-slate-300" />
        </div>
        <div>
          <p className="text-xs font-bold">Purchase Order</p>
          <p className="text-[10px] text-muted-foreground">B2B / offline billing</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">PO Number *</Label>
        <Input value={poNumber} onChange={(e) => { setPoNumber(e.target.value); setSubmitted(false); }} disabled={disabled}
          placeholder="PO-2026-98124" className="h-9 text-xs font-mono" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">Payment Terms</Label>
          <Select value={terms} onValueChange={setTerms} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due_receipt">Due on Receipt</SelectItem>
              <SelectItem value="net_15">Net 15</SelectItem>
              <SelectItem value="net_30">Net 30</SelectItem>
              <SelectItem value="net_60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold">AP Billing Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled}
            placeholder="ap@company.com" type="email" className="h-8 text-xs" />
        </div>
      </div>
      {amount > 0 && (
        <div className="flex justify-between items-center p-2 rounded-lg bg-muted/40 text-xs">
          <span className="font-semibold text-muted-foreground">Amount Due</span>
          <span className="font-black text-emerald-600 dark:text-emerald-400">{amount.toFixed(2)} {currency}</span>
        </div>
      )}
      <Separator />
      <p className="text-[10px] text-muted-foreground leading-relaxed">{termsText}</p>
      <Button type="button" disabled={disabled || !poNumber.trim()} onClick={handleSubmit}
        className="w-full h-9 text-xs gap-1.5">
        {submitted ? <><CheckCircle2 className="size-3.5" /> PO Submitted</> : <>Submit Purchase Order</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Secure billing</span>
        <span className="font-mono">PO Form</span>
      </div>
    </div>
  );
}

export default PurchaseOrder;

'use client';

import React, { useState } from 'react';
import { MapPin, User, Mail, Building2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { WidgetProps } from '../widget-props';

interface BillingAddressValue {
  name: string;
  email: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  sameAsShipping: boolean;
}

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'India'];

export function BillingAddress({ value, onChange, config, disabled, field }: WidgetProps) {
  const label = String(field?.label ?? 'Billing Address');
  const existing = value as BillingAddressValue | undefined;
  const [form, setForm] = useState<BillingAddressValue>({
    name: existing?.name || '',
    email: existing?.email || '',
    company: existing?.company || '',
    line1: existing?.line1 || '',
    line2: existing?.line2 || '',
    city: existing?.city || '',
    state: existing?.state || '',
    postalCode: existing?.postalCode || '',
    country: existing?.country || 'United States',
    sameAsShipping: existing?.sameAsShipping ?? true,
  });

  const update = (patch: Partial<BillingAddressValue>) => {
    if (disabled) return;
    const next = { ...form, ...patch };
    setForm(next);
    onChange(next);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-4 text-blue-600" />
          <span className="text-xs font-bold">Billing Address</span>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
          <Switch checked={form.sameAsShipping} onCheckedChange={(v) => update({ sameAsShipping: v })} disabled={disabled} />
          Same as shipping
        </label>
      </div>

      {form.sameAsShipping ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center space-y-1">
          <CheckCircle2 className="size-5 mx-auto text-emerald-600" />
          <p className="text-xs font-semibold">Billing matches shipping address</p>
          <p className="text-[10px] text-muted-foreground">Toggle off to enter a different billing address.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold flex items-center gap-1"><User className="size-3" /> Full Name</Label>
              <Input value={form.name} onChange={(e) => update({ name: e.target.value })} disabled={disabled} placeholder="Jane Doe" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold flex items-center gap-1"><Mail className="size-3" /> Email</Label>
              <Input value={form.email} onChange={(e) => update({ email: e.target.value })} disabled={disabled} placeholder="jane@company.com" type="email" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold flex items-center gap-1"><Building2 className="size-3" /> Company (optional)</Label>
            <Input value={form.company} onChange={(e) => update({ company: e.target.value })} disabled={disabled} placeholder="Acme Inc." className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Address Line 1</Label>
            <Input value={form.line1} onChange={(e) => update({ line1: e.target.value })} disabled={disabled} placeholder="123 Main St" className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Address Line 2 (optional)</Label>
            <Input value={form.line2} onChange={(e) => update({ line2: e.target.value })} disabled={disabled} placeholder="Apt 4B" className="h-8 text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">City</Label>
              <Input value={form.city} onChange={(e) => update({ city: e.target.value })} disabled={disabled} placeholder="San Francisco" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">State</Label>
              <Input value={form.state} onChange={(e) => update({ state: e.target.value })} disabled={disabled} placeholder="CA" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">ZIP</Label>
              <Input value={form.postalCode} onChange={(e) => update({ postalCode: e.target.value })} disabled={disabled} placeholder="94103" className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Country</Label>
            <select value={form.country} onChange={(e) => update({ country: e.target.value })} disabled={disabled}
              className="h-8 w-full text-xs rounded-md border border-input bg-background px-2">
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </>
      )}
      <Separator />
    </div>
  );
}

export default BillingAddress;

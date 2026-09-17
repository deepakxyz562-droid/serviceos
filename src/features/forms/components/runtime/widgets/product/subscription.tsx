'use client';

import React, { useState } from 'react';
import { CheckCircle2, Calendar, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { WidgetProps } from '../widget-props';

interface SubscriptionValue {
  plan: string;
  interval: 'monthly' | 'yearly';
  price: number;
  trialDays?: number;
}

interface SubscriptionConfig {
  currency?: string;
  planName?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  yearlyDiscountPct?: number;
  trialDays?: number;
  features?: string[];
}

export function Subscription({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as SubscriptionConfig;
  const currency = String(cfg.currency ?? 'USD');
  const planName = cfg.planName || 'Pro Plan';
  const monthly = Number(cfg.monthlyPrice ?? 19);
  const yearly = Number(cfg.yearlyPrice ?? 190);
  const trialDays = Number(cfg.trialDays ?? 0);
  const features = (cfg.features || ['Core features', 'Priority support', 'Unlimited usage']) as string[];
  const label = String(field?.label ?? planName);

  const existing = value as SubscriptionValue | undefined;
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(existing?.interval || 'monthly');
  const [selected, setSelected] = useState<boolean>(Boolean(existing?.plan));

  const price = interval === 'monthly' ? monthly : yearly;
  const perMonthIfYearly = (yearly / 12).toFixed(2);
  const savings = monthly * 12 - yearly;

  const handleSelect = () => {
    if (disabled) return;
    const next: SubscriptionValue = { plan: planName, interval, price, trialDays: trialDays || undefined };
    onChange(next);
    setSelected(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3" aria-label={label}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-amber-500" />
          <span className="text-sm font-bold">{planName}</span>
        </div>
        {trialDays > 0 && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Calendar className="size-3" /> {trialDays}-day trial
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setInterval('monthly'); setSelected(false); }}
          className={`rounded-lg border p-2 text-left transition-all ${interval === 'monthly' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-border bg-muted/30'}`}
          aria-label="Monthly billing"
        >
          <div className="text-[10px] font-semibold text-muted-foreground">Monthly</div>
          <div className="text-base font-black">{monthly.toFixed(2)} {currency}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></div>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setInterval('yearly'); setSelected(false); }}
          className={`rounded-lg border p-2 text-left transition-all ${interval === 'yearly' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-border bg-muted/30'}`}
          aria-label="Yearly billing"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground">Yearly</span>
            <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-emerald-100 text-emerald-800">Save {savings > 0 ? Math.round((savings / (monthly * 12)) * 100) : 0}%</Badge>
          </div>
          <div className="text-base font-black">{perMonthIfYearly} {currency}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></div>
        </button>
      </div>

      <Separator />

      <ul className="space-y-1.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground">
            <Star className="size-3 text-amber-500 fill-amber-500" /> {f}
          </li>
        ))}
      </ul>

      <Button type="button" disabled={disabled} onClick={handleSelect} className="w-full h-9 text-xs gap-1.5">
        {selected ? <><CheckCircle2 className="size-3.5" /> Subscribed — {price.toFixed(2)} {currency}</> : <>Subscribe — {price.toFixed(2)} {currency}</>}
      </Button>
    </div>
  );
}

export default Subscription;

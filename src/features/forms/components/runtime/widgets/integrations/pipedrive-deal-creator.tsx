'use client';

import React, { useState } from 'react';
import { Workflow, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface PipedriveDealValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  dealId?: string;
  title?: string;
  value?: number;
}

export function PipedriveDealCreator({ value, onChange, config, disabled, field }: WidgetProps) {
  const apiToken = str(config.apiToken, '');
  const ariaLabel = str(field?.label, 'Pipedrive deal');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = (value as Partial<PipedriveDealValue> | undefined) ?? {};
  const [title, setTitle] = useState('');
  const [dealValue, setDealValue] = useState('');

  const handleCreate = () => {
    if (disabled) return;
    if (!title.trim()) {
      setError('Deal title required.');
      return;
    }
    setPending(true); setError(null);
    setTimeout(() => {
      const next: PipedriveDealValue = {
        integrated: true, timestamp: new Date().toISOString(),
        externalId: `pd_deal_${Math.random().toString(36).slice(2, 10)}`,
        dealId: `${Math.floor(Math.random() * 9000) + 1000}`,
        title, value: Number(dealValue) || 0,
      };
      onChange(next);
      setPending(false);
    }, 700);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Workflow className="size-3.5 text-[#1a1a1a] dark:text-white" />
        <span className="text-xs font-semibold">Pipedrive Deal</span>
        {!apiToken && <span className="ml-auto text-[10px] text-amber-600">no API token</span>}
      </div>
      {existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Deal created. ID: <span className="font-mono">{existing.dealId}</span></span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input placeholder="Deal title *" value={title} disabled={disabled || pending}
            onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
          <Input type="number" placeholder="Deal value" value={dealValue} disabled={disabled || pending}
            onChange={(e) => setDealValue(e.target.value)} className="h-8 text-xs" inputMode="decimal" />
          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
          <Button type="button" disabled={disabled || pending} onClick={handleCreate}
            className="w-full h-9 bg-[#1a1a1a] hover:bg-[#000] dark:bg-white dark:hover:bg-slate-200 dark:text-black text-white text-xs gap-1.5">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Workflow className="size-3.5" />} Create Deal
          </Button>
        </div>
      )}
    </div>
  );
}

export default PipedriveDealCreator;

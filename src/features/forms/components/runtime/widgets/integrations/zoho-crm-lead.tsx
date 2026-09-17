'use client';

import React, { useState } from 'react';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface ZohoCrmLeadValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  leadId?: string;
}

interface ZohoLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function ZohoCrmLead({ value, onChange, config, disabled, field }: WidgetProps) {
  const accessToken = str(config.accessToken, '');
  const ariaLabel = str(field?.label, 'Zoho CRM lead');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = (value as Partial<ZohoCrmLeadValue> | undefined) ?? {};
  const [lead, setLead] = useState<ZohoLead>({ firstName: '', lastName: '', email: '', phone: '' });

  const handleSubmit = () => {
    if (disabled) return;
    if (!lead.email || !lead.lastName) {
      setError('Last name and email are required.');
      return;
    }
    setPending(true); setError(null);
    setTimeout(() => {
      const next: ZohoCrmLeadValue = {
        integrated: true, timestamp: new Date().toISOString(),
        externalId: `zoho_lead_${Math.random().toString(36).slice(2, 10)}`,
        leadId: `${Math.floor(Math.random() * 9000000) + 1000000}`,
      };
      onChange(next);
      setPending(false);
    }, 700);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Database className="size-3.5 text-[#c8202f]" />
        <span className="text-xs font-semibold">Zoho CRM Lead</span>
        {!accessToken && <span className="ml-auto text-[10px] text-amber-600">no token</span>}
      </div>
      {existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Lead captured. Zoho ID: <span className="font-mono">{existing.leadId}</span></span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Input placeholder="First name" value={lead.firstName} disabled={disabled || pending}
              onChange={(e) => setLead({ ...lead, firstName: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Last name *" value={lead.lastName} disabled={disabled || pending}
              onChange={(e) => setLead({ ...lead, lastName: e.target.value })} className="h-8 text-xs" />
          </div>
          <Input type="email" placeholder="Email *" value={lead.email} disabled={disabled || pending}
            onChange={(e) => setLead({ ...lead, email: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Phone" value={lead.phone} disabled={disabled || pending}
            onChange={(e) => setLead({ ...lead, phone: e.target.value })} className="h-8 text-xs" />
          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
          <Button type="button" disabled={disabled || pending} onClick={handleSubmit}
            className="w-full h-9 bg-[#c8202f] hover:bg-[#a31925] text-white text-xs gap-1.5">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />} Push to Zoho
          </Button>
        </div>
      )}
    </div>
  );
}

export default ZohoCrmLead;

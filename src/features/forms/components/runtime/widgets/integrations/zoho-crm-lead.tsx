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
  company: string;
}

export function ZohoCrmLead({ value, onChange, config, disabled, field }: WidgetProps) {
  // NOTE: `accessToken` from widget config is purely cosmetic — the real
  // credential lives on the IntegrationConnection row (encrypted at rest)
  // and is fetched by the backend route. The widget never touches it.
  const accessToken = str(config.accessToken, '');
  const ariaLabel = str(field?.label, 'Zoho CRM lead');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const existing = (value as Partial<ZohoCrmLeadValue> | undefined) ?? {};
  const [lead, setLead] = useState<ZohoLead>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  });

  const handleSubmit = async () => {
    if (disabled) return;
    if (!lead.email || !lead.lastName) {
      setError('Last name and email are required.');
      return;
    }
    setPending(true);
    setError(null);
    setNotConnected(false);

    try {
      const resp = await fetch('/api/integrations/zoho/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_lead',
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
        }),
      });

      if (resp.status === 503) {
        setNotConnected(true);
        setPending(false);
        return;
      }

      const data = (await resp.json().catch(() => ({}))) as {
        externalId?: string;
        leadId?: string;
        error?: string;
      };

      if (!resp.ok || !data.externalId) {
        setError(data.error || `Failed to push lead to Zoho (${resp.status}).`);
        setPending(false);
        return;
      }

      const next: ZohoCrmLeadValue = {
        integrated: true,
        timestamp: new Date().toISOString(),
        externalId: data.externalId,
        leadId: data.leadId || data.externalId,
      };
      onChange(next);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error pushing to Zoho.');
      setPending(false);
    }
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
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
            Lead captured. Zoho ID: <span className="font-mono">{existing.leadId || existing.externalId}</span>
          </span>
        </div>
      ) : notConnected ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 flex items-center gap-2">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            Connect your Zoho CRM account in <strong>Dashboard &gt; Integrations</strong> to push leads.
          </span>
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
          <Input placeholder="Company" value={lead.company} disabled={disabled || pending}
            onChange={(e) => setLead({ ...lead, company: e.target.value })} className="h-8 text-xs" />
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

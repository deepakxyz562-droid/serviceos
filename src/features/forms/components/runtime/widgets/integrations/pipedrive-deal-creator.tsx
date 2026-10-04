'use client';

import React, { useMemo, useState } from 'react';
import { Workflow, Loader2, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface PipedriveDealValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;          // real Pipedrive deal id
  dealId?: string;              // alias for display (same as externalId)
  dealUrl?: string;             // full URL to the deal in Pipedrive
  title?: string;
  value?: number;
  simulated?: boolean;
}

interface PipedriveActionResponse {
  success?: boolean;
  externalId?: string;
  dealUrl?: string;
  error?: string;
}

export function PipedriveDealCreator({ value, onChange, config, disabled, field, allFormData }: WidgetProps) {
  // The `apiToken` from widget config is NOT used directly — it is preserved
  // here only as a UI hint. The real Pipedrive API token lives in the
  // IntegrationConnection record (provider='pipedrive', tenantId,
  // status='connected'); the widget never sees it.
  const hasLocalConfigHint = Boolean(config.apiToken);
  const ariaLabel = str(field?.label, 'Pipedrive deal');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const existing = (value as Partial<PipedriveDealValue> | undefined) ?? {};
  const [title, setTitle] = useState('');
  const [dealValue, setDealValue] = useState('');

  // Resolve a person name + email from sibling form data so the deal can be
  // linked to a newly-created Pipedrive Person. The backend handles person
  // creation + linking — the widget just forwards what it can find.
  const personContext = useMemo(() => {
    if (!allFormData || typeof allFormData !== 'object') return { name: '', email: '' };
    const fd = allFormData as Record<string, unknown>;
    const emailCandidates = ['email', 'Email', 'emailAddress', 'contactEmail', 'userEmail'];
    const nameCandidates = ['name', 'fullName', 'Name', 'contactName', 'firstName'];
    let email = '';
    for (const key of emailCandidates) {
      const v = fd[key];
      if (typeof v === 'string' && v.trim()) { email = v.trim(); break; }
    }
    let name = '';
    for (const key of nameCandidates) {
      const v = fd[key];
      if (typeof v === 'string' && v.trim()) { name = v.trim(); break; }
    }
    return { name, email };
  }, [allFormData]);

  const handleCreate = async () => {
    if (disabled) return;
    if (!title.trim()) {
      setError('Deal title required.');
      return;
    }
    setPending(true);
    setError(null);
    setNeedsConnect(false);

    const body: Record<string, unknown> = {
      action: 'create_deal',
      title: title.trim(),
    };
    const v = Number(dealValue);
    if (Number.isFinite(v) && v >= 0) body.value = v;
    const widgetStageId = str(config.stageId, '');
    if (widgetStageId) body.stageId = widgetStageId;
    if (personContext.name) body.personName = personContext.name;
    if (personContext.email) body.personEmail = personContext.email;

    try {
      const res = await fetch('/api/integrations/pipedrive/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as PipedriveActionResponse;

      if (res.status === 503) {
        setNeedsConnect(true);
        setError(data.error || 'No Pipedrive account connected.');
        setPending(false);
        return;
      }
      if (!res.ok || !data.success || !data.externalId) {
        setError(data.error || `Pipedrive deal creation failed (HTTP ${res.status})`);
        setPending(false);
        return;
      }

      // ── Success: real externalId (deal id) returned from Pipedrive ──────
      const next: PipedriveDealValue = {
        integrated: true,
        timestamp: new Date().toISOString(),
        externalId: data.externalId,
        dealId: data.externalId,
        dealUrl: data.dealUrl,
        title: title.trim(),
        value: Number(dealValue) || 0,
      };
      onChange(next);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error reaching Pipedrive');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Workflow className="size-3.5 text-[#1a1a1a] dark:text-white" />
        <span className="text-xs font-semibold">Pipedrive Deal</span>
        {!hasLocalConfigHint && <span className="ml-auto text-[10px] text-amber-600">no API token</span>}
      </div>

      {needsConnect && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
            <p className="font-semibold">Connect your Pipedrive account</p>
            <p>No Pipedrive account is connected for this tenant. Link Pipedrive in <span className="font-mono">Dashboard &gt; Integrations</span> to create deals automatically.</p>
          </div>
        </div>
      )}

      {existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Deal created. ID: <span className="font-mono">{existing.dealId}</span>
            </span>
          </div>
          {existing.dealUrl && (
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 w-fit h-7">
              <a href={existing.dealUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" /> Open deal
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input placeholder="Deal title *" value={title} disabled={disabled || pending}
            onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
          <Input type="number" placeholder="Deal value" value={dealValue} disabled={disabled || pending}
            onChange={(e) => setDealValue(e.target.value)} className="h-8 text-xs" inputMode="decimal" />
          {error && !needsConnect && (
            <p className="text-[11px] text-red-500 flex items-center gap-1">
              <AlertCircle className="size-3" /> {error}
            </p>
          )}
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

'use client';

import React, { useState } from 'react';
import { Trello, Loader2, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface TrelloCardValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;          // real Trello card id (24-char hex)
  cardId?: string;              // short id (shortLink) for display
  cardUrl?: string;             // full URL to the card on trello.com
  simulated?: boolean;
}

interface TrelloActionResponse {
  success?: boolean;
  externalId?: string;
  shortId?: string;
  url?: string;
  error?: string;
}

export function TrelloCardCreator({ value, onChange, config, disabled, field }: WidgetProps) {
  // Note: `apiKey` / `listId` from widget config are NOT used to call the Trello
  // API directly from the browser. They are preserved here only as a hint for
  // the "incomplete config" UI badge. The backend reads the actual Trello
  // API key + OAuth token from the IntegrationConnection record
  // (provider='trello', tenantId, status='connected'). The widget never sees
  // the real OAuth token — only the backend does.
  const hasLocalConfigHint = Boolean(config.apiKey) || Boolean(config.listId);
  const ariaLabel = str(field?.label, 'Trello card');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const existing = (value as Partial<TrelloCardValue> | undefined) ?? {};
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = async () => {
    if (disabled) return;
    if (!name.trim()) {
      setError('Card name is required.');
      return;
    }
    setPending(true);
    setError(null);
    setNeedsConnect(false);

    const body: Record<string, unknown> = {
      action: 'create_card',
      name: name.trim(),
    };
    if (desc.trim()) body.description = desc.trim();
    // Pass through the widget-config listId as an override; backend falls
    // back to configJson.defaultListId on the IntegrationConnection.
    const widgetListId = str(config.listId, '');
    if (widgetListId) body.listId = widgetListId;
    const widgetLabels = str(config.labels, '');
    if (widgetLabels) body.labels = widgetLabels;

    try {
      const res = await fetch('/api/integrations/trello/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as TrelloActionResponse;

      if (res.status === 503) {
        setNeedsConnect(true);
        setError(data.error || 'No Trello account connected.');
        setPending(false);
        return;
      }
      if (!res.ok || !data.success || !data.externalId) {
        setError(data.error || `Trello card creation failed (HTTP ${res.status})`);
        setPending(false);
        return;
      }

      // ── Success: real externalId (card id) returned from Trello ────────
      const next: TrelloCardValue = {
        integrated: true,
        timestamp: new Date().toISOString(),
        externalId: data.externalId,
        cardId: data.shortId || data.externalId,
        cardUrl: data.url,
      };
      onChange(next);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error reaching Trello');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Trello className="size-3.5 text-[#0079bf]" />
        <span className="text-xs font-semibold">Trello Card</span>
        {!hasLocalConfigHint && <span className="ml-auto text-[10px] text-amber-600">incomplete config</span>}
      </div>

      {needsConnect && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
            <p className="font-semibold">Connect your Trello account</p>
            <p>No Trello workspace is connected for this tenant. Link a Trello account in <span className="font-mono">Dashboard &gt; Integrations</span> to create cards automatically.</p>
          </div>
        </div>
      )}

      {existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Card created. URL: <span className="font-mono">{existing.cardUrl}</span>
            </span>
          </div>
          {existing.cardUrl && (
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 w-fit h-7">
              <a href={existing.cardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" /> Open card
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input placeholder="Card name *" value={name} disabled={disabled || pending}
            onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
          <Textarea placeholder="Description (optional)" value={desc} disabled={disabled || pending}
            onChange={(e) => setDesc(e.target.value)} className="text-xs min-h-[60px]" />
          {error && !needsConnect && (
            <p className="text-[11px] text-red-500 flex items-center gap-1">
              <AlertCircle className="size-3" /> {error}
            </p>
          )}
          <Button type="button" disabled={disabled || pending} onClick={handleCreate}
            className="w-full h-9 bg-[#0079bf] hover:bg-[#0265a0] text-white text-xs gap-1.5">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trello className="size-3.5" />} Create Card
          </Button>
        </div>
      )}
    </div>
  );
}

export default TrelloCardCreator;

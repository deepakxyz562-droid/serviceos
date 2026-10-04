'use client';

import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface MailchimpSubscribeValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  email?: string;
  listId?: string;
}

export function MailchimpSubscribe({ value, onChange, config, disabled, field }: WidgetProps) {
  const listId = str(config.listId, '');
  const ariaLabel = str(field?.label, 'Mailchimp subscribe');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const existing = (value as Partial<MailchimpSubscribeValue> | undefined) ?? {};

  const handleSubscribe = async () => {
    if (disabled) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setPending(true);
    setError(null);
    setNotConnected(false);

    try {
      const resp = await fetch('/api/integrations/mailchimp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          email,
          listId: listId || undefined,
        }),
      });

      if (resp.status === 503) {
        setNotConnected(true);
        setPending(false);
        return;
      }

      const data = (await resp.json().catch(() => ({}))) as {
        externalId?: string;
        status?: string;
        listId?: string;
        error?: string;
      };

      if (!resp.ok || !data.externalId) {
        setError(data.error || `Failed to subscribe (${resp.status}).`);
        setPending(false);
        return;
      }

      const next: MailchimpSubscribeValue = {
        integrated: true,
        timestamp: new Date().toISOString(),
        externalId: data.externalId,
        email,
        listId: data.listId || listId || 'default',
      };
      onChange(next);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error subscribing via Mailchimp.');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Mail className="size-3.5 text-[#ffe01b]" />
        <span className="text-xs font-semibold">Mailchimp</span>
        {listId && <span className="ml-auto text-[10px] text-muted-foreground font-mono">{listId.slice(0, 8)}…</span>}
      </div>
      {existing.integrated ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Subscribed to list.</span>
        </div>
      ) : notConnected ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 flex items-center gap-2">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            Connect your Mailchimp account in <strong>Dashboard &gt; Integrations</strong> to capture subscribers.
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <Input type="email" placeholder="you@example.com" value={email} disabled={disabled || pending}
              onChange={(e) => setEmail(e.target.value)} className="h-9 text-xs" aria-label="Email address" />
            <Button type="button" disabled={disabled || pending} onClick={handleSubscribe}
              className="h-9 bg-[#ffe01b] hover:bg-[#e6c818] text-black text-xs gap-1 shrink-0">
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />} Subscribe
            </Button>
          </div>
          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
          <p className="text-[10px] text-muted-foreground">You&apos;ll receive a confirmation email from Mailchimp.</p>
        </div>
      )}
    </div>
  );
}

export default MailchimpSubscribe;

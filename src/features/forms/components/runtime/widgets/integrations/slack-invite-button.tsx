'use client';

import React, { useMemo, useState } from 'react';
import { Slack, ExternalLink, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface SlackInviteValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;          // real Slack user id (invited) OR message ts (messaged fallback)
  action?: 'invited' | 'messaged';
  channel?: string;
  workspace?: string;
  simulated?: boolean;
}

interface SlackActionResponse {
  success?: boolean;
  externalId?: string;
  action?: 'invited' | 'messaged';
  channel?: string;
  error?: string;
}

export function SlackInviteButton({ value, onChange, config, disabled, field, allFormData }: WidgetProps) {
  const inviteUrl = str(config.inviteUrl, '');
  const workspace = str(config.workspace, 'our team');
  const configuredChannel = str(config.channelId ?? config.channel, '');
  const configuredEmail = str(config.email, '');
  const inviteMessage = str(config.message, '');
  const ariaLabel = str(field?.label, 'Slack invite');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const existing = (value as Partial<SlackInviteValue> | undefined) ?? {};
  const [joined, setJoined] = useState(Boolean(existing.integrated));

  // Resolve an email from form data — the form may have captured the
  // submitter's email in a sibling field. Look at `allFormData.email` and
  // a few common aliases.
  const resolvedEmail = useMemo(() => {
    if (configuredEmail) return configuredEmail;
    if (allFormData && typeof allFormData === 'object') {
      const candidates = ['email', 'Email', 'emailAddress', 'contactEmail', 'userEmail'];
      for (const key of candidates) {
        const v = (allFormData as Record<string, unknown>)[key];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
    }
    return '';
  }, [configuredEmail, allFormData]);

  const handleJoin = async () => {
    if (disabled) return;
    setPending(true);
    setError(null);
    setNeedsConnect(false);

    const action: 'invite' | 'post_message' = resolvedEmail ? 'invite' : 'post_message';
    const body: Record<string, unknown> = { action };
    if (action === 'invite' && resolvedEmail) body.email = resolvedEmail;
    if (configuredChannel) body.channel = configuredChannel;
    if (action === 'post_message' || !inviteMessage) {
      body.message =
        inviteMessage ||
        `📬 New form submission${resolvedEmail ? ` from ${resolvedEmail}` : ''} — please share the Slack invite link manually.`;
    }

    try {
      const res = await fetch('/api/integrations/slack/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as SlackActionResponse;

      if (res.status === 503 || !res.ok) {
        // 503 = no Slack account connected (the explicit "connect" case)
        if (res.status === 503) setNeedsConnect(true);
        setError(data.error || `Slack action failed (HTTP ${res.status})`);
        setPending(false);
        return;
      }

      // ── Success: real externalId returned from Slack ───────────────────
      const next: SlackInviteValue = {
        integrated: true,
        timestamp: new Date().toISOString(),
        externalId: data.externalId,             // real Slack user id OR message ts
        action: data.action,
        channel: data.channel,
        workspace,
      };
      onChange(next);
      setPending(false);
      setJoined(true);

      // Per the brief: still open the inviteUrl in a new tab if provided
      // (the workspace's self-serve invite link is still useful as a fallback
      // and as a visual confirmation for the submitter).
      if (typeof window !== 'undefined' && inviteUrl) {
        window.open(inviteUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error reaching Slack');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Slack className="size-3.5 text-[#4a154b]" />
        <span className="text-xs font-semibold">Join {workspace} on Slack</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Click below to accept your Slack workspace invite.
      </p>

      {needsConnect && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-2.5 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
            <p className="font-semibold">Connect your Slack account</p>
            <p>No Slack workspace is connected for this tenant. Link a Slack workspace in <span className="font-mono">Dashboard &gt; Integrations</span> to enable real invites.</p>
          </div>
        </div>
      )}

      {error && !needsConnect && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}

      {joined && existing.externalId ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
            {existing.action === 'invited'
              ? 'Invited to channel. Check Slack.'
              : 'Invite posted to channel.'}
            {existing.externalId && (
              <span className="font-mono ml-1 opacity-70">[{existing.externalId}]</span>
            )}
          </span>
        </div>
      ) : (
        <Button type="button" disabled={disabled || pending} onClick={handleJoin}
          className="w-full h-9 bg-[#4a154b] hover:bg-[#3a113b] text-white text-xs gap-1.5">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Slack className="size-3.5" />} Accept Slack Invite
        </Button>
      )}

      {!inviteUrl && (
        <p className="text-[10px] text-amber-600">No invite URL configured.</p>
      )}
      {inviteUrl && (
        <Button asChild variant="outline" size="sm" className="text-xs gap-1.5 w-fit">
          <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" /> Open invite
          </a>
        </Button>
      )}
    </div>
  );
}

export default SlackInviteButton;

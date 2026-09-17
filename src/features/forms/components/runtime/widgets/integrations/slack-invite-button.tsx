'use client';

import React, { useState } from 'react';
import { Slack, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface SlackInviteValue {
  integrated: boolean;
  timestamp?: string;
  externalId?: string;
  workspace?: string;
}

export function SlackInviteButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const inviteUrl = str(config.inviteUrl, '');
  const workspace = str(config.workspace, 'our team');
  const ariaLabel = str(field?.label, 'Slack invite');
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState((value as SlackInviteValue | undefined)?.integrated === true);

  const handleJoin = () => {
    if (disabled || !inviteUrl) return;
    setPending(true);
    setTimeout(() => {
      const next: SlackInviteValue = {
        integrated: true, timestamp: new Date().toISOString(),
        externalId: `slack_${Math.random().toString(36).slice(2, 10)}`, workspace,
      };
      onChange(next);
      setPending(false);
      setJoined(true);
      if (typeof window !== 'undefined') window.open(inviteUrl, '_blank', 'noopener,noreferrer');
    }, 500);
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
      {joined ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Invite accepted. Check Slack.</span>
        </div>
      ) : (
        <Button type="button" disabled={disabled || pending || !inviteUrl} onClick={handleJoin}
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

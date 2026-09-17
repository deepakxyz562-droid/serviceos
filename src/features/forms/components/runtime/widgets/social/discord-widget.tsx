'use client';

import React, { useEffect } from 'react';
import { MessageSquare, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface DiscordWidgetValue {
  serverId: string;
  embedUrl: string;
  provider: 'discord';
}

export function DiscordWidget({ value, onChange, config, disabled, field }: WidgetProps) {
  const serverId = String(config?.serverId ?? (value as DiscordWidgetValue | undefined)?.serverId ?? '');
  const theme = String(config?.theme ?? 'dark');
  const height = Number(config?.height ?? 400);
  const showOnline = Boolean(config?.showOnlineCount ?? true);
  const ariaLabel = String(field?.label ?? 'Discord widget');

  const embedUrl = serverId
    ? `https://discord.com/widget?id=${serverId}&theme=${theme}${!showOnline ? '&show_only_online=false' : ''}`
    : '';

  useEffect(() => {
    if (serverId && !disabled) {
      onChange({ serverId, embedUrl, provider: 'discord' } as DiscordWidgetValue);
    }
     
  }, [serverId, theme, showOnline]);

  if (!serverId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <MessageSquare className="size-6 mx-auto text-[#5865F2]" />
        <p className="text-xs mt-2 font-semibold">No Discord server ID configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.serverId</code> (enable Server Widget in Discord settings).</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <div className="inline-flex size-6 items-center justify-center rounded bg-[#5865F2]">
          <MessageSquare className="size-3.5 text-white" />
        </div>
        <p className="text-xs font-semibold">Discord Server · <span className="font-mono text-[10px] text-muted-foreground">{serverId}</span></p>
      </div>
      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <iframe
          src={embedUrl}
          title={`Discord widget ${serverId}`}
          className="w-full h-full"
          allow="clipboard-read; clipboard-write"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <Users className="size-3" /> Online members shown live
        </span>
        <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1">
          <a href={`https://discord.com/channels/${serverId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3" /> Join server
          </a>
        </Button>
      </div>
    </div>
  );
}

export default DiscordWidget;

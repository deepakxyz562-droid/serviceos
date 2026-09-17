'use client';

import React, { useEffect, useState } from 'react';
import { Send, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface TelegramJoinValue {
  channel: string;
  joinUrl: string;
  joined: boolean;
  timestamp?: string;
}

export function TelegramJoinButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialChannel = String(config?.channel ?? (value as TelegramJoinValue | undefined)?.channel ?? '');
  const [channel, setChannel] = useState(initialChannel.replace(/^@/, ''));
  const [joined, setJoined] = useState(Boolean((value as TelegramJoinValue | undefined)?.joined));
  const buttonStyle = String(config?.buttonStyle ?? 'large');
  const ariaLabel = String(field?.label ?? 'Telegram join');

  const joinUrl = channel ? `https://t.me/${channel}` : '';

  useEffect(() => {
    if (channel && !disabled) {
      onChange({ channel, joinUrl, joined } as TelegramJoinValue);
    }
     
  }, [channel, joined]);

  const handleJoin = () => {
    if (disabled || !joinUrl) return;
    setJoined(true);
    onChange({ channel, joinUrl, joined: true, timestamp: new Date().toISOString() } as TelegramJoinValue);
    if (typeof window !== 'undefined') {
      window.open(joinUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!channel) {
    return (
      <div className="space-y-2" aria-label={ariaLabel}>
        <Input
          type="text"
          value={channel}
          placeholder="channelname (without @)"
          disabled={disabled}
          onChange={(e) => setChannel(e.target.value.replace(/^@/, ''))}
          aria-label="Telegram channel name"
          className="text-xs"
        />
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
          <Send className="size-5 mx-auto text-[#0088cc]" />
          <p className="text-xs mt-2 font-semibold">Enter a Telegram channel name</p>
          <p className="text-[11px] text-muted-foreground">User will get a t.me/&lt;channel&gt; link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
        <div className="inline-flex size-7 items-center justify-center rounded-full bg-[#0088cc]">
          <Send className="size-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">@{channel}</p>
          <p className="text-[10px] text-muted-foreground truncate">{joinUrl}</p>
        </div>
        <Button
          type="button"
          disabled={disabled}
          onClick={handleJoin}
          variant={joined ? 'outline' : 'default'}
          size={buttonStyle === 'large' ? 'default' : 'sm'}
          className={`text-xs gap-1.5 ${!joined ? 'bg-[#0088cc] hover:bg-[#0077b3] text-white' : ''}`}
        >
          {joined ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
          {joined ? 'Joined' : 'Join Channel'}
        </Button>
      </div>
      <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1 w-full">
        <a href={joinUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3" /> Open in Telegram
        </a>
      </Button>
    </div>
  );
}

export default TelegramJoinButton;

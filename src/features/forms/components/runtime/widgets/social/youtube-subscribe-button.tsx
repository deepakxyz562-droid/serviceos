'use client';

import React, { useEffect, useState } from 'react';
import { Youtube, Bell, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface SubscribeValue {
  channelId: string;
  channelName: string;
  subscribed: boolean;
  timestamp?: string;
}

export function YoutubeSubscribeButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const channelName = String(config?.channelName ?? '');
  const channelId = String(config?.channelId ?? '');
  const layout = String(config?.layout ?? 'full');
  const theme = String(config?.theme ?? 'default');
  const ariaLabel = String(field?.label ?? 'YouTube subscribe');
  const current = value as SubscribeValue | undefined;
  const [subscribed, setSubscribed] = useState(Boolean(current?.subscribed));

  useEffect(() => {
    if (!disabled && (channelName || channelId)) {
      onChange({
        channelId, channelName, subscribed,
      } as SubscribeValue);
    }
     
  }, [channelName, channelId, subscribed]);

  const subscribeUrl = channelName
    ? `https://www.youtube.com/@${channelName}?sub_confirmation=1`
    : channelId
      ? `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`
      : '';

  const handleClick = () => {
    if (disabled) return;
    setSubscribed(true);
    onChange({ channelId, channelName, subscribed: true, timestamp: new Date().toISOString() } as SubscribeValue);
    if (typeof window !== 'undefined' && subscribeUrl) {
      window.open(subscribeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!channelName && !channelId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <Youtube className="size-6 mx-auto text-[#FF0000]" />
        <p className="text-xs mt-2 font-semibold">No YouTube channel configured</p>
        <p className="text-[11px] text-muted-foreground">Set <code>config.channelName</code> or <code>config.channelId</code>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
        <Youtube className="size-5 text-[#FF0000]" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{channelName ? `@${channelName}` : channelId}</p>
          <p className="text-[10px] text-muted-foreground">YouTube channel</p>
        </div>
        <Button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          variant={subscribed ? 'outline' : 'default'}
          size="sm"
          className={`text-xs gap-1.5 ${!subscribed ? 'bg-[#FF0000] hover:bg-[#E60000] text-white' : ''}`}
          data-layout={layout}
          data-theme={theme}
        >
          {subscribed ? <Check className="size-3.5" /> : <Bell className="size-3.5" />}
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ExternalLink className="size-3" />
        {subscribeUrl ? 'Opens YouTube with subscription confirmation' : 'Set channel to enable subscription'}
      </p>
    </div>
  );
}

export default YoutubeSubscribeButton;

'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

interface PixelValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  pixelId?: string;
}

/**
 * Facebook Pixel event tracker.
 *
 * Phase 3: passive — does NOT inject the real fbq script. Surfaces the
 * configured Pixel ID and an "armed" badge. On form submit the consumer
 * should set `fired: true`.
 */
export function FacebookPixelWidget({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Facebook Pixel tracker');
  const pixelId = str(config.pixelId, '000000000000000');
  const eventName = str(config.eventName, 'Lead');
  const debug = bool(config.debug, false);

  const [v, setV] = useState<PixelValue>(
    value && typeof value === 'object' ? (value as PixelValue) : { eventId: '', fired: false },
  );

  useEffect(() => {
    if (v.pixelId === pixelId) return;
    setV((prev) => ({ ...prev, pixelId }));
  }, [pixelId, v.pixelId]);

  useEffect(() => {
    onChange({ eventId: `fb_${eventName}`, fired: v.fired, timestamp: v.timestamp, pixelId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.fired, v.timestamp]);

  const fire = () => {
    setV({
      eventId: `fb_${eventName}`,
      fired: true,
      timestamp: new Date().toISOString(),
      pixelId,
    });
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Megaphone className="size-4 text-blue-600" />
        <span className="text-xs font-semibold text-foreground">Facebook Pixel</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <CheckCircle2 className="size-2.5 text-emerald-600" /> Fired
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Armed</Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-1 text-[10px]">
        <dt className="text-muted-foreground">Pixel ID</dt>
        <dd className="font-mono text-foreground truncate">{pixelId}</dd>
        <dt className="text-muted-foreground">Event name</dt>
        <dd className="font-mono text-foreground truncate">{eventName}</dd>
        {v.timestamp && (
          <>
            <dt className="text-muted-foreground">Last fired</dt>
            <dd className="font-mono text-foreground truncate">{v.timestamp}</dd>
          </>
        )}
      </dl>
      {debug ? (
        <button
          type="button"
          onClick={fire}
          className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-medium rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-muted/70"
        >
          <Send className="size-3" /> Simulate submit
        </button>
      ) : (
        <p className="text-[9px] text-muted-foreground italic">Passive tracker — fires on form submit.</p>
      )}
    </div>
  );
}

export default FacebookPixelWidget;

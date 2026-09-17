'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

interface MixpanelValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  token?: string;
}

/**
 * Mixpanel event tracker — passive placeholder.
 * Does NOT load the real mixpanel snippet in Phase 3.
 */
export function MixpanelEventWidget({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Mixpanel event tracker');
  const token = str(config.token, '••••••••••••••••••••••••');
  const eventName = str(config.eventName, 'form_submit');
  const debug = bool(config.debug, false);

  const [v, setV] = useState<MixpanelValue>(
    value && typeof value === 'object' ? (value as MixpanelValue) : { eventId: '', fired: false },
  );

  useEffect(() => {
    if (v.token === token) return;
    setV((prev) => ({ ...prev, token }));
  }, [token, v.token]);

  useEffect(() => {
    onChange({ eventId: `mp_${eventName}`, fired: v.fired, timestamp: v.timestamp, token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.fired, v.timestamp]);

  const fire = () => {
    setV({
      eventId: `mp_${eventName}`,
      fired: true,
      timestamp: new Date().toISOString(),
      token,
    });
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-purple-600" />
        <span className="text-xs font-semibold text-foreground">Mixpanel Event</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <CheckCircle2 className="size-2.5 text-emerald-600" /> Fired
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Armed</Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-1 text-[10px]">
        <dt className="text-muted-foreground">Project token</dt>
        <dd className="font-mono text-foreground truncate">{token}</dd>
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

export default MixpanelEventWidget;

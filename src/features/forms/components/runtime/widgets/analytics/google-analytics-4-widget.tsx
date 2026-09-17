'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

interface GA4Value {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  measurementId?: string;
}

/**
 * Google Analytics 4 event tracker.
 *
 * Phase 3: passive widget — does NOT inject the real gtag.js script.
 * Surfaces the configured Measurement ID + an "armed" badge so the
 * runtime can verify wiring without making a network call. On form
 * submit the consumer should call `onChange({fired:true, ...})`.
 */
export function GoogleAnalytics4Widget({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Google Analytics 4 tracker');
  const measurementId = str(config.measurementId, 'G-XXXXXXXXXX');
  const eventName = str(config.eventName, 'form_submit');
  const debug = bool(config.debug, false);

  const [v, setV] = useState<GA4Value>(
    value && typeof value === 'object' ? (value as GA4Value) : { eventId: '', fired: false },
  );

  useEffect(() => {
    if (v.measurementId === measurementId) return;
    setV((prev) => ({ ...prev, measurementId }));
  }, [measurementId, v.measurementId]);

  useEffect(() => {
    onChange({ eventId: `ga4_${eventName}`, fired: v.fired, timestamp: v.timestamp, measurementId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.fired, v.timestamp]);

  const fire = () => {
    setV({
      eventId: `ga4_${eventName}`,
      fired: true,
      timestamp: new Date().toISOString(),
      measurementId,
    });
  };

  return (
    <div
      className="rounded-lg border border-border/70 bg-card p-3 space-y-2"
      aria-label={ariaLabel}
      role="group"
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-orange-500" />
        <span className="text-xs font-semibold text-foreground">Google Analytics 4</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <CheckCircle2 className="size-2.5 text-emerald-600" /> Fired
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Armed</Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-1 text-[10px]">
        <dt className="text-muted-foreground">Measurement ID</dt>
        <dd className="font-mono text-foreground truncate">{measurementId}</dd>
        <dt className="text-muted-foreground">Event name</dt>
        <dd className="font-mono text-foreground truncate">{eventName}</dd>
        {v.timestamp && (
          <>
            <dt className="text-muted-foreground">Last fired</dt>
            <dd className="font-mono text-foreground truncate">{v.timestamp}</dd>
          </>
        )}
      </dl>
      {debug && (
        <button
          type="button"
          onClick={fire}
          className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-medium rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-muted/70"
        >
          <Send className="size-3" /> Simulate submit
        </button>
      )}
      {!debug && (
        <p className="text-[9px] text-muted-foreground italic">
          Passive tracker — fires on form submit.
        </p>
      )}
    </div>
  );
}

export default GoogleAnalytics4Widget;

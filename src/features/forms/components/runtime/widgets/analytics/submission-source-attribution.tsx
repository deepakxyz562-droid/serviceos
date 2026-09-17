'use client';

import React, { useEffect, useState } from 'react';
import { Navigation, Globe, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

interface AttributionValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  referrer?: string;
  utm: Record<string, string>;
  landingPage?: string;
  firstTouch?: string;
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * Hidden field tracking submission source — referrer + UTM params.
 *
 * Reads `document.referrer` and parses UTM params from the landing URL.
 * Emits a structured object. Invisible by default (config.visible=false).
 */
export function SubmissionSourceAttribution({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Submission source attribution');
  const visible = bool(config.visible, false);

  const [v, setV] = useState<AttributionValue>(
    value && typeof value === 'object' ? (value as AttributionValue) : { eventId: 'attribution', fired: false, utm: {} },
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const val = params.get(k);
      if (val) utm[k] = val;
    }
    const referrer = document.referrer || '(direct)';
    const landingPage = window.location.pathname + window.location.search;
    const next: AttributionValue = {
      eventId: 'attribution',
      fired: true,
      timestamp: v.timestamp ?? new Date().toISOString(),
      referrer,
      utm,
      landingPage,
      firstTouch: v.firstTouch ?? new Date().toISOString(),
    };
    setV(next);
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) {
    // Hidden — still expose value but render no UI footprint.
    return (
      <div aria-label={ariaLabel} aria-hidden="true" className="hidden" data-event-id={v.eventId} data-fired={v.fired} />
    );
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Navigation className="size-4 text-violet-600" />
        <span className="text-xs font-semibold text-foreground">Source Attribution</span>
        <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
          <Eye className="size-2.5" /> Captured
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[10px]">
        <dt className="text-muted-foreground flex items-center gap-1">
          <Globe className="size-2.5" /> Referrer
        </dt>
        <dd className="font-mono text-foreground truncate">{v.referrer ?? '—'}</dd>
        <dt className="text-muted-foreground">Landing</dt>
        <dd className="font-mono text-foreground truncate">{v.landingPage ?? '—'}</dd>
        {UTM_KEYS.filter((k) => v.utm?.[k]).map((k) => (
          <React.Fragment key={k}>
            <dt className="text-muted-foreground">{k.replace('utm_', '')}</dt>
            <dd className="font-mono text-foreground truncate">{v.utm[k]}</dd>
          </React.Fragment>
        ))}
        {v.timestamp && (
          <>
            <dt className="text-muted-foreground">Captured at</dt>
            <dd className="font-mono text-foreground truncate">{v.timestamp}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export default SubmissionSourceAttribution;

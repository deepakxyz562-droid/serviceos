'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, Eye, Link2, BadgeCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
type UTMKey = typeof UTM_KEYS[number];

interface UTMValue {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referrer?: string;
  landingUrl?: string;
  capturedAt: string;
}

function parseUTMs(search: string): Partial<UTMValue> {
  if (typeof URLSearchParams === 'undefined' || !search) return {};
  const params = new URLSearchParams(search);
  const out: Partial<UTMValue> = {};
  if (params.get('utm_source')) out.source = params.get('utm_source')!;
  if (params.get('utm_medium')) out.medium = params.get('utm_medium')!;
  if (params.get('utm_campaign')) out.campaign = params.get('utm_campaign')!;
  if (params.get('utm_term')) out.term = params.get('utm_term')!;
  if (params.get('utm_content')) out.content = params.get('utm_content')!;
  return out;
}

export function UtmCapture({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'UTM capture');
  const allowManualOverride = bool(config.allowManualOverride, false);
  const captureReferrer = bool(config.captureReferrer, true);
  const existing: UTMValue | undefined = value && typeof value === 'object' ? (value as UTMValue) : undefined;
  const firedRef = useRef(false);

  // Capture once on mount (Phase 3 — no real persistence, just from window.location).
  const captured = useMemo<UTMValue>(() => {
    if (typeof window === 'undefined') {
      return existing ?? { source: '', medium: '', campaign: '', term: '', content: '', capturedAt: new Date().toISOString() };
    }
    const utms = parseUTMs(window.location.search);
    return {
      source: utms.source ?? existing?.source ?? '',
      medium: utms.medium ?? existing?.medium ?? '',
      campaign: utms.campaign ?? existing?.campaign ?? '',
      term: utms.term ?? existing?.term ?? '',
      content: utms.content ?? existing?.content ?? '',
      referrer: captureReferrer ? document.referrer || undefined : existing?.referrer,
      landingUrl: window.location.href,
      capturedAt: new Date().toISOString(),
    };
  }, [existing, captureReferrer]);

  const [manual, setManual] = useState<UTMValue>(captured);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onChange(captured);
  }, [captured, onChange]);

  const handleManual = (k: UTMKey, v: string) => {
    if (disabled || !allowManualOverride) return;
    const next = { ...manual, [k]: v };
    setManual(next);
    onChange(next);
  };

  const display = allowManualOverride ? manual : captured;
  const hasAnyUTM = !!(display.source || display.medium || display.campaign);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Megaphone className="size-4 text-purple-600" />
        <span className="text-xs font-bold">UTM Capture</span>
        {hasAnyUTM ? (
          <Badge variant="outline" className="ml-auto text-[9px] gap-1 text-emerald-700 border-emerald-300">
            <BadgeCheck /> Captured
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Direct visit</Badge>
        )}
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1 text-[11px]">
        {UTM_KEYS.map((k) => (
          <div key={k} className="grid grid-cols-[100px_1fr] gap-2 items-center">
            <label className="text-[10px] text-muted-foreground font-mono truncate">{k}</label>
            {allowManualOverride ? (
              <Input
                value={(display as Record<string, string>)[k === 'utm_source' ? 'source' : k === 'utm_medium' ? 'medium' : k === 'utm_campaign' ? 'campaign' : k === 'utm_term' ? 'term' : 'content']}
                onChange={(e) => handleManual(k, e.target.value)}
                disabled={disabled}
                className="h-7 text-[11px] font-mono"
                aria-label={k}
              />
            ) : (
              <span className="font-mono truncate text-foreground">{(display as Record<string, string>)[k === 'utm_source' ? 'source' : k === 'utm_medium' ? 'medium' : k === 'utm_campaign' ? 'campaign' : k === 'utm_term' ? 'term' : 'content'] || <em className="text-muted-foreground/60">—</em>}</span>
            )}
          </div>
        ))}
        {captureReferrer && display.referrer && (
          <div className="grid grid-cols-[100px_1fr] gap-2 items-center pt-1 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground font-mono">referrer</span>
            <span className="font-mono truncate flex items-center gap-1"><Link2 className="size-2.5" /> {display.referrer}</span>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Eye className="size-3" /> Hidden field — values stored as <code>{JSON.stringify({ source: display.source, medium: display.medium, campaign: display.campaign })}</code>
      </p>
    </div>
  );
}

export default UtmCapture;

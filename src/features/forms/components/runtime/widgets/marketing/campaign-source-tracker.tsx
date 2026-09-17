'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Megaphone, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';

interface TrackerValue {
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
  landingUrl: string;
  userAgent?: string;
  language?: string;
  sessionId?: string;
  capturedAt: string;
}

const SESSION_KEY = 'cst_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `sess_${Math.random().toString(36).slice(2, 14)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return '';
  }
}

function deriveSource(): { source: string; medium: string; referrer: string } {
  if (typeof document === 'undefined') return { source: '', medium: '', referrer: '' };
  const ref = document.referrer || '';
  const utmSource = new URLSearchParams(window.location.search).get('utm_source');
  const utmMedium = new URLSearchParams(window.location.search).get('utm_medium');
  let source = utmSource || '';
  let medium = utmMedium || '';
  if (!source && ref) {
    try {
      const host = new URL(ref).hostname.replace(/^www\./, '');
      source = host;
      if (host.includes('google') || host.includes('bing') || host.includes('duckduckgo')) medium = medium || 'organic';
      else if (host.includes('facebook') || host.includes('twitter') || host.includes('linkedin') || host.includes('instagram')) medium = medium || 'social';
      else medium = medium || 'referral';
    } catch { source = ref; }
  }
  if (!source && !ref) { source = 'direct'; medium = medium || 'none'; }
  return { source, medium, referrer: ref };
}

export function CampaignSourceTracker({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Campaign source tracker');
  const captureUserAgent = bool(config.captureUserAgent, true);
  const captureLanguage = bool(config.captureLanguage, true);
  const existing: TrackerValue | undefined = value && typeof value === 'object' ? (value as TrackerValue) : undefined;
  const firedRef = useRef(false);

  const data = useMemo<TrackerValue>(() => {
    if (typeof window === 'undefined') {
      return existing ?? { source: '', medium: '', campaign: '', referrer: '', landingUrl: '', capturedAt: new Date().toISOString() };
    }
    const params = new URLSearchParams(window.location.search);
    const { source, medium, referrer } = deriveSource();
    return {
      source,
      medium,
      campaign: params.get('utm_campaign') ?? existing?.campaign ?? '',
      referrer,
      landingUrl: window.location.href,
      userAgent: captureUserAgent ? navigator.userAgent.slice(0, 120) : undefined,
      language: captureLanguage ? navigator.language : undefined,
      sessionId: getSessionId(),
      capturedAt: new Date().toISOString(),
    };
  }, [existing, captureUserAgent, captureLanguage]);

  useEffect(() => {
    if (firedRef.current || disabled) return;
    firedRef.current = true;
    onChange(data);
  }, [data]);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Megaphone className="size-4 text-purple-600" />
        <span className="text-xs font-bold">Campaign Tracker</span>
        <Badge variant="outline" className="ml-auto text-[9px] gap-1">
          <Eye className="size-2.5" /> Hidden
        </Badge>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1 text-[11px]">
        <Row label="source" value={data.source} />
        <Row label="medium" value={data.medium} />
        <Row label="campaign" value={data.campaign} />
        <Row label="referrer" value={data.referrer} />
        <Row label="landing_url" value={data.landingUrl} />
        {data.sessionId && <Row label="session_id" value={data.sessionId} />}
        {data.language && <Row label="language" value={data.language} />}
        {data.userAgent && <Row label="user_agent" value={data.userAgent.slice(0, 60) + '…'} />}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Auto-captured on page load · {data.capturedAt && new Date(data.capturedAt).toLocaleString()}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
      <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
      <span className="font-mono truncate text-foreground">{value || <em className="text-muted-foreground/60">—</em>}</span>
    </div>
  );
}

export default CampaignSourceTracker;

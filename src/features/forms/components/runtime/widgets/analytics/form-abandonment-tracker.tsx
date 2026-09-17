'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Timer, Eye, MousePointerClick, LogOut, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';

interface AbandonmentValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  timeSpentSec: number;
  fieldsFilled: number;
  lastFieldKey?: string;
}

/**
 * Tracks time spent + fields filled before abandonment.
 *
 * In Phase 3 this is purely a client-side tracker: starts a timer on mount,
 * counts filled fields via `allFormData`, and marks the abandonment event
 * when the user leaves the page (beforeunload). On submit, the consumer
 * sets `fired: true` with timestamp.
 */
export function FormAbandonmentTracker({ value, onChange, config, field, allFormData }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Form abandonment tracker');
  const sampleRate = Math.min(100, Math.max(0, Number(config.sampleRate ?? 100)));
  const [start] = useState(() => Date.now());
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);

  const fieldsFilled = useMemo(() => {
    if (!allFormData) return 0;
    return Object.values(allFormData).filter((v) => {
      if (v == null || v === '') return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length > 0;
      return true;
    }).length;
  }, [allFormData]);

  const v: AbandonmentValue =
    value && typeof value === 'object'
      ? (value as AbandonmentValue)
      : { eventId: 'abandonment', fired: false, timeSpentSec: 0, fieldsFilled: 0 };

  // Tick every second to update timeSpent.
  useEffect(() => {
    const id = setInterval(() => {
      onChange({
        ...v,
        eventId: 'abandonment',
        fired: v.fired,
        timestamp: v.timestamp,
        timeSpentSec: Math.floor((Date.now() - start) / 1000),
        fieldsFilled,
        lastFieldKey: lastKey,
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsFilled, lastKey, start]);

  // Try to detect abandonment via visibilitychange to hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      onChange({
        eventId: 'abandonment',
        fired: true,
        timestamp: new Date().toISOString(),
        timeSpentSec: Math.floor((Date.now() - start) / 1000),
        fieldsFilled,
        lastFieldKey: lastKey,
      });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsFilled, lastKey, start]);

  // Track the most-recently filled field key.
  useEffect(() => {
    if (!allFormData) return;
    const keys = Object.keys(allFormData);
    if (keys.length === 0) return;
    const latest = keys[keys.length - 1];
    if (latest !== lastKey) setLastKey(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFormData]);

  const mins = Math.floor(v.timeSpentSec / 60);
  const secs = v.timeSpentSec % 60;

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Timer className="size-4 text-amber-600" />
        <span className="text-xs font-semibold text-foreground">Abandonment Tracker</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <LogOut className="size-2.5" /> Abandoned
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Live</Badge>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded-md bg-muted/40 p-1.5 text-center">
          <Timer className="size-3 mx-auto text-muted-foreground" />
          <p className="font-mono text-foreground mt-0.5">
            {mins}:{String(secs).padStart(2, '0')}
          </p>
          <p className="text-muted-foreground text-[9px]">Time</p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5 text-center">
          <CheckCircle2 className="size-3 mx-auto text-muted-foreground" />
          <p className="font-mono text-foreground mt-0.5">{v.fieldsFilled}</p>
          <p className="text-muted-foreground text-[9px]">Filled</p>
        </div>
        <div className="rounded-md bg-muted/40 p-1.5 text-center">
          <MousePointerClick className="size-3 mx-auto text-muted-foreground" />
          <p className="font-mono text-foreground mt-0.5 truncate">{v.lastFieldKey ?? '—'}</p>
          <p className="text-muted-foreground text-[9px]">Last field</p>
        </div>
      </div>
      {sampleRate < 100 && (
        <p className="text-[9px] text-muted-foreground italic">
          Sampling at {sampleRate}% of sessions.
        </p>
      )}
      <p className="text-[9px] text-muted-foreground italic flex items-center gap-1">
        <Eye className="size-2.5" /> Tracks time + filled fields. Abandonment fires on tab-hide.
      </p>
    </div>
  );
}

export default FormAbandonmentTracker;

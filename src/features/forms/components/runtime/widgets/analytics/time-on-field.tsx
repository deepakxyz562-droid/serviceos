'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock, MousePointerClick, Clock3 } from 'lucide-react';
import { WidgetProps, str, num } from '../widget-props';

interface FieldTiming {
  key: string;
  ms: number;
  visits: number;
}

interface TimeOnFieldValue {
  fields: FieldTiming[];
  totalMs: number;
}

/**
 * Read-only display of time spent on each field.
 *
 * Tracks focus/blur timestamps per field key (read from `allFormData`),
 * then displays a compact summary table. Read-only — does not let the
 * user edit; the value is the structured timing object.
 */
export function TimeOnField({ value, onChange, config, field, allFormData }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Time on field');
  const minMs = num(config.minMs, 500); // ignore sub-500ms focus flicker

  const fieldKeys = useMemo(
    () => (allFormData ? Object.keys(allFormData) : []),
    [allFormData],
  );

  const [timings, setTimings] = useState<Record<string, { ms: number; visits: number }>>(
    () => {
      const existing = value && typeof value === 'object' ? (value as TimeOnFieldValue) : null;
      const map: Record<string, { ms: number; visits: number }> = {};
      if (existing?.fields) {
        for (const f of existing.fields) map[f.key] = { ms: f.ms, visits: f.visits };
      }
      return map;
    },
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [focusAt, setFocusAt] = useState<number | null>(null);

  // Listen to focusin/focusout on the form document to detect field activity.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const name = target.getAttribute('name') || target.getAttribute('data-field-key') || target.id;
      if (!name) return;
      setActiveKey(name);
      setFocusAt(Date.now());
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!focusAt || !activeKey) return;
      const delta = Date.now() - focusAt;
      if (delta >= minMs) {
        setTimings((prev) => {
          const cur = prev[activeKey] ?? { ms: 0, visits: 0 };
          return { ...prev, [activeKey]: { ms: cur.ms + delta, visits: cur.visits + 1 } };
        });
      }
      setActiveKey(null);
      setFocusAt(null);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [focusAt, activeKey, minMs]);

  // Sync value out (read-only display, but we emit the structured data).
  useEffect(() => {
    const fields: FieldTiming[] = Object.entries(timings).map(([key, t]) => ({ key, ms: t.ms, visits: t.visits }));
    const totalMs = fields.reduce((sum, f) => sum + f.ms, 0);
    onChange({ fields, totalMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timings]);

  const fmt = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
  };

  const sorted = Object.entries(timings)
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, 8);
  const totalMs = Object.values(timings).reduce((s, t) => s + t.ms, 0);
  const fields = fieldKeys.length;

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <Clock3 className="size-4 text-indigo-600" />
        <span className="text-xs font-semibold text-foreground">Time on field</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {fields} field{fields === 1 ? '' : 's'} · {fmt(totalMs)} total
        </span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">No field timings recorded yet.</p>
      ) : (
        <ul className="space-y-1">
          {sorted.map(([key, t]) => (
            <li key={key} className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-muted-foreground truncate flex items-center gap-1">
                <MousePointerClick className="size-2.5" />
                {key}
                <span className="text-muted-foreground/70">×{t.visits}</span>
              </span>
              <span className="font-mono text-foreground">{fmt(t.ms)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[9px] text-muted-foreground italic flex items-center gap-1">
        <Clock className="size-2.5" /> Read-only — auto-tracked via focus events.
      </p>
    </div>
  );
}

export default TimeOnField;

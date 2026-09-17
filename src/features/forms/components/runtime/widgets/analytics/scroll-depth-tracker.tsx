'use client';

import React, { useEffect, useState } from 'react';
import { ScrollText, TrendingUp, MousePointerClick } from 'lucide-react';
import { WidgetProps, str, num } from '../widget-props';

interface ScrollDepthValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  maxDepth: number; // percentage 0-100
  milestones: number[]; // percentages reached
}

/**
 * Read-only display of how far the user scrolled.
 *
 * Listens to `window.scroll` on the document, computes the scroll
 * percentage relative to the form's root container (falls back to
 * documentElement), records milestones at 25/50/75/100%.
 */
export function ScrollDepthTracker({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Scroll depth tracker');
  const granularity = num(config.granularity, 25); // milestone step
  const enabledMilestones = [25, 50, 75, 100].filter((m) => m % granularity === 0 || granularity === 0);
  const milestones = enabledMilestones.length ? enabledMilestones : [25, 50, 75, 100];

  const [maxDepth, setMaxDepth] = useState<number>(() => {
    const existing = value && typeof value === 'object' ? (value as ScrollDepthValue) : null;
    return existing?.maxDepth ?? 0;
  });
  const [hit, setHit] = useState<number[]>(() => {
    const existing = value && typeof value === 'object' ? (value as ScrollDepthValue) : null;
    return existing?.milestones ?? [];
  });

  useEffect(() => {
    const compute = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - window.innerHeight;
      const pct = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 100;
      if (pct > maxDepth) setMaxDepth(pct);
      const newlyHit = milestones.filter((m) => pct >= m && !hit.includes(m));
      if (newlyHit.length) setHit((prev) => [...prev, ...newlyHit].sort((a, b) => a - b));
    };
    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [maxDepth, hit, milestones]);

  useEffect(() => {
    const allHit = milestones.every((m) => hit.includes(m));
    onChange({
      eventId: 'scroll_depth',
      fired: allHit,
      timestamp: allHit && !value || (hit.length > 0 && !(value as ScrollDepthValue)?.timestamp)
        ? new Date().toISOString()
        : (value as ScrollDepthValue)?.timestamp,
      maxDepth,
      milestones: hit,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDepth, hit]);

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <ScrollText className="size-4 text-sky-600" />
        <span className="text-xs font-semibold text-foreground">Scroll depth</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{maxDepth}% max</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
          style={{ width: `${maxDepth}%` }}
        />
      </div>
      <ul className="grid grid-cols-4 gap-1 text-[9px]">
        {milestones.map((m) => (
          <li
            key={m}
            className={
              'flex flex-col items-center rounded-md py-1 ' +
              (hit.includes(m)
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted/40 text-muted-foreground')
            }
          >
            <span className="font-mono">{m}%</span>
            <span className="text-[8px]">{hit.includes(m) ? '✓' : '—'}</span>
          </li>
        ))}
      </ul>
      <p className="text-[9px] text-muted-foreground italic flex items-center gap-1">
        <TrendingUp className="size-2.5" />
        {hit.length}/{milestones.length} milestones hit.{' '}
        <MousePointerClick className="size-2.5 ml-1" /> Read-only tracker.
      </p>
    </div>
  );
}

export default ScrollDepthTracker;

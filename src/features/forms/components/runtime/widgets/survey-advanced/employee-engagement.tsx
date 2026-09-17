'use client';

import React, { useMemo } from 'react';
import { WidgetProps, str } from '../widget-props';
import { cn } from '@/lib/utils';
import { Briefcase } from 'lucide-react';

interface Dimension {
  id: string;
  label: string;
}

interface EngagementValue {
  [dimensionId: string]: number; // 1-5
}

const DEFAULT_DIMENSIONS: Dimension[] = [
  { id: 'meaning', label: 'My work feels meaningful' },
  { id: 'autonomy', label: 'I have autonomy to do my job' },
  { id: 'growth', label: 'I have opportunities to grow' },
  { id: 'recognition', label: 'My contributions are recognised' },
  { id: 'belonging', label: 'I feel I belong on my team' },
];

const SCALE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

export function EmployeeEngagement({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Employee engagement');
  const dims: Dimension[] = Array.isArray(config.dimensions) && config.dimensions.length
    ? (config.dimensions as Dimension[])
    : DEFAULT_DIMENSIONS;

  const v: EngagementValue = value && typeof value === 'object' ? (value as EngagementValue) : {};

  const set = (id: string, n: number) => onChange({ ...v, [id]: n });

  const avg = useMemo(() => {
    const vals = dims.map((d) => v[d.id]).filter((x) => typeof x === 'number') as number[];
    if (!vals.length) return null;
    return vals.reduce((s, x) => s + x, 0) / vals.length;
  }, [v, dims]);

  const completed = dims.filter((d) => typeof v[d.id] === 'number').length;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Briefcase className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Engagement survey · {completed}/{dims.length} answered
        </span>
      </div>

      <div className="space-y-2.5">
        {dims.map((d) => (
          <div key={d.id} className="rounded-md border border-border bg-card p-2.5 space-y-1.5">
            <div className="text-xs font-medium text-foreground">{d.label}</div>
            <div className="flex flex-wrap gap-1">
              {SCALE.map((label, i) => {
                const n = i + 1;
                const sel = v[d.id] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => set(d.id, sel ? 0 : n)}
                    aria-pressed={sel}
                    aria-label={`${d.label}: ${label}`}
                    title={label}
                    className={cn(
                      'flex-1 min-w-[40px] rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-all active:scale-95',
                      sel
                        ? 'bg-primary text-primary-foreground border-transparent'
                        : 'bg-background border-border text-muted-foreground hover:border-foreground/40',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{SCALE[0]}</span>
              <span>{SCALE[SCALE.length - 1]}</span>
            </div>
          </div>
        ))}
      </div>

      {avg !== null && (
        <div className="rounded-md border border-border bg-muted/30 p-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Average engagement</span>
          <span className="text-sm font-black text-foreground tabular-nums">
            {avg.toFixed(2)} <span className="text-[10px] text-muted-foreground">/ {SCALE.length}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default EmployeeEngagement;

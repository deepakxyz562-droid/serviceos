'use client';

import React, { useMemo } from 'react';
import { Users, TrendingDown, TrendingUp, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface CapacityValue {
  filled: number;
  capacity: number;
  remaining: number;
  percentFilled: number;
}

export function CapacityCounter({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Capacity counter');
  const capacity = Math.max(1, num(config.capacity, 50));
  const showBar = bool(config.showProgressBar, true);
  const showNumeric = bool(config.showNumeric, true);
  const warnAt = Math.min(capacity, num(config.warnThreshold, Math.ceil(capacity * 0.8)));
  const label = str(config.unitLabel, 'spots');
  const successMessage = str(config.successMessage, '');
  const colorMode = str(config.colorMode, 'auto'); // auto | red | green | amber

  const v: CapacityValue = value && typeof value === 'object' ? (value as CapacityValue) : { filled: 0, capacity, remaining: capacity, percentFilled: 0 };
  const filled = Math.max(0, Math.min(capacity, num(v.filled, 0)));
  const remaining = Math.max(0, capacity - filled);
  const percent = Math.round((filled / capacity) * 100);

  // Mirror value back up so the form has structured state — only emit when the
  // computed snapshot actually differs from what the parent already holds.
  const next: CapacityValue = { filled, capacity, remaining, percentFilled: percent };
  const serialized = JSON.stringify(next);
  const currentSerialized = React.useMemo(() => JSON.stringify(v), [v]);
  React.useEffect(() => {
    if (serialized !== currentSerialized) {
      onChange(next);
    }
     
  }, [serialized, currentSerialized]);

  const tone = useMemo(() => {
    if (colorMode === 'red') return 'red';
    if (colorMode === 'green') return 'green';
    if (colorMode === 'amber') return 'amber';
    if (filled >= capacity) return 'red';
    if (filled >= warnAt) return 'amber';
    return 'green';
  }, [colorMode, filled, capacity, warnAt]);

  const barTone = tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
  const textTone = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-emerald-600';
  const icon = tone === 'red' ? <TrendingDown className="size-3" /> : tone === 'amber' ? <Gauge className="size-3" /> : <TrendingUp className="size-3" />;

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold">{filled} / {capacity} {label} filled</span>
        </div>
        {showNumeric && (
          <Badge variant={tone === 'red' ? 'destructive' : 'secondary'} className={cn('gap-1', textTone)}>
            {icon}
            {remaining} left
          </Badge>
        )}
      </div>

      {showBar && (
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', barTone)}
            style={{ width: `${Math.min(100, percent)}%` }}
            role="progressbar"
            aria-valuenow={filled}
            aria-valuemin={0}
            aria-valuemax={capacity}
            aria-label={`${ariaLabel} progress`}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{percent}% full</span>
        {filled >= capacity ? (
          <span className="text-red-600 font-semibold">Sold out</span>
        ) : filled >= warnAt ? (
          <span className="text-amber-600 font-semibold">Almost full</span>
        ) : (
          <span className="text-emerald-600 font-semibold">{remaining} {label} remaining</span>
        )}
      </div>

      {successMessage && filled < capacity && (
        <p className="text-[10px] text-muted-foreground italic">{successMessage}</p>
      )}
    </div>
  );
}

export default CapacityCounter;

'use client';

import React, { useEffect, useState } from 'react';
import { FlaskConical, Trophy, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface ABVariant {
  id: string;
  label: string;
  weight: number; // 0-100
  conversions: number;
  impressions: number;
}

interface ABTestValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  testId: string;
  assignedVariant?: string;
  variants: ABVariant[];
  winner?: string;
}

/**
 * Read-only display of A/B test winner.
 *
 * Phase 3: pure UI — does NOT call an experimentation backend.
 * Variant assignment is computed once on mount (sticky via sessionStorage),
 * conversion is bumped on form submit.
 */
export function AbTestWinner({ value, onChange, config, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'A/B test winner');
  const testId = str(config.testId, 'ab_default');
  const debug = bool(config.debug, false);
  const cfgVariants = Array.isArray(config.variants) ? (config.variants as Array<Partial<ABVariant>>) : [];
  const minSample = num(config.minSample, 100);

  const seed: ABVariant[] = cfgVariants.length
    ? cfgVariants.map((v, i) => ({
        id: str(v.id, `v${i + 1}`),
        label: str(v.label, `Variant ${i + 1}`),
        weight: num(v.weight, 100 / cfgVariants.length),
        conversions: num(v.conversions, 0),
        impressions: num(v.impressions, 0),
      }))
    : [
        { id: 'a', label: 'Control', weight: 50, conversions: 0, impressions: 0 },
        { id: 'b', label: 'Variant B', weight: 50, conversions: 0, impressions: 0 },
      ];

  const computeWinner = (variants: ABVariant[]) => {
    const eligible = variants.filter((v) => v.impressions >= minSample);
    if (eligible.length === 0) return undefined;
    return eligible.reduce((best, v) => {
      const rate = v.conversions / Math.max(1, v.impressions);
      const bestRate = best.conversions / Math.max(1, best.impressions);
      return rate > bestRate ? v : best;
    }).id;
  };

  const [v, setV] = useState<ABTestValue>(() => {
    const existing = value && typeof value === 'object' ? (value as ABTestValue) : null;
    if (existing) return existing;
    // Pick a variant sticky via sessionStorage.
    let assigned: string | undefined;
    try {
      const key = `ab_${testId}`;
      assigned = sessionStorage.getItem(key) ?? undefined;
      if (!assigned) {
        const totalWeight = seed.reduce((s, x) => s + x.weight, 0);
        const rnd = Math.random() * totalWeight;
        let acc = 0;
        for (const variant of seed) {
          acc += variant.weight;
          if (rnd <= acc) {
            assigned = variant.id;
            break;
          }
        }
        if (assigned) sessionStorage.setItem(key, assigned);
      }
    } catch {
      assigned = seed[0]?.id;
    }
    const variants = seed.map((x) =>
      x.id === assigned ? { ...x, impressions: x.impressions + 1 } : x,
    );
    return {
      eventId: `ab_${testId}`,
      fired: false,
      testId,
      assignedVariant: assigned,
      variants,
      winner: computeWinner(variants),
    };
  });

  useEffect(() => {
    onChange(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  const bumpConversion = () => {
    setV((prev) => {
      const variants = prev.variants.map((x) =>
        x.id === prev.assignedVariant ? { ...x, conversions: x.conversions + 1 } : x,
      );
      return {
        ...prev,
        variants,
        fired: true,
        timestamp: new Date().toISOString(),
        winner: computeWinner(variants),
      };
    });
  };

  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 space-y-2" aria-label={ariaLabel} role="group">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-fuchsia-600" />
        <span className="text-xs font-semibold text-foreground">A/B Test</span>
        <Badge variant="outline" className="ml-auto text-[9px]">{testId}</Badge>
      </div>
      <p className="text-[10px] text-muted-foreground">
        You were assigned variant{' '}
        <span className="font-mono font-bold text-foreground">{v.assignedVariant ?? '—'}</span>.
      </p>
      <ul className="space-y-1">
        {v.variants.map((variant) => {
          const rate = variant.impressions ? (variant.conversions / variant.impressions) * 100 : 0;
          const isWinner = v.winner === variant.id;
          return (
            <li key={variant.id} className="rounded-md bg-muted/40 p-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-1">
                  <ArrowRightLeft className="size-2.5" />
                  {variant.label}{' '}
                  <span className="font-mono text-muted-foreground">({variant.id})</span>
                  {isWinner && (
                    <Badge variant="secondary" className="text-[8px] gap-0.5 h-3.5">
                      <Trophy className="size-2" /> Winner
                    </Badge>
                  )}
                </span>
                <span className="font-mono text-foreground">{rate.toFixed(1)}%</span>
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {variant.conversions} / {variant.impressions} conv.
              </div>
            </li>
          );
        })}
      </ul>
      {v.winner ? (
        <p className="text-[9px] text-emerald-700 dark:text-emerald-300 italic flex items-center gap-1">
          <CheckCircle2 className="size-2.5" /> Winner: <span className="font-mono">{v.winner}</span> ({minSample}+ sample)
        </p>
      ) : (
        <p className="text-[9px] text-muted-foreground italic">
          Need {minSample}+ impressions per variant to declare winner.
        </p>
      )}
      {debug && (
        <button
          type="button"
          onClick={bumpConversion}
          className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-medium rounded-md border border-border bg-muted/40 px-2 py-1 hover:bg-muted/70"
        >
          <Trophy className="size-3" /> Bump conversion
        </button>
      )}
    </div>
  );
}

export default AbTestWinner;

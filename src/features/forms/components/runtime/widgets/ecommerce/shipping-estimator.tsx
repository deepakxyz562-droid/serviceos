'use client';

import React, { useState } from 'react';
import { Truck, MapPin, Loader2, CheckCircle2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface EstimateValue {
  zip: string;
  zone: string;
  method: string;
  estimatedDays: number;
  rate: number;
  freeShippingApplied: boolean;
  currency: string;
  timestamp: string;
}

// Mock ZIP→zone lookup (first digit → zone for demo).
function lookupZone(zip: string): { zone: string; baseDays: number; baseRate: number } {
  const first = (zip[0] || '0');
  const map: Record<string, { zone: string; baseDays: number; baseRate: number }> = {
    '0': { zone: 'Northeast', baseDays: 2, baseRate: 8.99 },
    '1': { zone: 'Northeast', baseDays: 2, baseRate: 8.99 },
    '2': { zone: 'Southeast', baseDays: 3, baseRate: 7.49 },
    '3': { zone: 'Southeast', baseDays: 3, baseRate: 7.49 },
    '4': { zone: 'Midwest', baseDays: 4, baseRate: 6.99 },
    '5': { zone: 'Midwest', baseDays: 4, baseRate: 6.99 },
    '6': { zone: 'South-Central', baseDays: 4, baseRate: 7.99 },
    '7': { zone: 'South-Central', baseDays: 4, baseRate: 7.99 },
    '8': { zone: 'Mountain', baseDays: 5, baseRate: 9.49 },
    '9': { zone: 'Pacific', baseDays: 5, baseRate: 10.99 },
  };
  return map[first] || { zone: 'Unknown', baseDays: 6, baseRate: 12.99 };
}

const METHODS = [
  { id: 'standard', label: 'Standard', multiplier: 1, dayMod: 0 },
  { id: 'express', label: 'Express', multiplier: 1.8, dayMod: -1 },
  { id: 'overnight', label: 'Overnight', multiplier: 2.6, dayMod: -3 },
];

export function ShippingEstimator({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Shipping estimator');
  const currency = str(config.currency, 'USD');
  const subtotal = num(config.subtotal, 0);
  const freeThreshold = num(config.freeShippingThreshold, 0);
  const showThresholdHint = bool(config.showThresholdHint, true);

  const existing = value && typeof value === 'object' ? (value as EstimateValue) : undefined;
  const [zip, setZip] = useState(existing?.zip ?? '');
  const [method, setMethod] = useState(existing?.method ?? 'standard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateValue | null>(existing ?? null);
  const [error, setError] = useState('');

  const handleEstimate = () => {
    if (disabled) return;
    const z = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(z)) {
      setError('Enter a valid US ZIP code (5 digits).');
      setResult(null);
      return;
    }
    setError('');
    setLoading(true);
    // Mock async lookup — no real API calls in Phase 3.
    setTimeout(() => {
      const { zone, baseDays, baseRate } = lookupZone(z);
      const m = METHODS.find((x) => x.id === method) ?? METHODS[0];
      const days = Math.max(1, baseDays + m.dayMod);
      const freeApplied = freeThreshold > 0 && subtotal >= freeThreshold;
      const next: EstimateValue = {
        zip: z,
        zone,
        method,
        estimatedDays: days,
        rate: freeApplied ? 0 : +(baseRate * m.multiplier).toFixed(2),
        freeShippingApplied: freeApplied,
        currency,
        timestamp: new Date().toISOString(),
      };
      setResult(next);
      onChange(next);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Truck className="size-4 text-blue-600" />
        <span className="text-xs font-bold">Shipping Estimator</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={zip}
            onChange={(e) => { setZip(e.target.value.replace(/[^\d-]/g, '').slice(0, 10)); setError(''); }}
            disabled={disabled}
            placeholder="94103"
            className="h-9 pl-8 text-xs font-mono"
            aria-label="ZIP code"
            inputMode="numeric"
          />
        </div>
        <Button type="button" disabled={disabled || !zip.trim() || loading} onClick={handleEstimate} className="h-9 text-xs gap-1" size="sm">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Estimate'}
        </Button>
      </div>

      <div className="flex gap-1">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={disabled || loading}
            onClick={() => setMethod(m.id)}
            className={cn(
              'flex-1 h-7 text-[10px] rounded-md border font-medium transition-colors',
              method === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
            )}
            aria-label={`Select ${m.label} method`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      {result && !error && (
        <div className="rounded-lg border border-blue-300/60 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 p-2.5 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400">
              <CheckCircle2 className="size-3.5" /> {result.zone}
            </span>
            <Badge variant="secondary" className="text-[9px]">{result.method}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1"><Package className="size-3" /> ETA</span>
            <span className="font-mono">{result.estimatedDays} day(s)</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-blue-200 dark:border-blue-800/60">
            <span className="font-bold">Shipping</span>
            <span className={cn('font-black', result.freeShippingApplied ? 'text-emerald-600' : 'text-foreground')}>
              {result.freeShippingApplied ? 'FREE' : `${result.rate.toFixed(2)} ${currency}`}
            </span>
          </div>
        </div>
      )}

      {showThresholdHint && freeThreshold > 0 && subtotal < freeThreshold && (
        <p className="text-[10px] text-muted-foreground">
          Add {(freeThreshold - subtotal).toFixed(2)} {currency} more to qualify for free shipping.
        </p>
      )}
    </div>
  );
}

export default ShippingEstimator;

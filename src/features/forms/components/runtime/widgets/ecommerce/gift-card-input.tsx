'use client';

import React, { useState } from 'react';
import { Gift, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';

interface GiftCardValue {
  code: string;
  balance: number;
  applied: boolean;
  currency: string;
  timestamp: string;
}

// Mock gift-card database — replace with real lookup in Phase 4.
const MOCK_CARDS: Record<string, number> = {
  GIFT50ABC: 50,
  GIFT100XYZ: 100,
  PROMO25NOW: 25,
};

export function GiftCardInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Gift card');
  const currency = str(config.currency, 'USD');
  const existing = value && typeof value === 'object' ? (value as GiftCardValue) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [applied, setApplied] = useState<GiftCardValue | null>(existing && existing.applied ? existing : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = () => {
    if (disabled || !code.trim()) return;
    setError('');
    setLoading(true);
    setTimeout(() => {
      const key = code.trim().toUpperCase();
      const balance = MOCK_CARDS[key];
      if (balance === undefined) {
        setError('Gift card not found.');
        setApplied(null);
        setLoading(false);
        return;
      }
      const next: GiftCardValue = {
        code: key,
        balance,
        applied: true,
        currency,
        timestamp: new Date().toISOString(),
      };
      setApplied(next);
      onChange(next);
      setLoading(false);
    }, 500);
  };

  const handleRemove = () => {
    if (disabled) return;
    setCode('');
    setApplied(null);
    setError('');
    onChange(null);
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Gift className="size-4 text-purple-600" />
        <span className="text-xs font-bold">Gift Card</span>
      </div>

      {applied ? (
        <div className="rounded-lg border border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/30 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
              <CheckCircle2 className="size-3" /> {applied.code}
            </Badge>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={handleRemove} disabled={disabled} aria-label="Remove gift card">
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-200 dark:border-purple-800/60">
            <span className="text-muted-foreground">Balance applied</span>
            <span className="font-black text-purple-700 dark:text-purple-400">
              {applied.balance.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 20)); setError(''); }}
              disabled={disabled}
              placeholder="GIFT50ABC"
              className="h-9 text-xs font-mono uppercase"
              aria-label="Gift card code"
            />
            <Button type="button" disabled={disabled || !code.trim() || loading} onClick={handleApply} className="h-9 text-xs gap-1" size="sm">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          {error ? (
            <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Try demo: <strong>GIFT50ABC</strong>, <strong>GIFT100XYZ</strong>, or <strong>PROMO25NOW</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default GiftCardInput;

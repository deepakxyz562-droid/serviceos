'use client';

import React, { useState } from 'react';
import { Ticket, BadgeCheck, AlertCircle, Loader2, Gift, Sparkles, X, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface PromoValue {
  code: string;
  offer?: string;
  discountType?: 'percent' | 'fixed' | 'special';
  discountValue?: number;
  valid: boolean;
  applied: boolean;
  unlockedAt?: string;
}

// Mock promo-code registry.
const MOCK_PROMOS: Record<string, Omit<PromoValue, 'code' | 'valid' | 'applied'>> = {
  WELCOME15: { offer: '15% off your first order', discountType: 'percent', discountValue: 15 },
  FLASH25: { offer: '25% off — 24h flash sale', discountType: 'percent', discountValue: 25 },
  FREESHIP: { offer: 'Free shipping on any order', discountType: 'special', discountValue: 0 },
  BOGO: { offer: 'Buy one get one free', discountType: 'special', discountValue: 0 },
  VIP50: { offer: '$50 off orders over $200', discountType: 'fixed', discountValue: 50 },
};

export function PromoCodeUnlock({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Promo code');
  const showHint = bool(config.showHint, true);
  const unlockMessage = str(config.unlockMessage, 'Special offer unlocked!');
  const minOrderValue = num(config.minOrderValue, 0);

  const existing: PromoValue | undefined = value && typeof value === 'object' ? (value as PromoValue) : undefined;
  const [code, setCode] = useState(existing?.code ?? '');
  const [result, setResult] = useState<PromoValue | null>(existing && existing.applied ? existing : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = () => {
    if (disabled || !code.trim()) return;
    setError(''); setLoading(true);
    setTimeout(() => {
      const key = code.trim().toUpperCase();
      const found = MOCK_PROMOS[key];
      if (!found) {
        setError('Invalid promo code.');
        setResult(null);
        setLoading(false);
        return;
      }
      if (minOrderValue > 0 && (!config.orderValue || num(config.orderValue, 0) < minOrderValue)) {
        setError(`Requires a minimum order of ${minOrderValue.toFixed(2)}.`);
        setLoading(false);
        return;
      }
      const out: PromoValue = {
        code: key,
        ...found,
        valid: true,
        applied: true,
        unlockedAt: new Date().toISOString(),
      };
      setResult(out);
      onChange(out);
      setLoading(false);
    }, 450);
  };

  const handleRemove = () => {
    if (disabled) return;
    setCode(''); setResult(null); setError('');
    onChange({ code: '', valid: false, applied: false });
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Ticket className="size-4 text-rose-600" />
        <span className="text-xs font-bold">Promo Code</span>
      </div>

      {result && result.applied ? (
        <div className="rounded-lg border-2 border-dashed border-rose-300 dark:border-rose-800/60 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] gap-1 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
              <BadgeCheck className="size-3" /> {result.code}
            </Badge>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={handleRemove} disabled={disabled} aria-label="Remove promo code">
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <Sparkles className="size-4" /> {unlockMessage}
          </div>
          <p className="text-muted-foreground">{result.offer}</p>
          {result.discountType === 'percent' && (
            <div className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
              <Percent className="size-3" /> {result.discountValue}% off applied at checkout
            </div>
          )}
          {result.discountType === 'fixed' && (
            <div className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
              <Gift className="size-3 inline mr-1" /> ${result.discountValue?.toFixed(2)} off applied at checkout
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)); setError(''); }}
              disabled={disabled || loading}
              placeholder="WELCOME15"
              className="h-9 text-xs font-mono uppercase"
              aria-label="Promo code"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUnlock(); } }}
            />
            <Button type="button" disabled={disabled || !code.trim() || loading} onClick={handleUnlock} size="sm" className="h-9 text-xs gap-1 bg-rose-600 hover:bg-rose-700">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Unlock
            </Button>
          </div>
          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
          {showHint && !error && (
            <p className="text-[10px] text-muted-foreground">
              Try: <strong>WELCOME15</strong>, <strong>FLASH25</strong>, <strong>FREESHIP</strong>, <strong>BOGO</strong>, <strong>VIP50</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default PromoCodeUnlock;

'use client';

import React, { useState } from 'react';
import { Tag, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps } from '../widget-props';

interface CouponCodeValue {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  discountAmount: number; // applied amount
  subtotal: number;
  total: number;
  currency: string;
}

interface CouponConfig {
  currency?: string;
  subtotal?: number;
  coupons?: Record<string, { type: 'percent' | 'fixed'; value: number }>;
  placeholder?: string;
}

export function CouponCode({ value, onChange, config, disabled, field }: WidgetProps) {
  const cfg = config as unknown as CouponConfig;
  const currency = String(cfg.currency ?? 'USD');
  const subtotal = Number(cfg.subtotal ?? 99);
  const coupons = cfg.coupons || {
    SAVE10: { type: 'percent', value: 10 },
    WELCOME20: { type: 'percent', value: 20 },
    FLAT15: { type: 'fixed', value: 15 },
  };
  const label = String(field?.label ?? 'Coupon Code');

  const existing = value as CouponCodeValue | undefined;
  const [code, setCode] = useState(existing?.code || '');
  const [applied, setApplied] = useState<CouponCodeValue | null>(
    existing?.code ? existing as CouponCodeValue : null
  );
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  const handleApply = () => {
    if (disabled || !code.trim()) return;
    setError('');
    setValidating(true);
    setTimeout(() => {
      const key = code.trim().toUpperCase();
      const found = coupons[key];
      if (!found) {
        setError('Invalid coupon code.');
        setApplied(null);
        setValidating(false);
        return;
      }
      const discountAmount = found.type === 'percent'
        ? +(subtotal * found.value / 100).toFixed(2)
        : Math.min(found.value, subtotal);
      const next: CouponCodeValue = {
        code: key, discountType: found.type, discountValue: found.value,
        discountAmount, subtotal, total: +(subtotal - discountAmount).toFixed(2), currency,
      };
      setApplied(next);
      onChange(next);
      setValidating(false);
    }, 600);
  };

  const handleRemove = () => {
    if (disabled) return;
    setCode(''); setApplied(null); setError('');
    onChange(null);
  };

  return (
    <div className="space-y-2.5" aria-label={label}>
      <div className="flex items-center gap-1.5">
        <Tag className="size-4 text-emerald-600" />
        <span className="text-xs font-bold">Coupon / Promo Code</span>
      </div>
      {applied ? (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="size-3" /> {applied.code}
            </Badge>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={handleRemove} disabled={disabled} aria-label="Remove coupon">
              <X className="size-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            {applied.discountType === 'percent'
              ? `${applied.discountValue}% off`
              : `${applied.discountValue.toFixed(2)} ${currency} off`} — You save <strong>{applied.discountAmount.toFixed(2)} {currency}</strong>
          </p>
          <div className="flex justify-between text-[11px] pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
            <span className="text-muted-foreground">New Total</span>
            <span className="font-black text-foreground">{applied.total.toFixed(2)} {currency}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }} disabled={disabled}
              placeholder={cfg.placeholder || 'WELCOME20'} className="h-9 text-xs font-mono" />
            <Button type="button" disabled={disabled || !code.trim() || validating} onClick={handleApply} className="h-9 text-xs gap-1">
              {validating ? <Loader2 className="size-3.5 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          {!error && (
            <p className="text-[10px] text-muted-foreground">
              Try: <strong>SAVE10</strong>, <strong>WELCOME20</strong>, or <strong>FLAT15</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default CouponCode;

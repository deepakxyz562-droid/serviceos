'use client';

import React, { useState } from 'react';
import { Ticket, BadgeCheck, AlertCircle, Loader2, Gift, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface ReferralValue {
  code: string;
  referrer?: string;
  rewardOffered?: string;
  valid: boolean;
  applied: boolean;
  timestamp?: string;
}

// Mock referral-code registry — Phase 3 placeholder.
const MOCK_CODES: Record<string, { referrer: string; reward: string }> = {
  FRIEND10: { referrer: 'Alex Johnson', reward: '$10 off your first order' },
  GIVESHARE: { referrer: 'Sam Smith', reward: '$15 credit + 1 month free' },
  VIPINVITE: { referrer: 'Jordan Lee', reward: '20% off + free shipping' },
};

export function ReferralCodeInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Referral code');
  const maxLength = num(config.maxLength, 16);
  const showHint = bool(config.showHint, true);
  const autoFocus = bool(config.autoFocus, false);

  const existing: ReferralValue | undefined = value && typeof value === 'object' ? (value as ReferralValue) : undefined;
  const [code, setCode] = useState(existing?.code ?? '');
  const [result, setResult] = useState<ReferralValue | null>(existing && existing.applied ? existing : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleValidate = () => {
    if (disabled || !code.trim()) return;
    setError(''); setLoading(true);
    setTimeout(() => {
      const key = code.trim().toUpperCase();
      const found = MOCK_CODES[key];
      if (!found) {
        setError('Referral code not recognized.');
        setResult(null);
        setLoading(false);
        return;
      }
      const out: ReferralValue = {
        code: key,
        referrer: found.referrer,
        rewardOffered: found.reward,
        valid: true,
        applied: true,
        timestamp: new Date().toISOString(),
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
        <Ticket className="size-4 text-indigo-600" />
        <span className="text-xs font-bold">Referral Code</span>
      </div>

      {result && result.applied ? (
        <div className="rounded-lg border border-indigo-300 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/30 p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              <BadgeCheck className="size-3" /> {result.code}
            </Badge>
            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500" onClick={handleRemove} disabled={disabled} aria-label="Remove referral code">
              <X className="size-3.5" />
            </Button>
          </div>
          {result.referrer && <p className="text-muted-foreground">Referred by <strong>{result.referrer}</strong></p>}
          {result.rewardOffered && (
            <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <Gift className="size-3.5" /> Reward: {result.rewardOffered}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, maxLength)); setError(''); }}
              disabled={disabled || loading}
              placeholder="FRIEND10"
              className="h-9 text-xs font-mono uppercase"
              aria-label="Referral code"
              autoFocus={autoFocus}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleValidate(); } }}
            />
            <Button type="button" disabled={disabled || !code.trim() || loading} onClick={handleValidate} size="sm" className="h-9 text-xs gap-1">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : 'Validate'}
            </Button>
          </div>
          {error && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
          {showHint && !error && (
            <p className="text-[10px] text-muted-foreground">
              Try: <strong>FRIEND10</strong>, <strong>GIVESHARE</strong>, or <strong>VIPINVITE</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default ReferralCodeInput;

'use client';

import React, { useRef, useState } from 'react';
import { KeyRound, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface TwoFactorValue {
  code: string;
  verified: boolean;
  verifiedAt?: string;
}

const CODE_LENGTH = 6;

export function TwoFactorAuth({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Two-factor authentication');
  const codeLength = Math.max(4, Math.min(10, num(config.codeLength, CODE_LENGTH)));
  const maskInputs = bool(config.maskInputs, false);

  const v: TwoFactorValue = value && typeof value === 'object' ? (value as TwoFactorValue) : { code: '', verified: false };
  const [digits, setDigits] = useState<string[]>(() => {
    const initial = (v.code || '').split('').slice(0, codeLength);
    return Array.from({ length: codeLength }, (_, i) => initial[i] ?? '');
  });
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  // Mock verification — Phase 2: never calls a real API. Triggered from the
  // update() event handler when the last digit lands, so we avoid setState-in-effect.
  const verify = (codeDigits: string[]) => {
    if (codeDigits.some((d) => d.length !== 1)) return;
    setVerifying(true);
    setError(false);
    setTimeout(() => {
      // Mock: code "123456" or any all-identical digits validates as success.
      const allSame = codeDigits.every((d) => d === codeDigits[0]);
      const success = codeDigits.join('') === '123456' || allSame;
      setVerifying(false);
      if (success) {
        setError(false);
        onChange({ code: codeDigits.join(''), verified: true, verifiedAt: new Date().toISOString() });
      } else {
        setError(true);
      }
    }, 700);
  };

  const update = (idx: number, val: string) => {
    if (disabled) return;
    const clean = val.replace(/[^0-9]/g, '');
    const next = [...digits];
    if (clean.length > 1) {
      // Paste: distribute across inputs.
      for (let i = 0; i < clean.length && idx + i < codeLength; i++) {
        next[idx + i] = clean[i];
      }
    } else {
      next[idx] = clean;
    }
    setDigits(next);
    onChange({ code: next.join(''), verified: false });
    if (clean.length === 1 && idx + 1 < codeLength) {
      refs.current[idx + 1]?.focus();
    }
    // Trigger verification once every digit is filled.
    if (next.every((d) => d.length === 1)) {
      verify(next);
    }
  };

  const onKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx + 1 < codeLength) refs.current[idx + 1]?.focus();
  };

  if (v.verified) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Verified</span>
          {v.verifiedAt && (
            <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              {new Date(v.verifiedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setDigits(Array.from({ length: codeLength }, () => ''));
              onChange({ code: '', verified: false });
            }}
          >
            Reset code
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <KeyRound className="size-3.5" /> Enter {codeLength}-digit authenticator code
      </div>
      <div className="flex gap-1.5 justify-between">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type={maskInputs ? 'password' : 'text'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            disabled={disabled || verifying}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            aria-label={`${ariaLabel} digit ${i + 1} of ${codeLength}`}
            className={cn(
              'h-11 w-9 rounded-md border border-border bg-background text-center font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary',
              error && 'border-red-500',
              verifying && 'opacity-60',
            )}
          />
        ))}
      </div>
      {verifying && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" /> Verifying…
        </p>
      )}
      {error && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <ShieldCheck className="size-3" /> Invalid code — please try again.
        </p>
      )}
      <Badge variant="outline" className="text-[9px] gap-1">
        <ShieldCheck className="size-2.5" />
        Phase 2 — demo codes: "123456" or any repeated digit.
      </Badge>
    </div>
  );
}

export default TwoFactorAuth;

'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, RefreshCw, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'solving' | 'solved' | 'error';

interface FriendlyCaptchaValue {
  status: Status;
  solvedAt?: string;
  solution?: string;
}

export function FriendlyCaptcha({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Friendly captcha');
  const language = str(config.language, 'en');
  const dark = bool(config.darkMode, false);

  const v: FriendlyCaptchaValue =
    value && typeof value === 'object' ? (value as FriendlyCaptchaValue) : { status: 'idle' };
  const [status, setStatus] = useState<Status>(v.status ?? 'idle');

  const emit = (next: Status) => {
    setStatus(next);
    const patch: FriendlyCaptchaValue = { status: next };
    if (next === 'solved') {
      patch.solvedAt = new Date().toISOString();
      patch.solution = `fcap_${Math.random().toString(36).slice(2, 14)}`;
    }
    onChange(patch);
  };

  // Auto-start a mock puzzle when the user clicks "Start".
  useEffect(() => {
    if (status !== 'solving') return;
    const id = setTimeout(() => emit('solved'), 1200);
    return () => clearTimeout(id);
     
  }, [status]);

  if (v.status === 'solved' || status === 'solved') {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div
          className={cn(
            'rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2',
          )}
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Verification complete</span>
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="sm" className="text-[10px] h-6 gap-1" onClick={() => emit('idle')}>
            <RefreshCw className="size-2.5" /> Reset
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel}>
      <div
        className={cn(
          'rounded-md border border-border bg-card p-2.5 flex items-center gap-2.5',
          dark && 'bg-zinc-900 border-zinc-700 text-zinc-100',
        )}
      >
        <Puzzle className={cn('size-5', dark ? 'text-zinc-300' : 'text-muted-foreground')} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {language === 'es' ? 'Verifica que eres humano' : language === 'fr' ? 'Vérifiez que vous êtes humain' : 'Verify you are human'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {status === 'solving' ? 'Solving visual puzzle…' : 'Friendly captcha ready'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || status === 'solving'}
          onClick={() => emit('solving')}
          className="text-[10px] h-7 gap-1"
          aria-label={`Start ${ariaLabel}`}
        >
          {status === 'solving' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="size-3.5" />
          )}
          {status === 'solving' ? 'Solving…' : 'Start'}
        </Button>
      </div>
      <p className="text-[9px] text-muted-foreground">
        Placeholder widget — production deploy wires the official FriendlyCaptcha JS SDK.
      </p>
    </div>
  );
}

export default FriendlyCaptcha;

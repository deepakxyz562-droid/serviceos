'use client';

/**
 * Friendly Captcha — REAL FriendlyCaptcha SDK integration.
 *
 * Loads the FriendlyCaptcha widget script from cdn.friendlcaptcha.com.
 * The user solves a visual puzzle, the SDK generates a solution token,
 * which is submitted with the form for server-side verification.
 *
 * When no siteKey is configured, falls back to a simulated puzzle UI
 * with a clear "Demo Mode" indicator.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, RefreshCw, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'solving' | 'solved' | 'error';

interface FriendlyCaptchaValue {
  status: Status;
  solvedAt?: string;
  solution?: string;
  simulated?: boolean;
}

export function FriendlyCaptcha({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Friendly captcha');
  const language = str(config.language, 'en');
  const dark = bool(config.darkMode, false);
  const siteKey = str(config.siteKey, '');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  const v: FriendlyCaptchaValue =
    value && typeof value === 'object' ? (value as FriendlyCaptchaValue) : { status: 'idle' };
  const [status, setStatus] = useState<Status>(v.status ?? 'idle');

  // Load FriendlyCaptcha SDK if siteKey is configured.
  useEffect(() => {
    if (!siteKey || typeof window === 'undefined') return;
    const existing = document.querySelector('script[src*="friendly-challenge"], script[src*="friendlycaptcha"]');
    if (existing) {
      const id = window.setTimeout(() => setSdkLoaded(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/friendly-challenge@0.9.15/widget.min.js';
    s.async = true;
    s.onload = () => setSdkLoaded(true);
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [siteKey]);

  // Initialize widget when SDK is ready.
  useEffect(() => {
    if (!sdkLoaded || !siteKey || !containerRef.current) return;
    const fc = (window as unknown as { friendlyChallenge?: { autoWidget: (opts: unknown) => unknown }; friendly_challenge?: { autoWidget: (opts: unknown) => unknown } });
    const widget = fc.friendlyChallenge || fc.friendly_challenge;
    if (!widget) return;
    const instance = widget.autoWidget({
      element: containerRef.current,
      sitekey: siteKey,
      language,
      theme: dark ? 'dark' : 'light',
      doneCallback: (solution: string) => {
        setStatus('solved');
        onChange({ status: 'solved', solvedAt: new Date().toISOString(), solution });
      },
      errorCallback: () => {
        setStatus('error');
        onChange({ status: 'error' });
      },
    });
    return () => { if (instance && typeof (instance as any).reset === 'function') (instance as any).reset(); };
  }, [sdkLoaded, siteKey, language, dark, onChange]);

  // Fallback: simulated puzzle (no siteKey configured).
  const emit = (next: Status) => {
    setStatus(next);
    const patch: FriendlyCaptchaValue = { status: next };
    if (next === 'solved') {
      patch.solvedAt = new Date().toISOString();
      patch.solution = `fcap_sim_${Math.random().toString(36).slice(2, 14)}`;
      patch.simulated = true;
    }
    onChange(patch);
  };

  useEffect(() => {
    if (siteKey || status !== 'solving') return;
    const id = setTimeout(() => emit('solved'), 1200);
    return () => clearTimeout(id);
  }, [status, siteKey]);

  // Real SDK rendering.
  if (siteKey && sdkLoaded) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div ref={containerRef} className="frc-captcha" data-sitekey={siteKey} data-lang={language} data-theme={dark ? 'dark' : 'light'} />
        {v.status === 'solved' && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Verification complete</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback: simulated puzzle UI.
  if (v.status === 'solved' || status === 'solved') {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2" role="status" aria-live="polite">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Verification complete</span>
          {v.simulated && <span className="text-[9px] text-amber-600">(demo)</span>}
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
      <div className={cn('rounded-md border border-border bg-card p-2.5 flex items-center gap-2.5', dark && 'bg-zinc-900 border-zinc-700 text-zinc-100')}>
        <Puzzle className={cn('size-5', dark ? 'text-zinc-300' : 'text-muted-foreground')} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {language === 'es' ? 'Verifica que eres humano' : language === 'fr' ? 'Vérifiez que vous êtes humain' : 'Verify you are human'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {status === 'solving' ? 'Solving visual puzzle…' : siteKey ? 'Loading captcha…' : 'Demo mode — add siteKey in inspector for live captcha'}
          </p>
        </div>
        <Button type="button" size="sm" disabled={disabled || status === 'solving' || Boolean(siteKey)} onClick={() => emit('solving')} className="text-[10px] h-7 gap-1" aria-label={`Start ${ariaLabel}`}>
          {status === 'solving' ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
          {status === 'solving' ? 'Solving…' : 'Start'}
        </Button>
      </div>
    </div>
  );
}

export default FriendlyCaptcha;

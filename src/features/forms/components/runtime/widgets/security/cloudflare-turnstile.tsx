'use client';

/**
 * Cloudflare Turnstile widget — renders the real Turnstile challenge.
 *
 * Loads the Turnstile script from challenges.cloudflare.com and renders
 * the challenge widget using the configured site key (read from
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY). Falls back to a disabled placeholder
 * notice when no site key is configured so the form does not crash.
 *
 * The Turnstile token is emitted to form state via onChange so the
 * server-side submission handler can verify it with the secret key.
 */
import React, { useEffect, useRef, useState, useId } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

type TurnstileStatus = 'idle' | 'rendering' | 'verified' | 'expired' | 'error';

interface TurnstileValue {
  status: TurnstileStatus;
  token?: string;
  verifiedAt?: string;
}

// Minimal global typing for the Turnstile JS API injected by the script.
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: Record<string, unknown>,
        cb?: (token: string) => void,
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script load error')));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile script load error'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function CloudflareTurnstile({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Cloudflare Turnstile');
  const theme = str(config.theme, 'auto') as 'auto' | 'light' | 'dark';
  const size = str(config.size, 'flexible') as 'flexible' | 'compact' | 'normal';
  const action = str(config.action, '');
  const cData = str(config.cData, '');
  const explicitRefresh = bool(config.allowRefresh, true);

  const siteKey =
    (typeof process !== 'undefined' &&
      (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY)) ||
    '';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const reactId = useId();
  const [status, setStatus] = useState<TurnstileStatus>(() => {
    const v = value && typeof value === 'object' ? (value as TurnstileValue) : null;
    return v?.status ?? 'idle';
  });
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync form value → local status on mount only (avoid feedback loop).
  useEffect(() => {
    if (status === 'idle') {
      onChange({ status: 'idle' });
    }
     
  }, []);

  const renderWidget = React.useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;
    // Clear any previous render.
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }
    containerRef.current.innerHTML = '';
    setStatus('rendering');
    try {
      widgetIdRef.current = window.turnstile.render(
        containerRef.current,
        {
          sitekey: siteKey,
          theme,
          size: size === 'flexible' ? 'flexible' : size,
          action: action || undefined,
          'c-data': cData || undefined,
          callback: (token: string) => {
            setStatus('verified');
            onChange({ status: 'verified', token, verifiedAt: new Date().toISOString() });
          },
          'expired-callback': () => {
            setStatus('expired');
            onChange({ status: 'expired' });
          },
          'error-callback': () => {
            setStatus('error');
            setErrorMsg('Turnstile challenge failed. Please try again.');
            onChange({ status: 'error' });
          },
        },
      );
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Turnstile render error');
    }
  }, [siteKey, theme, size, action, cData, onChange]);

  useEffect(() => {
    if (!siteKey || disabled) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled) return;
        renderWidget();
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg('Failed to load Turnstile script.');
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
     
  }, [siteKey, disabled]);

  // No site key → show a clear disabled placeholder so authors know to configure env.
  if (!siteKey) {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div
          className={cn(
            'rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2.5 flex items-center gap-2.5',
          )}
          role="alert"
        >
          <ShieldAlert className="size-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Turnstile not configured
            </p>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
              Set <code className="font-mono">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> to enable bot protection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="space-y-1.5" aria-label={ariaLabel}>
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Verified by Cloudflare Turnstile
          </span>
        </div>
        {explicitRefresh && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[10px] h-6 gap-1"
            onClick={() => {
              if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
                setStatus('rendering');
              }
            }}
          >
            <RefreshCw className="size-2.5" /> Reset
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" aria-label={ariaLabel} data-turnstile-id={reactId}>
      <div
        ref={containerRef}
        className={cn(
          'cf-turnstile min-h-[65px] rounded-md border border-border bg-card p-1 flex items-center justify-center',
          disabled && 'opacity-50 pointer-events-none',
        )}
        aria-busy={status === 'rendering'}
      >
        {status !== 'rendering' && (
          <span className="text-[10px] text-muted-foreground">Loading challenge…</span>
        )}
      </div>
      {status === 'error' && (
        <div
          className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 p-1.5 flex items-center gap-1.5"
          role="alert"
        >
          <ShieldAlert className="size-3.5 text-red-600" />
          <span className="text-[11px] text-red-700 dark:text-red-400 font-semibold">
            {errorMsg || 'Verification failed.'}
          </span>
        </div>
      )}
      {status === 'expired' && (
        <p className="text-[10px] text-muted-foreground">
          Verification expired. Please retry.
        </p>
      )}
    </div>
  );
}

export default CloudflareTurnstile;

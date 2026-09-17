'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Mail, ShieldCheck, Send, Loader2, RefreshCw, CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface EmailOtpValue {
  email: string;
  code: string;
  verified: boolean;
  verifiedAt?: string;
  attempts: number;
}

export function EmailOtpVerification({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Email OTP verification');
  const codeLength = Math.max(4, Math.min(10, num(config.codeLength, 6)));
  const resendSeconds = Math.max(15, num(config.resendSeconds, 60));
  const mockDevCode = bool(config.exposeDevCode, true);

  const v: EmailOtpValue = value && typeof value === 'object' ? (value as EmailOtpValue) : { email: '', code: '', verified: false, attempts: 0 };

  const [email, setEmail] = useState(v.email || '');
  const [code, setCode] = useState(v.code || '');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const emit = (patch: Partial<EmailOtpValue>) => onChange({ ...v, ...patch });

  const handleSend = () => {
    if (disabled || sending || !email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSending(true);
    // MOCK: never makes a real network call in Phase 2.
    setTimeout(() => {
      const generated = Array.from({ length: codeLength }, () => Math.floor(Math.random() * 10)).join('');
      setSentCode(generated);
      setSeconds(resendSeconds);
      setSending(false);
      emit({ email, code: '', verified: false, attempts: 0 });
    }, 600);
  };

  const handleVerify = () => {
    if (disabled || verifying || !sentCode || code.length !== codeLength) return;
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      const next = { email, code, verified: code === sentCode, attempts: v.attempts + 1 };
      if (next.verified) {
        next.verifiedAt = new Date().toISOString();
      }
      emit(next);
    }, 400);
  };

  if (v.verified) {
    return (
      <div className="space-y-2" aria-label={ariaLabel}>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Email verified</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">{v.email}</p>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setEmail('');
                setCode('');
                setSentCode(null);
                emit({ email: '', code: '', verified: false, attempts: 0, verifiedAt: undefined });
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || sending || !!sentCode}
            aria-label="Email address"
            className="text-xs h-9 pl-8"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="text-xs gap-1.5"
          disabled={disabled || sending || !email || seconds > 0}
          onClick={handleSend}
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : seconds > 0 ? (
            `Resend (${seconds}s)`
          ) : (
            <>
              <Send className="size-3.5" /> Send code
            </>
          )}
        </Button>
      </div>

      {sentCode && (
        <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" /> Enter {codeLength}-digit code
            </span>
            {mockDevCode && (
              <Badge variant="outline" className="text-[9px] gap-1 font-mono">
                <KeyRound className="size-2.5" />
                Dev: {sentCode}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={codeLength}
              value={code}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, codeLength);
                setCode(clean);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder={'•'.repeat(codeLength)}
              aria-label={`${ariaLabel} code`}
              className="text-center tracking-[0.3em] font-mono text-sm flex-1"
              disabled={disabled || verifying}
            />
            <Button
              type="button"
              size="sm"
              disabled={disabled || verifying || code.length !== codeLength}
              onClick={handleVerify}
              className="text-xs gap-1.5"
            >
              {verifying ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Verify
            </Button>
          </div>
          {v.attempts > 0 && !v.verified && (
            <p className="text-[10px] text-red-600 flex items-center gap-1">
              <RefreshCw className="size-3" /> Invalid code. Attempt #{v.attempts}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default EmailOtpVerification;

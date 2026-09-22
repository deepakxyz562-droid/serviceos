'use client';

import React, { useState, useEffect } from 'react';
import { Phone, ShieldCheck, Send, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export interface SmsVerificationValue {
  phone: string;
  verified: boolean;
  verifiedAt?: string;
}

interface SmsOtpVerificationProps {
  value?: SmsVerificationValue | null;
  onChange: (val: SmsVerificationValue | null) => void;
  disabled?: boolean;
  /** Settings: `codeLength` (number), `expiryMinutes` (number), `provider` (string). */
  config?: Record<string, unknown>;
}

export function SmsOtpVerification({
  value,
  onChange,
  disabled = false,
  config,
}: SmsOtpVerificationProps) {
  // Settings write `codeLength`, `expiryMinutes`, and `provider`. Read them
  // with sensible defaults so saved forms can tune OTP UX.
  const codeLength = Math.max(4, Math.min(10, Number(config?.codeLength ?? 6)));
  const expiryMinutes = Math.max(1, Number(config?.expiryMinutes ?? 1));
  const expirySeconds = expiryMinutes * 60;
  // `provider` is informational on the client (server dispatches SMS).
  // Surface it only so config flows through; no UI change needed.
  void config?.provider;

  const [phone, setPhone] = useState(value?.phone || '');
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mockDevCode, setMockDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8 || disabled) {
      toast.error('Please enter a valid phone number with area code');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/proxy/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          action: 'send_otp',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCodeSent(true);
        setCountdown(expirySeconds);
        if (data.devCode) {
          setMockDevCode(data.devCode);
          toast.success(`Verification code sent! (Dev code: ${data.devCode})`);
        } else {
          toast.success('Verification code sent to your phone!');
        }
      } else {
        toast.error(data.error || 'Failed to send verification SMS');
      }
    } catch {
      toast.error('Network error sending SMS');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || disabled) return;
    setVerifying(true);

    try {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const res = await fetch('/api/proxy/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          code: otp.trim(),
          action: 'verify_otp',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.valid) {
        toast.success('Phone verified successfully!');
        onChange({
          phone: cleanPhone,
          verified: true,
          verifiedAt: new Date().toISOString(),
        });
      } else {
        toast.error(data.error || 'Invalid verification code. Please check and retry.');
      }
    } catch {
      toast.error('Error verifying code');
    } finally {
      setVerifying(false);
    }
  };

  if (value?.verified) {
    return (
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Phone Number Verified
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
              {value.phone}
            </p>
          </div>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setCodeSent(false);
              setOtp('');
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
          >
            Change
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Phone input with Send button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="pl-9 text-xs"
            disabled={disabled || codeSent || sending}
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleSendCode}
          disabled={disabled || sending || !phone.trim() || countdown > 0}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : countdown > 0 ? (
            `Resend (${countdown}s)`
          ) : (
            <>
              <Send className="size-3.5" /> Send Code
            </>
          )}
        </Button>
      </div>

      {/* OTP verification box */}
      {codeSent && (
        <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" /> Enter {codeLength}-Digit SMS Code
            </span>
            {mockDevCode && (
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Dev: {mockDevCode}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              maxLength={codeLength}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleVerifyOtp())}
              placeholder={'0'.repeat(codeLength)}
              className="text-center tracking-widest font-mono text-sm font-bold flex-1"
              disabled={disabled || verifying}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleVerifyOtp}
              disabled={disabled || verifying || otp.length < codeLength}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              {verifying ? <Loader2 className="size-3.5 animate-spin" /> : 'Verify'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

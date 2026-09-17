'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Lock, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface StripePaymentLinkValue {
  paymentLinkUrl: string;
  clicked: boolean;
  amount?: number;
  currency?: string;
  timestamp?: string;
}

export function StripePaymentLinkEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const paymentLinkUrl = String(config?.paymentLinkUrl ?? (value as StripePaymentLinkValue | undefined)?.paymentLinkUrl ?? '');
  const label = String(config?.label ?? 'Pay with Stripe');
  const amount = config?.amount != null ? Number(config.amount) : undefined;
  const currency = String(config?.currency ?? 'USD');
  const theme = String(config?.theme ?? 'light');
  const ariaLabel = String(field?.label ?? 'Stripe Payment Link');

  const current = value as StripePaymentLinkValue | undefined;
  const [clicked, setClicked] = useState(Boolean(current?.clicked));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (paymentLinkUrl && !disabled) {
      onChange({ paymentLinkUrl, clicked, ...(amount ? { amount } : {}), currency } as StripePaymentLinkValue);
    }
     
  }, [paymentLinkUrl, clicked]);

  const handleClick = () => {
    if (disabled || !paymentLinkUrl) return;
    setLoading(true);
    setClicked(true);
    onChange({
      paymentLinkUrl, clicked: true, currency, ...(amount ? { amount } : {}),
      timestamp: new Date().toISOString(),
    } as StripePaymentLinkValue);
    if (typeof window !== 'undefined') {
      window.open(paymentLinkUrl, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => setLoading(false), 600);
  };

  if (!paymentLinkUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center" aria-label={ariaLabel}>
        <CreditCard className="size-6 mx-auto text-[#635BFF]" />
        <p className="text-xs mt-2 font-semibold">No Payment Link URL configured</p>
        <p className="text-[11px] text-muted-foreground">Create a Payment Link in Stripe &amp; set <code>config.paymentLinkUrl</code>.</p>
      </div>
    );
  }

  const isStripeLink = /stripe\.com\/(?:pay|l\/)/.test(paymentLinkUrl);

  return (
    <div className="space-y-2" aria-label={ariaLabel} data-stripe-theme={theme}>
      <Button
        type="button"
        disabled={disabled || loading}
        onClick={handleClick}
        className="w-full h-11 bg-[#635BFF] hover:bg-[#5851ee] text-white font-bold text-xs gap-2 rounded-xl"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {typeof amount === 'number' ? `${label} — ${amount.toFixed(2)} ${currency}` : label}
      </Button>
      {clicked && (
        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" /> Redirected to Stripe. Complete payment in the new tab.
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> SSL Encrypted
        </span>
        <a href={paymentLinkUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="size-3" /> {isStripeLink ? 'Stripe Link' : 'Open URL'}
        </a>
      </div>
    </div>
  );
}

export default StripePaymentLinkEmbed;

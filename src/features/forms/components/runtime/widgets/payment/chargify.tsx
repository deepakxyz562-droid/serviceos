'use client';

/**
 * Chargify (Maxio) — B2B SaaS subscription billing.
 *
 * Calls /api/forms/[id]/charge which creates a Chargify subscription via
 * {subdomain}.chargify.com/subscriptions.json. If no payment profile is
 * provided, Chargify returns a hosted_signup_url — we redirect the customer
 * there to enter their card.
 *
 * When testMode is on (or apiKey/subdomain are not set), simulates.
 */
import React, { useState } from 'react';
import { Loader2, ShieldCheck, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface ChargifyValue {
  status: 'idle' | 'processing' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  subscriptionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Chargify({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const apiKey = String(config.apiKey ?? '');
  const subdomain = String(config.subdomain ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Chargify Subscription');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(apiKey) && Boolean(subdomain) && Boolean(formId);

  const handleSubscribe = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        const tx = `sim_chargify_${Date.now()}`;
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'chargify',
          transactionId: tx, subscriptionId: `sub_${tx}`, simulated: true,
        } as ChargifyValue);
      }, 800);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'chargify',
          amount, currency,
          customer: { email: customerEmail, name: customerEmail.split('@')[0] || 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: data.checkoutUrl ? 'pending_redirect' : 'succeeded',
          amount, currency, gatewayId: 'chargify',
          transactionId: data.transactionId,
          subscriptionId: data.subscriptionId,
          checkoutUrl: data.checkoutUrl,
        } as ChargifyValue);
        // If Chargify returned a hosted signup URL, redirect to it.
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        setErrorMsg(data.error || 'Subscription creation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as ChargifyValue | undefined;
  const done = currentValue?.status === 'succeeded';

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="chargify"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !apiKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>Chargify API Key</strong>. Add it in the
            inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Subscription Plan</span>
          <span className="text-xs font-bold text-emerald-600">
            {currencySymbol}{amount.toFixed(2)}<span className="text-[10px] text-muted-foreground">/mo</span>
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">B2B SaaS recurring billing via Chargify (Maxio).</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Customer Email</Label>
        <Input
          type="email"
          placeholder="customer@company.com"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          disabled={disabled}
          className="h-8 text-xs"
        />
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          Subscription created — Sub ID: {currentValue?.subscriptionId}
          {currentValue?.simulated && ' (simulated)'}
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing}
        onClick={handleSubscribe}
        className="w-full h-10 bg-[#00B0FF] hover:bg-[#0091E6] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <RefreshCw className="size-3.5" /> Subscribe ({currencySymbol}{amount.toFixed(2)}/mo)
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Subscription Billing
        </span>
        <span className="font-mono">Chargify Secure</span>
      </div>
    </div>
  );
}

export default Chargify;

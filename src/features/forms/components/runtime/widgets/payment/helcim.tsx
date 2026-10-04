'use client';

/**
 * Helcim — REAL Helcim API v2 hosted-checkout integration.
 *
 * Calls /api/forms/[id]/charge which creates a Helcim Pay checkout session
 * via api.helcim.com/v2/checkout/session. Returns a `checkoutUrl` — the
 * customer is redirected to Helcim's secure hosted payment page.
 *
 * In testMode (or when the API token is not set), falls back to a clearly
 * marked simulated-payment UI so users can preview the form without charging.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface HelcimValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function Helcim({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 119);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const apiToken = String(config.apiToken ?? config.secretKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Helcim');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'CAD' || currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(apiToken) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'helcim',
          transactionId: `sim_helcim_${Date.now()}`,
          checkoutUrl: 'https://secure.helcim.com/simulated-checkout',
          simulated: true,
        } as HelcimValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'helcim', amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'helcim',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as HelcimValue);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'Helcim payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const currentValue = value as HelcimValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="helcim"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !apiToken && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>Helcim API Token</strong>. Add it in
            the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#1e1b4b]" />
        <p className="text-xs font-semibold">Helcim Pay Hosted Checkout</p>
        <p className="text-[11px] text-muted-foreground">Canadian card processor — Visa/MC, Interac, ACH</p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Payment created — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open Helcim ↗
            </a>
          )}
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
        onClick={handlePay}
        className="w-full h-10 bg-[#1e1b4b] hover:bg-[#1a173f] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{amount.toFixed(2)} with Helcim
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS L1 • CA gateway
        </span>
        <span className="font-mono">Helcim</span>
      </div>
    </div>
  );
}

export default Helcim;

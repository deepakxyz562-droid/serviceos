'use client';

/**
 * Coinbase Commerce — REAL Coinbase Commerce API integration.
 *
 * Calls /api/forms/[id]/charge which creates a charge via the Coinbase
 * Commerce API (api.commerce.coinbase.com/charges). Returns a hosted_url —
 * the customer is redirected to Coinbase's hosted checkout page.
 *
 * After payment, Coinbase redirects back to the form and (optionally) sends
 * a webhook to /api/payments/webhook/coinbase.
 *
 * In testMode (or when apiKey is not set), falls back to a clearly marked
 * simulated-payment UI.
 */
import React, { useState } from 'react';
import { Bitcoin, Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface CoinbaseCommerceValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  chargeCode?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function CoinbaseCommerce({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 0.015);
  const currency = String(config.currency ?? 'BTC');
  const testMode = Boolean(config.testMode ?? true);
  const apiKey = String(config.apiKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Coinbase Commerce');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'BTC' ? '₿' : currency === 'ETH' ? 'Ξ' : '$';
  const canGoLive = !testMode && Boolean(apiKey) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'coinbase_commerce',
          transactionId: `sim_cb_${Date.now()}`, chargeCode: `SIM_${Date.now()}`,
          checkoutUrl: 'https://commerce.coinbase.com/charges/test',
          simulated: true,
        } as CoinbaseCommerceValue);
      }, 800);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'coinbase_commerce',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'coinbase_commerce',
          transactionId: data.transactionId, chargeCode: data.chargeCode,
          checkoutUrl: data.checkoutUrl,
        } as CoinbaseCommerceValue);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'Coinbase charge creation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const currentValue = value as CoinbaseCommerceValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="coinbase_commerce"
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
            Live mode requires a <strong>Coinbase Commerce API Key</strong>. Add it in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <Bitcoin className="size-6 mx-auto text-[#0052FF]" />
        <p className="text-xs font-semibold">Crypto Checkout</p>
        <p className="text-[11px] text-muted-foreground">Bitcoin, Ethereum, USD Coin</p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test charge created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Charge created — Code: ${currentValue?.chargeCode}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open Coinbase ↗
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
        className="w-full h-10 bg-[#0052FF] hover:bg-[#0042CC] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount} {currency}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Crypto Secured
        </span>
        <span className="font-mono">Coinbase</span>
      </div>
    </div>
  );
}

export default CoinbaseCommerce;

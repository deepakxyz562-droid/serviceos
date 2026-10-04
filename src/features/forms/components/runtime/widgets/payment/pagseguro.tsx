'use client';

/**
 * PagSeguro — REAL PagSeguro Checkout v2 integration (Brazil).
 *
 * Calls /api/forms/[id]/charge which creates a PagSeguro checkout via
 * POST https://ws.pagseguro.uol.com.br/v2/checkout (sandbox:
 * https://ws.sandbox.pagseguro.uol.com.br/v2/checkout) with `email` + `token`
 * query params and a form-encoded body. Response:
 * <checkout><code>...</code></checkout> → redirect URL
 * https://pagseguro.uol.com.br/v2/checkout/payment.html?code=<code>.
 * The widget window.location.href's to the returned checkoutUrl.
 *
 * After payment, PagSeguro redirects back to the form's redirectURL.
 *
 * In testMode (or when email/token are not set), falls back to a clearly
 * marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface PagSeguroValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function PagSeguro({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 89);
  const currency = String(config.currency ?? 'BRL');
  const testMode = Boolean(config.testMode ?? true);
  const email = String(config.email ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'PagSeguro');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'BRL' ? 'R$' : '$';
  const canGoLive = !testMode && Boolean(email) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'pagseguro',
          transactionId: `sim_pagseguro_${Date.now()}`,
          checkoutUrl: 'https://sandbox.pagseguro.uol.com.br/v2/checkout/payment.html',
          simulated: true,
        } as PagSeguroValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'pagseguro',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'pagseguro',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as PagSeguroValue);
        // Redirect to PagSeguro's hosted checkout page.
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'PagSeguro payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as PagSeguroValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="pagseguro"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !email && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>PagSeguro account email</strong> and token.
            Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#ffcc00]" />
        <p className="text-xs font-semibold">PagSeguro Checkout</p>
        <p className="text-[11px] text-muted-foreground">
          Cards, boleto, Pix, UOL wallet, installment payments.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Redirecting to PagSeguro — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open PagSeguro ↗
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
        className="w-full h-10 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pagar {amount.toFixed(2)} {currency} com PagSeguro
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> SSL Encrypted
        </span>
        <span className="font-mono">PagSeguro BR</span>
      </div>
    </div>
  );
}

export default PagSeguro;

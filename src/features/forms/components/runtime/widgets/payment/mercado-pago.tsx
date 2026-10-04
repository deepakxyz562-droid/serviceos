'use client';

/**
 * Mercado Pago — REAL Mercado Pago Checkout Pro integration.
 *
 * Calls /api/forms/[id]/charge which creates a Mercado Pago preference via
 * POST https://api.mercadopago.com/checkout/preferences (with Bearer access
 * token). Returns { init_point } (live) or { sandbox_init_point } (test) →
 * checkoutUrl the widget window.location.href's to.
 *
 * After payment, Mercado Pago redirects back to the form's back_urls.success.
 *
 * In testMode (or when accessToken is not set), falls back to a clearly marked
 * simulated-payment UI.
 */
import React, { useState } from 'react';
import { ExternalLink, Loader2, ShieldCheck, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface MercadoPagoValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  checkoutUrl?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function MercadoPago({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 149);
  const currency = String(config.currency ?? 'MXN');
  const testMode = Boolean(config.testMode ?? true);
  const publicKey = String(config.publicKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Mercado Pago');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'MXN' ? '$' : currency === 'ARS' ? '$' : currency === 'COP' ? '$' : '$';
  const canGoLive = !testMode && Boolean(publicKey) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'mercado_pago',
          transactionId: `sim_mp_${Date.now()}`,
          checkoutUrl: 'https://www.mercadopago.com/checkout/sandbox',
          simulated: true,
        } as MercadoPagoValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'mercado_pago',
          amount, currency,
          customer: { name: 'Customer' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.checkoutUrl) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'mercado_pago',
          transactionId: data.transactionId, checkoutUrl: data.checkoutUrl,
        } as MercadoPagoValue);
        // Redirect to Mercado Pago's hosted Checkout Pro.
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || 'Mercado Pago payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as MercadoPagoValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="mercado_pago"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !publicKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>Mercado Pago Access Token</strong>.
            Add it in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center space-y-1">
        <ExternalLink className="size-6 mx-auto text-[#009ee3]" />
        <p className="text-xs font-semibold">Mercado Pago Checkout Pro</p>
        <p className="text-[11px] text-muted-foreground">
          Cards, Pix, OXXO, PSE, Mercado Pago wallet, installment payments.
        </p>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Payment created — Ref: ${currentValue?.transactionId}`}
          {currentValue?.checkoutUrl && !currentValue?.simulated && (
            <a href={currentValue.checkoutUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
              Open Mercado Pago ↗
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
        className="w-full h-10 bg-[#009ee3] hover:bg-[#0089c2] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pagar {amount.toFixed(2)} {currency} con Mercado Pago
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> SSL Encrypted
        </span>
        <span className="font-mono">MercadoPago</span>
      </div>
    </div>
  );
}

export default MercadoPago;

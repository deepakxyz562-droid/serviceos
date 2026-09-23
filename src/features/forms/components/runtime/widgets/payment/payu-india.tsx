'use client';

/**
 * PayU India — REAL PayU redirect integration.
 *
 * Calls /api/forms/[id]/charge which generates the SHA-512 hash and
 * returns redirect params. The frontend builds a hidden form and POSTs
 * to secure.payu.in/_payment (or test.payu.in for sandbox).
 *
 * After payment, PayU redirects to surl (success) or furl (failure).
 *
 * In testMode (or when merchantKey/merchantSalt are not set), falls back
 * to a clearly marked simulated-payment UI.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface PayUValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function PayUIndia({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 499);
  const currency = String(config.currency ?? 'INR');
  const testMode = Boolean(config.testMode ?? true);
  const merchantKey = String(config.merchantKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'PayU India');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = '₹';
  const canGoLive = !testMode && Boolean(merchantKey) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'payu_india',
          transactionId: `sim_payu_${Date.now()}`, simulated: true,
        } as PayUValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'payu_india',
          amount, currency,
          customer: { name: 'Customer', email: '' },
        }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.redirect) {
        onChange({
          status: 'pending_redirect', amount, currency, gatewayId: 'payu_india',
          transactionId: data.transactionId,
        } as PayUValue);
        // Build a hidden form and POST to PayU.
        const form = document.createElement('form');
        form.method = data.redirect.method;
        form.action = data.redirect.url;
        for (const [key, val] of Object.entries(data.redirect.params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(val);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        setErrorMsg(data.error || 'PayU payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    }
  };

  const currentValue = value as PayUValue | undefined;
  const done = currentValue?.status === 'pending_redirect' && currentValue.transactionId;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="payu_india"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !merchantKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires <strong>PayU Merchant Key + Salt</strong>.
            Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1 text-[9px] text-center text-muted-foreground">
        <div className="p-1 rounded bg-muted/40">UPI</div>
        <div className="p-1 rounded bg-muted/40">Cards</div>
        <div className="p-1 rounded bg-muted/40">NetBanking</div>
        <div className="p-1 rounded bg-muted/40">Wallets</div>
      </div>

      {done && (
        <div className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800/60">
          {currentValue?.simulated
            ? `Test payment created — Ref: ${currentValue?.transactionId} (no real charge)`
            : `Redirecting to PayU — Ref: ${currentValue?.transactionId}`}
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
        className="w-full h-10 bg-[#0A2540] hover:bg-[#081a30] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {currencySymbol}{amount.toFixed(2)} via PayU
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> PCI-DSS L1
        </span>
        <span className="font-mono">PayU India</span>
      </div>
    </div>
  );
}

export default PayUIndia;

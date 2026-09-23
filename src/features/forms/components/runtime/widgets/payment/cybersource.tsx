'use client';

/**
 * CyberSource — REAL Secure Acceptance redirect integration.
 *
 * Calls /api/forms/[id]/charge which generates the HMAC-SHA256 signed form
 * data. The frontend builds a hidden form and POSTs to CyberSource's Secure
 * Acceptance endpoint. On return, CyberSource redirects back with the
 * payment result.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface CyberSourceValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

export function CyberSource({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const merchantId = String(config.merchantId ?? '');
  const apiKeyId = String(config.apiKeyId ?? '');
  const sharedSecret = String(config.sharedSecret ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'CyberSource');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(merchantId) && Boolean(apiKeyId) && Boolean(sharedSecret) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'cybersource', transactionId: `sim_cs_${Date.now()}`, simulated: true } as CyberSourceValue);
      }, 700);
      return;
    }

    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId: 'cybersource', amount, currency, customer: { name: 'Customer' } }),
      });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.redirect) {
        onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'cybersource', transactionId: data.transactionId } as CyberSourceValue);
        const form = document.createElement('form');
        form.method = data.redirect.method;
        form.action = data.redirect.url;
        for (const [key, val] of Object.entries(data.redirect.params)) {
          const input = document.createElement('input');
          input.type = 'hidden'; input.name = key; input.value = String(val);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        setErrorMsg(data.error || 'CyberSource payment initiation failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader gatewayId="cybersource" amount={amount} currency={currency} currencySymbol={currencySymbol} testMode={testMode || !canGoLive} label={label} />
      {!testMode && !canGoLive && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">Live mode requires <strong>CyberSource Merchant ID, API Key ID, and Shared Secret</strong>.</p>
        </div>
      )}
      {errorMsg && <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="size-3" /> {errorMsg}</p>}
      <Button type="button" disabled={disabled || processing} onClick={handlePay} className="w-full h-10 bg-[#1A1F71] hover:bg-[#151A5C] text-white font-bold text-xs rounded-xl gap-1.5">
        {processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}
      </Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Secure Acceptance</span>
        <span className="font-mono">CyberSource</span>
      </div>
    </div>
  );
}
export default CyberSource;

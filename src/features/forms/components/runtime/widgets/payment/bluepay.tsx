'use client';

/**
 * BluePay — REAL redirect with TAMPER_PROOF_SEAL.
 * Calls /api/forms/[id]/charge which generates the SHA-512 TPS hash.
 * Frontend builds a hidden form and POSTs to BluePay's bp20emu endpoint.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface BluePayValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number; currency: string; gatewayId: string;
  transactionId?: string; simulated?: boolean; errorMessage?: string;
}

export function BluePay({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const accountId = String(config.accountId ?? '');
  const secretKey = String(config.secretKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'BluePay');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(accountId) && Boolean(secretKey) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true); setErrorMsg(null);
    if (testMode || !canGoLive) {
      setTimeout(() => { setProcessing(false); onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'bluepay', transactionId: `sim_bp_${Date.now()}`, simulated: true } as BluePayValue); }, 700);
      return;
    }
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayId: 'bluepay', amount, currency, customer: { name: 'Customer' } }) });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.redirect) {
        onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'bluepay', transactionId: data.transactionId } as BluePayValue);
        const form = document.createElement('form');
        form.method = data.redirect.method; form.action = data.redirect.url;
        for (const [key, val] of Object.entries(data.redirect.params)) { const input = document.createElement('input'); input.type = 'hidden'; input.name = key; input.value = String(val); form.appendChild(input); }
        document.body.appendChild(form); form.submit();
      } else { setErrorMsg(data.error || 'BluePay payment initiation failed.'); }
    } catch (e: unknown) { setProcessing(false); setErrorMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader gatewayId="bluepay" amount={amount} currency={currency} currencySymbol={currencySymbol} testMode={testMode || !canGoLive} label={label} />
      {!testMode && !canGoLive && (<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2"><AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /><p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">Live mode requires <strong>BluePay Account ID and Secret Key</strong>.</p></div>)}
      {errorMsg && <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="size-3" /> {errorMsg}</p>}
      <Button type="button" disabled={disabled || processing} onClick={handlePay} className="w-full h-10 bg-[#00539B] hover:bg-[#004A8A] text-white font-bold text-xs rounded-xl gap-1.5">{processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}</Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> TPS Protected</span><span className="font-mono">BluePay</span></div>
    </div>
  );
}
export default BluePay;

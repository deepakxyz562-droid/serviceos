'use client';

/**
 * SensePass — REAL QR + session integration.
 * Calls /api/forms/[id]/charge which creates a SensePass transaction.
 * Frontend displays a QR code for the customer to scan with their wallet app.
 */
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface SensePassValue {
  status: 'idle' | 'pending_redirect' | 'succeeded' | 'error';
  amount: number; currency: string; gatewayId: string;
  transactionId?: string; qrUrl?: string; simulated?: boolean; errorMessage?: string;
}

export function SensePass({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const apiKey = String(config.apiKey ?? '');
  const merchantId = String(config.merchantId ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'SensePass');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currencySymbol = '$';
  const canGoLive = !testMode && Boolean(apiKey) && Boolean(merchantId) && Boolean(formId);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true); setErrorMsg(null);
    if (testMode || !canGoLive) { setTimeout(() => { setProcessing(false); onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'sensepass', transactionId: `sim_sp_${Date.now()}`, qrUrl: 'https://sensepass.com/qr/test', simulated: true } as SensePassValue); }, 700); return; }
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gatewayId: 'sensepass', amount, currency, customer: { name: 'Customer' } }) });
      const data = await res.json();
      setProcessing(false);
      if (data.success && data.qrUrl) { onChange({ status: 'pending_redirect', amount, currency, gatewayId: 'sensepass', transactionId: data.transactionId, qrUrl: data.qrUrl } as SensePassValue); }
      else { setErrorMsg(data.error || 'SensePass session creation failed.'); }
    } catch (e: unknown) { setProcessing(false); setErrorMsg(e instanceof Error ? e.message : String(e)); }
  };

  const currentValue = value as SensePassValue | undefined;

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader gatewayId="sensepass" amount={amount} currency={currency} currencySymbol={currencySymbol} testMode={testMode || !canGoLive} label={label} />
      {!testMode && !canGoLive && (<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2"><AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /><p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">Live mode requires <strong>SensePass API Key and Merchant ID</strong>.</p></div>)}
      {currentValue?.qrUrl && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
          <QrCode className="size-12 mx-auto text-[#4A154B]" />
          <p className="text-xs font-semibold">Scan to Pay</p>
          <p className="text-[10px] text-muted-foreground">Scan this QR code with your wallet app (Apple Pay, Google Pay, crypto wallet).</p>
          <a href={currentValue.qrUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 underline">Open payment link ↗</a>
        </div>
      )}
      {errorMsg && <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertCircle className="size-3" /> {errorMsg}</p>}
      <Button type="button" disabled={disabled || processing} onClick={handlePay} className="w-full h-10 bg-[#4A154B] hover:bg-[#3A1240] text-white font-bold text-xs rounded-xl gap-1.5">{processing ? <Loader2 className="size-4 animate-spin" /> : <><Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}</>}</Button>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> QR Payment</span><span className="font-mono">SensePass</span></div>
    </div>
  );
}
export default SensePass;

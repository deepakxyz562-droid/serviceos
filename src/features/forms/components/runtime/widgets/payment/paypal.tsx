'use client';

/**
 * PayPal Commerce — REAL PayPal SDK integration.
 *
 * Loads the PayPal JS SDK with the user's clientId, renders Smart Buttons
 * via window.paypal.Buttons(), and captures the order on approval.
 *
 * In testMode (or when clientId is not set), falls back to a clearly marked
 * simulated-payment UI so users can preview the form.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface PayPalValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  orderId?: string;
  payerId?: string;
  simulated?: boolean;
  errorMessage?: string;
}

interface PayPalButtonsInstance {
  render: (el: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}
interface PayPalSDK {
  Buttons: (cfg: {
    createOrder: (data: unknown, actions: { order: { create: (opts: unknown) => Promise<string> } }) => Promise<string>;
    onApprove: (data: { orderID: string }, actions: { order: { capture: () => Promise<unknown> } }) => Promise<void>;
    onError: (err: unknown) => void;
  }) => PayPalButtonsInstance;
}
declare global {
  interface Window { paypal?: PayPalSDK }
}

export function PayPal({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const clientId = String(config.clientId ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'PayPal');
  const [sdkReady, setSdkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const buttonsContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonsInstanceRef = useRef<PayPalButtonsInstance | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$';
  const canGoLive = !testMode && Boolean(clientId) && Boolean(formId);

  // Load PayPal SDK.
  useEffect(() => {
    if (!canGoLive || typeof window === 'undefined') return;
    if (window.paypal) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    s.async = true;
    s.onload = () => setSdkReady(true);
    s.onerror = () => setErrorMsg('Failed to load PayPal SDK. Check your network connection.');
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [canGoLive, clientId, currency]);

  // Render PayPal Smart Buttons when SDK is ready.
  useEffect(() => {
    if (!sdkReady || !window.paypal || !buttonsContainerRef.current) return;
    try {
      buttonsInstanceRef.current = window.paypal.Buttons({
        createOrder: async (_data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: { value: amount.toFixed(2), currency_code: currency },
              description: `Form payment - ${formId}`,
            }],
          });
        },
        onApprove: async (data, actions) => {
          await actions.order.capture();
          setProcessing(false);
          onChange({
            status: 'succeeded', amount, currency, gatewayId: 'paypal_complete',
            orderId: data.orderID, payerId: data.payerId,
          } as PayPalValue);
        },
        onError: (err: unknown) => {
          setProcessing(false);
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg(msg);
          onChange({ status: 'error', amount, currency, gatewayId: 'paypal_complete', errorMessage: msg } as PayPalValue);
        },
      });
      buttonsInstanceRef.current.render(buttonsContainerRef.current);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const id = window.setTimeout(() => setErrorMsg(`PayPal SDK error: ${msg}`), 0);
      return () => window.clearTimeout(id);
    }
    return () => {
      if (buttonsInstanceRef.current) {
        buttonsInstanceRef.current.close().catch(() => { /* noop */ });
        buttonsInstanceRef.current = null;
      }
    };
  }, [sdkReady, amount, currency, formId, onChange]);

  const handleSimulatedPay = () => {
    if (disabled) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onChange({
        status: 'succeeded', amount, currency, gatewayId: 'paypal_complete',
        orderId: `sim_paypal_${Date.now()}`, simulated: true,
      } as PayPalValue);
    }, 900);
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="paypal_complete"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !clientId && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires a <strong>PayPal Client ID</strong>. Add it in the
            inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      {canGoLive && sdkReady ? (
        <div ref={buttonsContainerRef} className="min-h-[50px]" />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <Sparkles className="size-5 mx-auto text-[#003087]" />
          <p className="text-xs font-semibold">
            {testMode
              ? 'Test mode: PayPal Smart Buttons will load here when you switch to Live.'
              : 'Loading PayPal Smart Buttons…'}
          </p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      {(testMode || !canGoLive) && (
        <Button
          type="button"
          disabled={disabled || processing}
          onClick={handleSimulatedPay}
          className="w-full h-11 bg-[#FFC439] hover:bg-[#F4B400] text-[#003087] font-black text-xs rounded-xl gap-2"
        >
          {processing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <span>Pay with PayPal — {amount.toFixed(2)} {currency}</span>
          )}
        </Button>
      )}

      <div className="text-center text-[10px] text-muted-foreground">
        Or split into 4 interest-free payments of <strong>{(amount / 4).toFixed(2)} {currency}</strong> with Pay Later.
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-600" /> Buyer Protection</span>
        <span className="font-mono">PayPal Secure</span>
      </div>
    </div>
  );
}

export default PayPal;

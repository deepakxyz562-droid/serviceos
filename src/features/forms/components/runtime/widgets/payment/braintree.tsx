'use client';

/**
 * Braintree — REAL Braintree Web SDK + Hosted Fields integration.
 *
 * Loads the Braintree Web SDK from CDN, fetches a client token from the
 * backend (/api/forms/[id]/charge), initializes Hosted Fields in a secure
 * iframe, tokenizes card details on Pay, and submits the nonce to the
 * backend for transaction.sale.
 *
 * PCI-DSS compliant — card details never touch our form. They go directly
 * to Braintree's secure iframe.
 *
 * In testMode (or when credentials are not set), falls back to a clearly
 * marked simulated-payment UI.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentGatewayHeader } from './payment-gateway-header';
import type { WidgetProps } from '../widget-props';

interface BraintreeValue {
  status: 'idle' | 'processing' | 'succeeded' | 'error';
  amount: number;
  currency: string;
  gatewayId: string;
  transactionId?: string;
  nonce?: string;
  last4?: string;
  cardType?: string;
  simulated?: boolean;
  errorMessage?: string;
}

// Braintree Web SDK types (minimal surface for our usage).
interface BraintreeClient {
  create: (opts: { authorization: string }) => Promise<BraintreeClientInstance>;
}
interface BraintreeHostedFields {
  create: (opts: {
    client: BraintreeClientInstance;
    fields: Record<string, { selector: string; placeholder?: string }>;
    styles?: Record<string, unknown>;
  }) => Promise<HostedFieldsInstance>;
}
interface BraintreeClientInstance {
  request: (opts: unknown) => Promise<unknown>;
}
interface HostedFieldsInstance {
  tokenize: () => Promise<{ nonce: string; details: { lastFour?: string; cardType?: string } }>;
  teardown: () => Promise<void>;
  on: (event: string, cb: (event: unknown) => void) => void;
  getState: () => { cards: Array<{ type: string }> };
}
interface BraintreeSDK {
  client: BraintreeClient;
  hostedFields: BraintreeHostedFields;
}
declare global {
  interface Window { braintree?: BraintreeSDK }
}

export function Braintree({ value, onChange, config, disabled, field }: WidgetProps) {
  const amount = Number(config.amount ?? 49);
  const currency = String(config.currency ?? 'USD');
  const testMode = Boolean(config.testMode ?? true);
  const merchantId = String(config.merchantId ?? '');
  const publicKey = String(config.publicKey ?? '');
  const privateKey = String(config.privateKey ?? '');
  const formId = String((field as Record<string, unknown> | undefined)?.formId ?? '');
  const label = String(field?.label ?? 'Braintree');

  const [sdkReady, setSdkReady] = useState(false);
  const [fieldsReady, setFieldsReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<BraintreeClientInstance | null>(null);
  const hostedFieldsRef = useRef<HostedFieldsInstance | null>(null);
  const clientTokenRef = useRef<string | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const canGoLive = !testMode && Boolean(merchantId) && Boolean(publicKey) && Boolean(privateKey) && Boolean(formId);

  // Fetch client token from backend when going live.
  const fetchClientToken = useCallback(async () => {
    if (!canGoLive || clientTokenRef.current) return;
    try {
      const res = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId: 'braintree', amount, currency, customer: { name: 'Customer' } }),
      });
      const data = await res.json();
      if (data.success && data.clientToken) {
        clientTokenRef.current = data.clientToken;
      } else {
        setErrorMsg(data.error || 'Failed to get Braintree client token.');
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [canGoLive, formId, amount, currency]);

  // Load Braintree Web SDK from CDN.
  useEffect(() => {
    if (!canGoLive || typeof window === 'undefined') return;
    if (window.braintree) {
      const id = window.setTimeout(() => setSdkReady(true), 0);
      return () => window.clearTimeout(id);
    }
    const s = document.createElement('script');
    s.src = 'https://js.braintreegateway.com/web/3.103.0/js/client/hosted-fields.js';
    s.async = true;
    s.onload = () => {
      if (window.braintree) setSdkReady(true);
    };
    s.onerror = () => setErrorMsg('Failed to load Braintree Web SDK.');
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [canGoLive]);

  // Initialize Hosted Fields once SDK + client token + DOM ref are ready.
  useEffect(() => {
    if (!sdkReady || !clientTokenRef.current || !cardRef.current || hostedFieldsRef.current) return;
    if (!window.braintree) return;

    (async () => {
      try {
        const client = await window.braintree!.client.create({ authorization: clientTokenRef.current! });
        clientRef.current = client;
        const hf = await window.braintree!.hostedFields.create({
          client,
          fields: {
            number: { selector: '#bt-card-number', placeholder: '4111 1111 1111 1111' },
            cvv: { selector: '#bt-cvv', placeholder: '123' },
            expirationDate: { selector: '#bt-expiration', placeholder: 'MM/YY' },
          },
          styles: {
            input: { 'font-size': '14px', 'font-family': 'monospace' },
          },
        });
        hostedFieldsRef.current = hf;
        hf.on('cardTypeChange', () => {});
        const id = window.setTimeout(() => setFieldsReady(true), 0);
        return () => window.clearTimeout(id);
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Braintree Hosted Fields init failed.');
      }
    })();

    return () => {
      if (hostedFieldsRef.current) {
        hostedFieldsRef.current.teardown().catch(() => {});
        hostedFieldsRef.current = null;
      }
      setFieldsReady(false);
    };
  }, [sdkReady]);

  // Fetch client token after SDK loads.
  useEffect(() => {
    if (sdkReady) {
      const id = window.setTimeout(() => { void fetchClientToken(); }, 0);
      return () => window.clearTimeout(id);
    }
  }, [sdkReady, fetchClientToken]);

  const handlePay = async () => {
    if (disabled) return;
    setProcessing(true);
    setErrorMsg(null);

    // Test mode — simulate.
    if (testMode || !canGoLive) {
      setTimeout(() => {
        setProcessing(false);
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'braintree',
          transactionId: `sim_bt_${Date.now()}`, nonce: `fake_nonce_${Date.now()}`,
          last4: '1111', cardType: 'Visa', simulated: true,
        } as BraintreeValue);
      }, 900);
      return;
    }

    if (!hostedFieldsRef.current) {
      setProcessing(false);
      setErrorMsg('Braintree card form not ready. Please wait a moment.');
      return;
    }

    try {
      // Tokenize card details via Braintree Hosted Fields.
      const result = await hostedFieldsRef.current.tokenize();
      // Submit the nonce to the backend for transaction.sale.
      const chargeRes = await fetch(`/api/forms/${formId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: 'braintree', amount, currency,
          paymentMethodId: result.nonce,
          customer: { name: 'Customer' },
        }),
      });
      const data = await chargeRes.json();
      setProcessing(false);
      if (data.success) {
        onChange({
          status: 'succeeded', amount, currency, gatewayId: 'braintree',
          transactionId: data.transactionId, nonce: result.nonce,
          last4: result.details?.lastFour, cardType: result.details?.cardType,
        } as BraintreeValue);
      } else {
        setErrorMsg(data.error || 'Braintree payment failed.');
      }
    } catch (e: unknown) {
      setProcessing(false);
      setErrorMsg(e instanceof Error ? e.message : 'Tokenization failed.');
    }
  };

  return (
    <div className="space-y-3" aria-label={label}>
      <PaymentGatewayHeader
        gatewayId="braintree"
        amount={amount}
        currency={currency}
        currencySymbol={currencySymbol}
        testMode={testMode || !canGoLive}
        label={label}
      />

      {!testMode && !canGoLive && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-2">
          <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
            Live mode requires <strong>Braintree Merchant ID, Public Key, and Private Key</strong>.
            Add them in the inspector under <em>API Credentials</em>.
          </p>
        </div>
      )}

      {/* PCI-DSS reassurance */}
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-start gap-2">
        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-tight">
          <strong>PCI-DSS Compliant.</strong> Card details are hosted by Braintree
          Hosted Fields in a secure iframe. The form and backend never see the raw card number.
        </p>
      </div>

      {/* Card form — either Braintree Hosted Fields iframe or test-mode placeholder */}
      {canGoLive && fieldsReady ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Card Number</label>
            <div id="bt-card-number" className="min-h-[36px] rounded-md border border-border bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Expiration</label>
              <div id="bt-expiration" className="min-h-[36px] rounded-md border border-border bg-background" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">CVC</label>
              <div id="bt-cvv" className="min-h-[36px] rounded-md border border-border bg-background" />
            </div>
          </div>
        </div>
      ) : canGoLive && sdkReady ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <CreditCard className="size-5 mx-auto text-[#1A6B6B]" />
          <p className="text-xs font-semibold">Loading Braintree Hosted Fields…</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center space-y-1">
          <CreditCard className="size-5 mx-auto text-[#1A6B6B]" />
          <p className="text-xs font-semibold">
            {testMode
              ? 'Test mode: Braintree Hosted Fields will load here when you switch to Live.'
              : 'Add Braintree API credentials in the inspector to enable live payments.'}
          </p>
          <p className="text-[11px] text-muted-foreground">Amount: {amount.toFixed(2)} {currency}</p>
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="size-3" /> {errorMsg}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || processing || (canGoLive && !fieldsReady)}
        onClick={handlePay}
        className="w-full h-10 bg-[#1A6B6B] hover:bg-[#155A5A] text-white font-bold text-xs rounded-xl gap-1.5"
      >
        {processing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Lock className="size-3.5" /> Pay {amount.toFixed(2)} {currency}
          </>
        )}
      </Button>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3 text-emerald-600" /> Hosted Fields
        </span>
        <span className="font-mono">Braintree</span>
      </div>
    </div>
  );
}

export default Braintree;

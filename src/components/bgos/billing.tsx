'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';

type BgosEntitlement = {
  entitled: boolean;
  isTrial: boolean;
  isPaid: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
  status: string;
  plan: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

type Billing = {
  subscription: {
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    legacy: boolean;
    currentPeriodEnd: string | null;
  };
  entitlement?: BgosEntitlement;
  defaultRegion?: 'india' | 'international';
  usage: {
    contacts: number;
    forms: number;
    usedLeadCredits: number;
    leadCreditLimit: number;
  };
  portalEnabled: boolean;
  plans: {
    code: string;
    name: string;
    priceInr: number;
    priceUsd?: number;
    features: string[];
    checkoutEnabled: boolean;
  }[];
  gateways?: {
    razorpay: boolean;
    creem: boolean;
  };
};

const USD_PRICES: Record<string, number> = {
  free: 0,
  starter: 9,
  growth: 29,
  business: 79,
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BgosBilling() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [region, setRegion] = useState<'india' | 'international'>('india');
  const regionInitializedRef = useRef(false);

  const query = useQuery({
    queryKey: ['bgos', 'billing'],
    queryFn: async (): Promise<Billing> => {
      const res = await authFetch('/api/bgos/billing');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
  });

  useEffect(() => {
    if (!regionInitializedRef.current && query.data?.defaultRegion) {
      regionInitializedRef.current = true;
      setRegion(query.data.defaultRegion);
    }
  }, [query.data?.defaultRegion]);

  const refetchBilling = query.refetch;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const creemStatus = params.get('creem');
    const razorpayStatus = params.get('razorpay');

    if (creemStatus === 'success' || razorpayStatus === 'success') {
      toast.success('Payment received! Refreshing your subscription status…');
      void refetchBilling().then(() => {
        window.dispatchEvent(new Event('bgos:billing-updated'));
      });
      params.delete('creem');
      params.delete('razorpay');
      params.delete('plan');
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    } else if (creemStatus === 'cancelled') {
      toast.info('Creem checkout was cancelled.');
      params.delete('creem');
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [refetchBilling]);

  async function handleCheckout(planCode: string) {
    setBusy(true);
    setError('');

    try {
      const chosenGateway = region === 'india' ? 'razorpay' : 'creem';

      const res = await authFetch('/api/bgos/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planCode,
          gateway: chosenGateway,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout initialization failed');

      // ── 1. Razorpay standard modal checkout (India) ────────────────────────
      if (data.gateway === 'razorpay' && data.order_id) {
        const scriptOk = await loadRazorpayScript();
        if (!scriptOk) {
          throw new Error('Could not load Razorpay checkout script.');
        }

        const options = {
          key: data.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TuLATkapPzzHZc',
          amount: data.amount,
          currency: data.currency || 'INR',
          name: 'BGOS / FieserOS',
          description: `${data.planName || planCode} Plan Subscription`,
          order_id: data.order_id,
          theme: { color: '#009F50' },
          modal: {
            ondismiss: () => {
              setBusy(false);
              toast.info('Razorpay payment cancelled');
            },
          },
          handler: async (response: any) => {
            try {
              const verifyRes = await authFetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planCode,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                toast.success('Payment verified! Plan activated successfully.');
                await query.refetch();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('bgos:billing-updated'));
                }
              } else {
                toast.error(verifyData.error || 'Payment verification failed');
              }
            } catch (err: any) {
              toast.error(err?.message || 'Verification network error');
            } finally {
              setBusy(false);
            }
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.open();
        return;
      }

      // ── 2. Creem International Checkout redirect ───────────────────────────
      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      // ── 3. Direct local dev activation response ────────────────────────────
      if (data.activated || data.success) {
        toast.success(data.message || 'Plan activated successfully!');
        await query.refetch();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('bgos:billing-updated'));
        }
        setBusy(false);
        return;
      }

      throw new Error('Unexpected billing response.');
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
      setBusy(false);
    }
  }

  const sub = query.data?.subscription;
  const ent = query.data?.entitlement;
  const isTrial = ent ? ent.isTrial : sub?.status === 'trial';
  const trialExpired = ent ? ent.trialExpired : false;
  const isPaid = ent ? ent.isPaid : sub?.status === 'active' && sub?.plan !== 'free';
  const trialDaysLeft = ent
    ? ent.trialDaysLeft
    : sub?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  return (
    <div className="w-full space-y-6 p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace / Plan & usage
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Room for your next stage.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {region === 'india'
              ? 'Monthly plans in INR (₹) via Razorpay. UPI, Netbanking & Cards accepted.'
              : 'Monthly plans in USD ($) via Creem. Global Cards, Apple Pay & Google Pay accepted.'}
          </p>
        </div>

        {/* Currency & Gateway Region Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-border">
          <button
            type="button"
            onClick={() => setRegion('india')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              region === 'india'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>🇮🇳</span>
            <span>India (Razorpay · ₹)</span>
          </button>
          <button
            type="button"
            onClick={() => setRegion('international')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              region === 'international'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="size-3.5" />
            <span>International (Creem · $)</span>
          </button>
        </div>
      </header>

      {query.isPending && <p role="status">Loading subscription…</p>}

      {(error || query.error) && (
        <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
          {error || query.error?.message}
          <Button variant="outline" className="ml-3" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {query.data && (
        <>
          {trialExpired && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 p-4 text-sm text-rose-900 dark:text-rose-100"
            >
              <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Your 7-day free trial has ended</p>
                <p className="text-xs mt-0.5 text-rose-800 dark:text-rose-200">
                  Complete payment using Razorpay (India · ₹) or Creem (International · $) below to unlock all BGOS features.
                </p>
              </div>
            </div>
          )}

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-6 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">Current plan: {sub?.plan?.toUpperCase()}</h2>
                {isTrial && (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/30">
                    7-Day Trial · {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining
                  </span>
                )}
                {trialExpired && (
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 border border-rose-500/30">
                    Trial Expired · Payment Required
                  </span>
                )}
                {isPaid && (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                    Active Paid Plan
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {sub?.status} · {query.data.usage.contacts} contacts · {query.data.usage.forms} active forms ·{' '}
                {query.data.usage.usedLeadCredits}/{query.data.usage.leadCreditLimit} lead credits used
              </p>
              {sub?.currentPeriodEnd && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current period ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {query.data.plans.map((plan) => {
              const inrPrice = plan.priceInr;
              const usdPrice = plan.priceUsd ?? USD_PRICES[plan.code] ?? Math.round(inrPrice / 50);
              const isCurrentPaid = isPaid && sub?.plan === plan.code;
              const isGatewayReady =
                region === 'india'
                  ? query.data.gateways?.razorpay !== false
                  : query.data.gateways?.creem !== false;

              return (
                <div key={plan.code} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">{plan.name}</h2>
                    {plan.code === 'growth' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className="mt-5 text-3xl font-semibold tracking-tight">
                    {region === 'india' ? (
                      <>
                        ₹{inrPrice.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-muted-foreground"> / month</span>
                      </>
                    ) : (
                      <>
                        ${usdPrice}
                        <span className="text-xs font-normal text-muted-foreground"> USD / month</span>
                      </>
                    )}
                  </p>

                  <p className="text-[11px] text-muted-foreground mt-1">
                    {region === 'india' ? 'Via Razorpay (UPI, Cards)' : 'Via Creem (Cards, Apple Pay)'}
                  </p>

                  <ul className="my-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    disabled={busy || !plan.checkoutEnabled || !isGatewayReady || isCurrentPaid || plan.code === 'free'}
                    variant={plan.code === 'growth' ? 'default' : 'outline'}
                    className={plan.code === 'growth' ? 'bg-[#009F50] hover:bg-[#008A45] text-white font-bold' : ''}
                    onClick={() => handleCheckout(plan.code)}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isCurrentPaid ? (
                      'Current active plan'
                    ) : plan.code === 'free' ? (
                      'Included in 7-day trial'
                    ) : !isGatewayReady ? (
                      `${region === 'india' ? 'Razorpay' : 'Creem'} not configured`
                    ) : (
                      `Pay with ${region === 'india' ? `Razorpay (₹${inrPrice})` : `Creem ($${usdPrice})`}`
                    )}
                  </Button>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

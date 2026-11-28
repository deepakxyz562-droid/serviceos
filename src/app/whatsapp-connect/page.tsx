'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Lock,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import { WhatsAppEmbeddedSignupButton } from '@/components/whatsapp/whatsapp-embedded-signup-button';
import { authHeaders } from '@/lib/client-auth';

type HandoffExchangeResult = {
  ok: boolean;
  status?: number;
  token?: string | null;
};

// Deduplicate ticket-to-session exchange across React StrictMode remounts
const handoffExchangePromises = new Map<string, Promise<HandoffExchangeResult>>();

function exchangeMobileHandoffTicket(ticket: string): Promise<HandoffExchangeResult> {
  const existing = handoffExchangePromises.get(ticket);
  if (existing) return existing;

  const promise = fetch('/api/bgos/mobile-auth/handoff', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ticket }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      return {
        ok: res.ok,
        status: res.status,
        token: typeof data?.token === 'string' && data.token ? data.token : null,
      };
    })
    .catch(() => ({ ok: false }));

  handoffExchangePromises.set(ticket, promise);
  return promise;
}

type AuthGateState = 'checking' | 'authenticated' | 'unauthenticated' | 'customer_forbidden';

function WhatsAppConnectContent() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get('ticket') || '';
  const clientParam = searchParams.get('client') || '';
  const rawReturnUrl = searchParams.get('returnUrl') || '';
  const isMobileClient = clientParam === 'mobile' || rawReturnUrl.startsWith('bgos://');
  const returnUrl = rawReturnUrl || (isMobileClient ? 'bgos://gbp-callback' : '');
  const nextPath = searchParams.get('next') || '/integrations';

  const handoffTokenRef = useRef<string | null>(null);
  const [handoffToken, setHandoffToken] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthGateState>('checking');
  const [ticketExpired, setTicketExpired] = useState(false);
  const [mode, setMode] = useState<'coexistence' | 'cloud_api'>('coexistence');
  const [showPersonalGuide, setShowPersonalGuide] = useState(false);
  const [configMeta, setConfigMeta] = useState<{
    metaAppId?: string | null;
    embeddedConfigId?: string | null;
    isConfigured?: boolean;
    displayPhoneNumber?: string | null;
    source?: string;
  }>({});
  const [connectedResult, setConnectedResult] = useState<{
    phoneNumberId: string;
    wabaId: string;
    displayPhoneNumber?: string;
    coexistenceMode?: boolean;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loginHref = useMemo(() => {
    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete('ticket');
    const query = cleanParams.toString();
    const target = query ? `/whatsapp-connect?${query}` : '/whatsapp-connect';
    return `/?auth=login&returnUrl=${encodeURIComponent(target)}`;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function verifySessionAndLoadConfig() {
      setAuthState((prev) => (prev === 'authenticated' ? prev : 'checking'));
      setTicketExpired(false);

      if (ticket) {
        const exchange = await exchangeMobileHandoffTicket(ticket);
        if (cancelled) return;
        if (exchange.status === 403) {
          setAuthState('customer_forbidden');
          return;
        }
        if (!exchange.ok) {
          setTicketExpired(true);
        } else {
          if (exchange.token) {
            handoffTokenRef.current = exchange.token;
            setHandoffToken(exchange.token);
          }
          if (typeof window !== 'undefined') {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('ticket');
            window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search);
          }
        }
      }

      const activeToken = handoffTokenRef.current;
      const reqHeaders = authHeaders(
        activeToken ? { Authorization: `Bearer ${activeToken}` } : undefined,
      );

      try {
        const meRes = await fetch('/api/auth/me', {
          headers: reqHeaders,
          credentials: 'include',
          cache: 'no-store',
        });
        const meJson = meRes.ok ? await meRes.json().catch(() => null) : null;
        if (cancelled) return;

        if (!meJson?.user?.id || !meJson?.user?.tenantId) {
          setAuthState('unauthenticated');
          return;
        }
        if (meJson.user.role === 'customer') {
          setAuthState('customer_forbidden');
          return;
        }

        setAuthState('authenticated');

        const cfgRes = await fetch('/api/whatsapp/config', {
          headers: reqHeaders,
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null);
        if (!cancelled && cfgRes?.ok) {
          const json = await cfgRes.json().catch(() => null);
          if (json) setConfigMeta(json);
        }
      } catch {
        if (!cancelled) setAuthState('unauthenticated');
      }
    }

    void verifySessionAndLoadConfig();
    return () => {
      cancelled = true;
    };
  }, [ticket]);

  const buildDeepLink = (statusParam: string) => {
    const target = returnUrl || 'bgos://gbp-callback';
    const sep = target.includes('?') ? '&' : '?';
    return `${target}${sep}${statusParam}&next=${encodeURIComponent(nextPath)}`;
  };

  const safeWebNextPath = nextPath.startsWith('/') ? nextPath : '/integrations';

  const handleSuccess = (
    phoneNumberId: string,
    wabaId: string,
    meta?: { displayPhoneNumber?: string; coexistenceMode?: boolean },
  ) => {
    setErrorMsg(null);
    setConnectedResult({
      phoneNumberId,
      wabaId,
      displayPhoneNumber: meta?.displayPhoneNumber,
      coexistenceMode: meta?.coexistenceMode,
    });
    if (returnUrl.startsWith('bgos://')) {
      setTimeout(() => {
        window.location.href = buildDeepLink('whatsapp=connected');
      }, 900);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Connect WhatsApp Business</h1>
            <p className="text-xs text-slate-500">
              Official Meta Embedded Signup · 2-Minute OTP or QR Verification
            </p>
          </div>
        </div>

        {authState === 'checking' ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-slate-600">Verifying your BGOS session…</p>
          </div>
        ) : authState !== 'authenticated' ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              {authState === 'customer_forbidden'
                ? 'Business Account Required'
                : 'Sign In Required to Connect WhatsApp'}
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              {authState === 'customer_forbidden'
                ? 'You are currently signed in to a customer portal session. Please sign in with your BGOS business owner or admin account to connect WhatsApp.'
                : ticketExpired
                  ? 'Your mobile connection link expired (valid for 60 seconds). Sign in below or return to the BGOS app and tap Connect WhatsApp again.'
                  : 'Please sign in to your BGOS / FieserOS business account before linking your WhatsApp number with Meta.'}
            </p>
            <div className="space-y-2 pt-1">
              <a
                href={loginHref}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 px-4 transition"
              >
                Sign In to BGOS &amp; Continue
              </a>
              {isMobileClient ? (
                <a
                  href={buildDeepLink('whatsapp=auth_required')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm py-2 px-4 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to BGOS App
                </a>
              ) : null}
            </div>
          </div>
        ) : connectedResult ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                WhatsApp Connected!
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {connectedResult.displayPhoneNumber
                  ? `Connected number ${connectedResult.displayPhoneNumber}. `
                  : ''}
                {connectedResult.coexistenceMode
                  ? 'Coexistence mode active — your phone WhatsApp Business app keeps working alongside BGOS AI Chat.'
                  : 'Cloud API active — 24/7 AI booking, reminders, and campaigns are ready.'}
              </p>
              <a
                href={isMobileClient ? buildDeepLink('whatsapp=connected') : safeWebNextPath}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm py-2.5 px-4"
              >
                <ArrowLeft className="w-4 h-4" />
                {isMobileClient ? 'Return to BGOS App' : 'Continue to BGOS'}
              </a>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-1.5">
              <p className="font-semibold text-slate-900">You&apos;re Done — No Extra Meta Portal Setup Needed</p>
              <p>
                <strong>1. Inbound AI Chat is live:</strong> Customers messaging you get instant replies inside BGOS immediately.
              </p>
              <p>
                <strong>2. Test from BGOS:</strong> Send a test WhatsApp message using your QR / Chat Link inside BGOS — no need to use Meta&apos;s onboarding checklist.
              </p>
              <p className="text-slate-500">
                Optional later: If Meta shows a &quot;3 of 8 tasks&quot; checklist or asks for a payment method, you can ignore it unless you send paid outbound marketing broadcasts.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Choose Setup Mode
              </p>

              <div
                className={`w-full text-left rounded-xl border p-3.5 transition ${
                  mode === 'coexistence'
                    ? 'border-emerald-600 bg-emerald-50/70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMode('coexistence')}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                      Keep My WhatsApp Business App
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Link your existing number running on the free <strong>WhatsApp Business</strong> app via QR / OTP. Keep replying on your phone while BGOS AI handles leads &amp; bookings.
                  </p>
                </button>

                <div className="mt-2.5 pt-2 border-t border-emerald-200/70">
                  <button
                    type="button"
                    onClick={() => setShowPersonalGuide((v) => !v)}
                    className="w-full flex items-center justify-between text-[11.5px] font-semibold text-emerald-800 hover:text-emerald-900"
                  >
                    <span>Using Personal WhatsApp? Keep your same number (no new SIM)</span>
                    {showPersonalGuide ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {showPersonalGuide ? (
                    <div className="mt-2 rounded-lg bg-white border border-emerald-200/80 p-2.5 text-[11.5px] text-slate-700 space-y-1.5">
                      <p className="text-slate-600">
                        Meta only supports linking the free <strong>WhatsApp Business app</strong> (not regular Personal WhatsApp Messenger). Switch your existing number cleanly in 2 minutes without losing chats:
                      </p>
                      <p>
                        <strong>1. Back up chats:</strong> Open Personal WhatsApp → <em>Settings → Chats → Chat backup</em>.
                      </p>
                      <p>
                        <strong>2. Install free WhatsApp Business app:</strong> Verify your <strong>same mobile number</strong> &amp; tap Restore when prompted.
                      </p>
                      <p>
                        <strong>3. Link below:</strong> Tap <em>Continue with Facebook &amp; WhatsApp</em> and scan the QR / enter OTP.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href="https://apps.apple.com/app/whatsapp-business/id1386412985"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline"
                        >
                          iPhone App Store <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href="https://play.google.com/store/apps/details?id=com.whatsapp.w4b"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline"
                        >
                          Android Play Store <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode('cloud_api')}
                className={`w-full text-left rounded-xl border p-3.5 transition ${
                  mode === 'cloud_api'
                    ? 'border-emerald-600 bg-emerald-50/70'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  Connect Dedicated API Number
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Only for a brand-new or spare phone number. Registering an active mobile WhatsApp number here will log out your phone app.
                </p>
              </button>
            </div>

            {errorMsg ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1.5">
                <p>{errorMsg}</p>
                {/(personal|messenger|ineligible|coexist|register|linked|app|3441107|cancelled)/i.test(errorMsg) ? (
                  <div className="text-[11px] text-red-800 space-y-1">
                    <p>
                      Tip: Ensure your phone is on the latest <strong>WhatsApp Business app</strong> (v2.24.17+) and check <em>Settings → Account → Business Platform</em> to disconnect any unrelated previous provider before retrying.
                    </p>
                    <p>
                      If Meta shows error <strong>#3441107</strong> (&quot;partner&apos;s app isn&apos;t set up yet&quot;), Coexistence setup for WhatsApp Business app numbers is still awaiting Meta partner/app verification — or choose <strong>Connect Dedicated API Number</strong> if setting up a dedicated or spare number.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[11.5px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Just 1 popup step:</strong> After approving below, you&apos;re ready immediately inside BGOS. If Meta later displays a <em>&quot;Get started (8 tasks)&quot;</em> page on <code className="text-[11px]">business.facebook.com</code>, you can ignore it — only add a payment card later if you send paid promotional broadcasts.
            </div>

            <WhatsAppEmbeddedSignupButton
              label="Continue with Facebook & WhatsApp"
              mode={mode}
              handoffTicket={ticket}
              authToken={handoffToken || undefined}
              configId={configMeta.embeddedConfigId || undefined}
              metaAppId={configMeta.metaAppId || undefined}
              onSuccess={handleSuccess}
              onError={(msg) => setErrorMsg(msg)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            />

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              No Developer tokens required. Start immediately with unlimited inbound AI chat replies &amp; 250 free-tier conversations; business verification in Meta is only needed later for 1,000+ daily broadcasts.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function WhatsAppConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
          Loading WhatsApp Setup…
        </div>
      }
    >
      <WhatsAppConnectContent />
    </Suspense>
  );
}

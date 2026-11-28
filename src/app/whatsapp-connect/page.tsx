'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import { WhatsAppEmbeddedSignupButton } from '@/components/whatsapp/whatsapp-embedded-signup-button';

function WhatsAppConnectContent() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get('ticket') || '';
  const returnUrl = searchParams.get('returnUrl') || 'bgos://gbp-callback';
  const nextPath = searchParams.get('next') || '/integrations';

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

  useEffect(() => {
    const q = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
    fetch(`/api/whatsapp/config${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setConfigMeta(json);
      })
      .catch(() => {});
  }, [ticket]);

  const buildDeepLink = (statusParam: string) => {
    const sep = returnUrl.includes('?') ? '&' : '?';
    return `${returnUrl}${sep}${statusParam}&next=${encodeURIComponent(nextPath)}`;
  };

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

        {connectedResult ? (
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
              href={buildDeepLink('whatsapp=connected')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm py-2.5 px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to BGOS App
            </a>
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
                      Tip: Ensure your phone is on the latest <strong>WhatsApp Business app</strong> (v2.24.17+) and check <em>Settings → Account → Business Platform</em> to disconnect any previous partner link before retrying.
                    </p>
                    <p>
                      If Meta shows error <strong>#3441107</strong> (&quot;partner&apos;s app isn&apos;t set up yet&quot;), Coexistence setup for WhatsApp Business app numbers is still awaiting Meta partner/app verification — or choose <strong>Connect Dedicated API Number</strong> if setting up a dedicated or spare number.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <WhatsAppEmbeddedSignupButton
              label="Continue with Facebook & WhatsApp"
              mode={mode}
              handoffTicket={ticket}
              configId={configMeta.embeddedConfigId || undefined}
              metaAppId={configMeta.metaAppId || undefined}
              onSuccess={handleSuccess}
              onError={(msg) => setErrorMsg(msg)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            />

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              No Developer tokens required. Start immediately with unlimited inbound AI chat replies & 250 template messages/day; verify your Meta Business Portfolio later for 1,000+ daily volume.
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

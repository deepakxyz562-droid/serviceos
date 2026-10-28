'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';

/**
 * BosWhatsappConnectCard — WhatsApp Business integration panel for the BOS
 * Integrations workstation, following the Vyapar "WhatsApp Connect" pattern:
 * instructional split layout (illustration/preview on the left, numbered
 * steps on the right), an end-to-end-encryption trust note, and a terms
 * checkbox before proceeding.
 *
 * REALITY MATCH: this codebase connects WhatsApp via the **Meta Cloud API
 * credentials** (Phone Number ID + WABA ID + Access Token saved through
 * POST /api/whatsapp/manual-config, status via GET /api/whatsapp/config).
 * There is NO QR / linked-device flow in this codebase, so the numbered
 * steps below describe the REAL flow — no fake QR screen is rendered.
 */

type WhatsappConfigStatus = {
  isConfigured: boolean;
  mode: string;
  phoneNumberId: string;
  source: string;
  webhookUrl: string;
  apiVersion: string;
};

type BosWhatsappConnectCardProps = {
  demoMode?: boolean;
  businessName: string;
  onToast?: (message: string) => void;
};

const STEPS = [
  {
    title: 'Open Meta for Developers & create your app',
    detail:
      'Go to developers.facebook.com → My Apps → Create App (type: Business). Then add the "WhatsApp" product to your app.',
    link: 'https://developers.facebook.com/apps',
    linkLabel: 'Open developers.facebook.com',
  },
  {
    title: 'Copy your credentials from API Setup',
    detail:
      'In WhatsApp → API Setup, copy the Phone Number ID, the WABA ID and generate a permanent Access Token for your system user.',
  },
  {
    title: 'Paste them below & connect',
    detail:
      'BOS saves the credentials as your own WhatsApp provider (BYO Cloud API) and starts sending bills, khata reminders and campaigns through your number.',
  },
] as const;

export function BosWhatsappConnectCard({
  demoMode = false,
  businessName,
  onToast,
}: BosWhatsappConnectCardProps) {
  const [status, setStatus] = useState<WhatsappConfigStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const toast = useCallback(
    (msg: string) => {
      onToast?.(msg);
    },
    [onToast],
  );

  const loadStatus = useCallback(async () => {
    if (demoMode) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await authFetch('/api/whatsapp/config');
      if (!res.ok) {
        setStatusError(`Status check failed (HTTP ${res.status})`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data) {
        setStatus({
          isConfigured: Boolean(data.isConfigured),
          mode: String(data.mode || 'demo'),
          phoneNumberId: String(data.phoneNumberId || ''),
          source: String(data.source || 'none'),
          webhookUrl: String(data.webhookUrl || ''),
          apiVersion: String(data.apiVersion || ''),
        });
      }
    } catch {
      setStatusError('Could not reach the WhatsApp status endpoint.');
    } finally {
      setStatusLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const isConfigured = Boolean(status?.isConfigured);

  const handleConnect = async () => {
    setConnectError(null);
    if (!phoneNumber.trim() || !phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) {
      setConnectError('All four fields are required (Phone Number, Phone Number ID, WABA ID, Access Token).');
      return;
    }
    setConnecting(true);
    try {
      const res = await authFetch('/api/whatsapp/manual-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          accessToken: accessToken.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast('WhatsApp Cloud API connected — your number is live for bills & campaigns.');
        setAccessToken('');
        await loadStatus();
      } else {
        setConnectError(data?.error || `Connection failed (HTTP ${res.status}).`);
      }
    } catch {
      setConnectError('Network error — could not reach the server. Please retry.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="bos-whatsapp-connect-card">
      {/* Instructional split layout: illustration/preview left, steps right */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* LEFT: illustration + live status preview */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] p-5 text-white">
          <div
            className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden="true"
          />
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-[#075E54] shadow-sm">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-extrabold leading-snug">WhatsApp Business Cloud API</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-white/90">
                Send GST bills, khata payment links and promotional broadcasts from{' '}
                <span className="font-bold">{businessName || 'your business'}</span>&apos;s own
                WhatsApp number.
              </p>
            </div>
          </div>

          {/* REAL status from GET /api/whatsapp/config */}
          <div className="mt-4 rounded-xl bg-white/12 p-3 backdrop-blur-sm">
            {demoMode ? (
              <p className="text-[11.5px] font-medium leading-relaxed text-white/90">
                Demo mode — connect your WhatsApp number from your live workspace.
              </p>
            ) : statusLoading ? (
              <p className="flex items-center gap-2 text-[11.5px] font-semibold text-white/90">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking connection status…
              </p>
            ) : statusError ? (
              <p className="flex items-start gap-1.5 text-[11.5px] font-medium text-amber-100">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {statusError}
              </p>
            ) : status ? (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-[12px] font-extrabold">
                  {isConfigured ? (
                    <>
                      <BadgeCheck className="h-4 w-4 text-emerald-100" />
                      Connected · live mode
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-100" />
                      Not connected · running in demo mode
                    </>
                  )}
                </p>
                {isConfigured && (
                  <p className="text-[10.5px] text-white/85">
                    Phone Number ID: <span className="font-mono">{status.phoneNumberId || '—'}</span>
                    {status.source ? ` · source: ${status.source}` : ''}
                  </p>
                )}
                {status.webhookUrl && (
                  <p className="truncate text-[10px] text-white/70">
                    Webhook: <span className="font-mono">{status.webhookUrl}</span>
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* End-to-end encryption trust note */}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/15 p-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
            <p className="text-[10.5px] leading-relaxed text-white/90">
              Messages are <span className="font-bold">end-to-end encrypted</span>. BOS only uses
              Meta&apos;s official Cloud API to deliver your messages — it can never read your
              customers&apos; chats.
            </p>
          </div>
        </div>

        {/* RIGHT: numbered steps matched to the REAL Meta Cloud API flow */}
        <div className="space-y-3">
          <ol className="space-y-3">
            {STEPS.map((step, idx) => (
              <li key={step.title} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-[12.5px] font-extrabold text-white">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-[#111827]">{step.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#64748B]">{step.detail}</p>
                  {'link' in step && step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#0A6847] hover:underline"
                    >
                      {step.linkLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {isConfigured && (
            <p className="flex items-start gap-1.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[11.5px] font-medium text-[#065F46]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              WhatsApp is already connected. Submitting new credentials below replaces the saved
              provider (e.g. when rotating tokens).
            </p>
          )}
        </div>
      </div>

      {/* Connect form — real POST /api/whatsapp/manual-config */}
      {demoMode ? (
        <p className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3.5 py-2.5 text-[11.5px] font-medium text-[#64748B]">
          Credential connect is available in your live workspace — this preview cannot modify
          integration settings.
        </p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-[#E4EFEA] bg-[#FAFDFB] p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#0A6847]" />
            <h4 className="text-[13px] font-extrabold text-[#111827]">Connect your WhatsApp number</h4>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">
                WhatsApp Number (with country code)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-semibold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 1048291049281"
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 font-mono text-[12px] text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">
                WABA ID (WhatsApp Business Account)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 209458105xxxxxxx"
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 font-mono text-[12px] text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[#334155]">
                Permanent Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="••••••••••••••••"
                autoComplete="off"
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white px-3 font-mono text-[12px] text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Terms checkbox gates the connect action */}
          <label className="flex items-start gap-2.5 rounded-xl border border-[#E4EFEA] bg-white p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#0A6847]"
            />
            <span className="text-[11px] leading-relaxed text-[#475569]">
              I agree to the WhatsApp Business Solution Terms and Meta&apos;s Commerce &amp;
              Messaging policies, and confirm I own this phone number.
            </span>
          </label>

          {connectError && (
            <p className="flex items-start gap-1.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11.5px] font-medium text-[#B91C1C]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {connectError}
            </p>
          )}

          <button
            type="button"
            disabled={!agreedTerms || connecting}
            onClick={() => void handleConnect()}
            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition ${
              !agreedTerms || connecting
                ? 'cursor-not-allowed bg-[#CBD5E1] text-[#64748B]'
                : 'cursor-pointer bg-[#25D366] text-white shadow-2xs hover:bg-[#1EBE5D]'
            }`}
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying & connecting…</span>
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                <span>Connect WhatsApp</span>
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-[#94A3B8]">
            Credentials are stored encrypted on the server and are never shown again in full.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ExternalLink, RefreshCw, Star } from 'lucide-react';
import { authFetch, getToken } from '@/lib/client-auth';

/**
 * BosGoogleProfileCard — Google Business Profile integration panel for the
 * BOS Integrations workstation, following the Vyapar "Google Profile Manager"
 * pattern: benefit-driven hero with the colored "Google" brand word, three
 * checkmark bullets, and a full-width "Sign in with Google" button.
 *
 * REAL WIRING (no invented endpoints):
 *  - Connected state  → GET /api/social/accounts?platform=googlebusiness
 *    (returns the tenant's real SocialAccount rows; tokens masked server-side).
 *  - Connect action   → GET /api/oauth/googlebusiness/connect?originHost=…
 *    &returnView=integrations&auth=<jwt> — the exact OAuth flow used by
 *    gbp-ai-hub.tsx / reviews-workstation.tsx. The callback returns the
 *    operator to /?view=integrations (a real BOS nav view).
 */

type GbpAccount = {
  id: string;
  accountName: string;
  accountId: string;
  isActive?: boolean;
};

type BosGoogleProfileCardProps = {
  demoMode?: boolean;
  businessName: string;
};

/** Official Google brand colors for the word "Google" (blue/red/yellow/blue/green/red). */
const GOOGLE_WORD: Array<{ ch: string; color: string }> = [
  { ch: 'G', color: '#4285F4' },
  { ch: 'o', color: '#EA4335' },
  { ch: 'o', color: '#FBBC05' },
  { ch: 'g', color: '#4285F4' },
  { ch: 'l', color: '#34A853' },
  { ch: 'e', color: '#EA4335' },
];

function GoogleG({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function BosGoogleProfileCard({ demoMode = false, businessName }: BosGoogleProfileCardProps) {
  const [gbpAccount, setGbpAccount] = useState<GbpAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [connectUrl, setConnectUrl] = useState('');

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await authFetch('/api/social/accounts?platform=googlebusiness');
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const rows: GbpAccount[] = Array.isArray(data?.data) ? data.data : [];
          const active = rows.find((a) => a.isActive !== false) || rows[0] || null;
          setGbpAccount(active);
          setFetchFailed(false);
        } else {
          setFetchFailed(true);
        }
      } catch {
        if (!cancelled) setFetchFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  useEffect(() => {
    // The OAuth connect URL needs window.origin + the JWT, so it is computed
    // client-side only — same mechanism as gbp-ai-hub.tsx.
    if (demoMode) return;
    const token = getToken();
    const params = new URLSearchParams({ returnView: 'integrations' });
    if (typeof window !== 'undefined') params.set('originHost', window.location.origin);
    if (token) params.set('auth', token);
    setConnectUrl(`/api/oauth/googlebusiness/connect?${params.toString()}`);
  }, [demoMode]);

  const isConnected = Boolean(gbpAccount);

  return (
    <div className="space-y-4" data-testid="bos-google-profile-card">
      {/* Benefit-driven hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E4EFEA] bg-gradient-to-br from-white via-[#F8FCFA] to-[#Eef7f2] p-5">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#E6F6F0] opacity-70"
          aria-hidden="true"
        />
        <div className="flex items-center gap-2">
          <GoogleG className="h-5 w-5" />
          <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[#0A6847]">
            Free · Google Business Profile
          </span>
        </div>
        <h3 className="mt-3 text-[20px] font-extrabold leading-snug tracking-tight text-[#111827]">
          Make your Business Visible on{' '}
          <span className="whitespace-nowrap">
            {GOOGLE_WORD.map((letter, i) => (
              <span key={i} style={{ color: letter.color }}>
                {letter.ch}
              </span>
            ))}
          </span>
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#475569]">
          {businessName || 'Your business'} can appear when nearby customers search on Google —
          at no cost.
        </p>

        {/* 3 checkmark bullets */}
        <ul className="mt-4 space-y-2.5">
          {[
            {
              icon: Star,
              text: 'Be visible on Google Search — customers find you the moment they search.',
            },
            {
              icon: CheckCircle2,
              text: 'Get found on Google Maps with directions straight to your store.',
            },
            {
              icon: Check,
              text: 'Show your hours, phone number, location and photos — all in one profile.',
            },
          ].map((bullet) => {
            const Icon = bullet.icon;
            return (
              <li key={bullet.text} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-white">
                  <Icon className="h-3 w-3" />
                </span>
                <span className="text-[12.5px] font-medium leading-snug text-[#334155]">
                  {bullet.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Connected state (real data from /api/social/accounts) */}
      {demoMode ? (
        <p className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3.5 py-2.5 text-[11.5px] font-medium text-[#64748B]">
          Demo mode — sign-in is available in your live workspace.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3.5 py-3 text-[12px] font-semibold text-[#64748B]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Checking connection status…
        </div>
      ) : isConnected ? (
        <div className="space-y-2.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-[#0A6847] shadow-2xs">
                {(gbpAccount.accountName || 'G').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#065F46]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected as {gbpAccount.accountName || 'Google account'}
                </p>
                <p className="truncate text-[10.5px] text-[#047857]">
                  Google Business Profile · {gbpAccount.accountId}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-[#047857]">
            Your profile is linked. Manage posts, reviews and profile updates from the Social
            Marketing workspace — new locations connect automatically.
          </p>
          <a
            href={connectUrl || '#'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#A7F3D0] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#065F46] hover:bg-[#F0FDF6] cursor-pointer"
          >
            <GoogleG className="h-3.5 w-3.5" />
            <span>Connect another account</span>
          </a>
        </div>
      ) : (
        <div className="space-y-2.5">
          {fetchFailed && (
            <p className="flex items-center gap-1.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11.5px] font-medium text-[#92400E]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Couldn&apos;t verify connection status — check your internet and retry.
            </p>
          )}
          {/* Full-width Sign in with Google button — real OAuth flow */}
          <a
            href={connectUrl || '#'}
            onClick={(e) => {
              if (!connectUrl) e.preventDefault();
            }}
            aria-disabled={!connectUrl}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#DADCE0] bg-white px-4 text-[13.5px] font-bold text-[#1F1F1F] shadow-2xs transition hover:bg-[#F8F9FA] cursor-pointer"
          >
            <GoogleG className="h-4.5 w-4.5" />
            <span>Sign in with Google</span>
          </a>
          <p className="text-center text-[10.5px] leading-relaxed text-[#64748B]">
            You&apos;ll be redirected to Google&apos;s official sign-in screen. BOS only receives
            permission to manage your Business Profile — your Google password is never shared.
          </p>
          <a
            href="https://business.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#0A6847] hover:underline"
          >
            Don&apos;t have a Business Profile? Create one free on Google
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

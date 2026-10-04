'use client';

import React, { useMemo, useState } from 'react';
import {
  Rocket,
  Users,
  Mail,
  Loader2,
  CheckCircle2,
  Share2,
  ChevronRight,
  Trophy,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface WaitlistValue {
  email: string;
  referralCode: string | null; // null = pending (will be emailed)
  position: number | null;     // null = unknown until backend confirms
  aheadOfYou: number | null;
  behindYou: number | null;
  referredEmails: string[];
  rewardTier?: string;
  joinedAt: string;
}

// Reward tiers are computed client-side from the number of friends
// invited (referredEmails.length). These thresholds are a UX nudge,
// not billing-affecting — see P8 worklog.
const TIERS = [
  { min: 0, label: 'Starter', perk: 'Early access invite' },
  { min: 3, label: 'Boost', perk: '+1 week priority queue' },
  { min: 5, label: 'VIP', perk: '+Free beta merch' },
  { min: 10, label: 'Founders', perk: '+Lifetime discount' },
];

function rewardTierFor(count: number): string {
  return [...TIERS].reverse().find((t) => count >= t.min)?.label ?? 'Starter';
}

/**
 * Read the `?ref=WL-XXXX` query param (if any) from the current page
 * URL so we can attribute this signup to the referring friend. The
 * backend uses this to track referrals and (optionally) bump the
 * referrer's position.
 */
function readReferrerCodeFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  return ref && ref.trim() ? ref.trim() : undefined;
}

export function ViralWaitlist({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Viral waitlist');
  const productName = str(config.productName, 'our product');
  const referralBonus = num(config.referralBonus, 1);
  const showReferralLink = bool(config.showReferralLink, true);
  // formId is injected by the WidgetRuntimeDispatcher so the widget
  // knows which form (and therefore which tenant) to attribute the
  // signup to. Without it, the backend can't resolve the tenant, so
  // we render an honest "you'll receive your code by email" state
  // instead of fabricating a code client-side.
  const formId = str(field?.formId, '');

  const existing: WaitlistValue | undefined =
    value && typeof value === 'object' ? (value as WaitlistValue) : undefined;
  const [email, setEmail] = useState(existing?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<WaitlistValue | null>(existing ?? null);
  const [referred, setReferred] = useState<string[]>(existing?.referredEmails ?? []);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (disabled) return;
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Enter a valid email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // POST to the real backend — no client-side Math.random code
      // generation. The server persists an ActivityLog entry and
      // returns a deterministic referral code derived from the row
      // id (SHA-256 hash → base36 → 8 chars). See
      // /api/forms/waitlist/subscribe/route.ts.
      const referrerCode = readReferrerCodeFromUrl();
      const res = await fetch('/api/forms/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: e,
          formId,
          productName,
          referralCode: referrerCode,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        // Backend unreachable / rejected. Show the honest "you'll
        // receive your code by email" state instead of fabricating
        // a `WL-<rand>` string.
        const out: WaitlistValue = {
          email: e,
          referralCode: null,
          position: null,
          aheadOfYou: null,
          behindYou: null,
          referredEmails: [],
          rewardTier: 'Starter',
          joinedAt: new Date().toISOString(),
        };
        setJoined(out);
        setReferred([]);
        onChange(out);
        setError(
          data?.error ||
            "We couldn't generate your referral code right now — you'll receive it by email.",
        );
      } else {
        const position = typeof data.position === 'number' ? data.position : 0;
        const out: WaitlistValue = {
          email: e,
          referralCode: String(data.referralCode || ''),
          position,
          aheadOfYou: Math.max(0, position - 1),
          behindYou: null, // unknown — backend doesn't return total count
          referredEmails: [],
          rewardTier: 'Starter',
          joinedAt: new Date().toISOString(),
        };
        setJoined(out);
        setReferred([]);
        onChange(out);
      }
    } catch (err) {
      // Network / parse error — same honest fallback.
      const out: WaitlistValue = {
        email: e,
        referralCode: null,
        position: null,
        aheadOfYou: null,
        behindYou: null,
        referredEmails: [],
        rewardTier: 'Starter',
        joinedAt: new Date().toISOString(),
      };
      setJoined(out);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't generate your referral code right now — you'll receive it by email.",
      );
      onChange(out);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    if (disabled || !joined) return;
    const e = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Enter a valid friend email.');
      return;
    }
    if (referred.includes(e)) {
      setError('Already invited.');
      return;
    }
    setError('');
    const nextReferred = [...referred, e];
    setReferred(nextReferred);
    setInviteEmail('');
    // Position bumping is a UX nudge that previously used the fake
    // `position` (a client-side mock). With a real backend position
    // we no longer fabricate bumps — the actual position is updated
    // server-side when a referral converts. The reward tier is still
    // derived client-side from referred count for display purposes.
    const out: WaitlistValue = {
      ...joined,
      referredEmails: nextReferred,
      rewardTier: rewardTierFor(nextReferred.length),
    };
    setJoined(out);
    onChange(out);
  };

  const copyReferralLink = () => {
    if (typeof window === 'undefined' || !joined?.referralCode) return;
    const link = `${window.location.origin}/?ref=${joined.referralCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
  };

  if (joined) {
    const tier =
      [...TIERS].reverse().find((t) => referred.length >= t.min) ?? TIERS[0];
    return (
      <div className="space-y-2.5" aria-label={ariaLabel}>
        <div className="rounded-lg border border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold">
            <Rocket className="size-4" /> You&apos;re on the list!
          </div>
          <div className="flex items-baseline gap-1.5">
            {joined.position !== null ? (
              <>
                <span className="text-3xl font-black tabular-nums text-indigo-700 dark:text-indigo-400">
                  #{joined.position}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  in line for {productName}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                You&apos;re in — we&apos;ll email your spot number shortly.
              </span>
            )}
          </div>
          {joined.aheadOfYou !== null && (
            <p className="text-[10px] text-muted-foreground">
              <Users className="size-2.5 inline mr-1" />
              {joined.aheadOfYou.toLocaleString()} ahead of you
            </p>
          )}
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Trophy className="size-3 text-amber-500" /> Reward tier
            </span>
            <Badge variant="outline" className="text-[9px] gap-1">
              <Sparkles className="size-2.5" /> {tier.label}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">{tier.perk}</p>
          <p className="text-[10px] text-muted-foreground">
            <UserPlus className="size-2.5 inline mr-1" />
            {referred.length} friend{referred.length !== 1 ? 's' : ''} invited ·{' '}
            {referralBonus} spot{referralBonus !== 1 ? 's' : ''} boosted each
          </p>
        </div>

        {showReferralLink && (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
              Your referral link
            </label>
            {joined.referralCode ? (
              <div className="flex gap-1.5">
                <Input
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/?ref=${joined.referralCode}`
                      : joined.referralCode
                  }
                  readOnly
                  className="h-8 text-[11px] font-mono"
                  aria-label="Your referral link"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] gap-1"
                  onClick={copyReferralLink}
                  disabled={disabled}
                >
                  <Share2 className="size-3" /> Copy
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                You&apos;ll receive your referral code by email once your spot
                is confirmed.
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
            Invite a friend by email
          </label>
          <div className="flex gap-1.5">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setError('');
              }}
              disabled={disabled}
              placeholder="friend@example.com"
              className="h-8 text-[11px]"
              aria-label="Friend email"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 text-[11px] gap-1"
              onClick={handleInvite}
              disabled={disabled || !inviteEmail.trim()}
            >
              <ChevronRight className="size-3.5" /> Invite
            </Button>
          </div>
          {referred.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {referred.slice(-3).map((e) => (
                <li
                  key={e}
                  className="text-[10px] text-muted-foreground flex items-center gap-1"
                >
                  <CheckCircle2 className="size-2.5 text-emerald-500" /> {e}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-[11px] text-amber-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-lg border border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold">
          <Rocket className="size-4" /> Join the waitlist
        </div>
        <p className="text-[11px] text-muted-foreground">
          Be the first to try {productName}. Get early access + invite perks.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            disabled={disabled || loading}
            placeholder="you@example.com"
            className="h-9 pl-8 text-xs"
            aria-label="Email address"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleJoin();
              }
            }}
          />
        </div>
        <Button
          type="button"
          disabled={disabled || loading || !email.trim()}
          onClick={handleJoin}
          size="sm"
          className="h-9 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <Rocket className="size-3.5" /> Join
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {!formId && (
        <p className="text-[10px] text-muted-foreground">
          We&apos;ll email your referral code once your spot is confirmed.
        </p>
      )}
    </div>
  );
}

export default ViralWaitlist;

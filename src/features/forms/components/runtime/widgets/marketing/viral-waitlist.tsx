'use client';

import React, { useMemo, useState } from 'react';
import { Rocket, Users, Mail, Loader2, CheckCircle2, Share2, ChevronRight, Trophy, Sparkles, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';

interface WaitlistValue {
  email: string;
  referralCode: string;
  position: number;
  aheadOfYou: number;
  behindYou: number;
  referredEmails: string[];
  rewardTier?: string;
  joinedAt: string;
}

// Deterministic mock position from a string seed.
function mockPosition(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 4500) + 1;
}

const TIERS = [
  { min: 0, label: 'Starter', perk: 'Early access invite' },
  { min: 3, label: 'Boost', perk: '+1 week priority queue' },
  { min: 5, label: 'VIP', perk: '+Free beta merch' },
  { min: 10, label: 'Founders', perk: '+Lifetime discount' },
];

function rewardTierFor(count: number): string {
  return [...TIERS].reverse().find((t) => count >= t.min)?.label ?? 'Starter';
}

export function ViralWaitlist({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Viral waitlist');
  const productName = str(config.productName, 'our product');
  const referralBonus = num(config.referralBonus, 1);
  const showReferralLink = bool(config.showReferralLink, true);

  const existing: WaitlistValue | undefined = value && typeof value === 'object' ? (value as WaitlistValue) : undefined;
  const [email, setEmail] = useState(existing?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState<WaitlistValue | null>(existing ?? null);
  const [referred, setReferred] = useState<string[]>(existing?.referredEmails ?? []);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');

  const referralCode = useMemo(() => {
    if (existing?.referralCode) return existing.referralCode;
    return `WL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }, [existing]);

  const handleJoin = () => {
    if (disabled) return;
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError('Enter a valid email.');
      return;
    }
    setError(''); setLoading(true);
    setTimeout(() => {
      const position = mockPosition(e);
      const out: WaitlistValue = {
        email: e,
        referralCode,
        position,
        aheadOfYou: position - 1,
        behindYou: Math.max(0, 500 - position),
        referredEmails: [],
        rewardTier: 'Starter',
        joinedAt: new Date().toISOString(),
      };
      setJoined(out); setReferred([]);
      onChange(out);
      setLoading(false);
    }, 600);
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
    const newPos = Math.max(1, joined.position - referralBonus);
    const out: WaitlistValue = {
      ...joined,
      position: newPos,
      aheadOfYou: newPos - 1,
      referredEmails: nextReferred,
      rewardTier: rewardTierFor(nextReferred.length),
    };
    setJoined(out);
    onChange(out);
  };

  const copyReferralLink = () => {
    if (typeof window === 'undefined' || !joined) return;
    const link = `${window.location.origin}/?ref=${joined.referralCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
  };

  if (joined) {
    const tier = [...TIERS].reverse().find((t) => referred.length >= t.min) ?? TIERS[0];
    return (
      <div className="space-y-2.5" aria-label={ariaLabel}>
        <div className="rounded-lg border border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-bold">
            <Rocket className="size-4" /> You&apos;re on the list!
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black tabular-nums text-indigo-700 dark:text-indigo-400">#{joined.position}</span>
            <span className="text-[10px] text-muted-foreground">in line for {productName}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            <Users className="size-2.5 inline mr-1" />
            {joined.aheadOfYou.toLocaleString()} ahead · {joined.behindYou.toLocaleString()} behind you
          </p>
        </div>

        <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold flex items-center gap-1"><Trophy className="size-3 text-amber-500" /> Reward tier</span>
            <Badge variant="outline" className="text-[9px] gap-1">
              <Sparkles className="size-2.5" /> {tier.label}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">{tier.perk}</p>
          <p className="text-[10px] text-muted-foreground">
            <UserPlus className="size-2.5 inline mr-1" />
            {referred.length} friend{referred.length !== 1 ? 's' : ''} invited · {referralBonus} spot{referralBonus !== 1 ? 's' : ''} boosted each
          </p>
        </div>

        {showReferralLink && (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Your referral link</label>
            <div className="flex gap-1.5">
              <Input
                value={typeof window !== 'undefined' ? `${window.location.origin}/?ref=${joined.referralCode}` : joined.referralCode}
                readOnly
                className="h-8 text-[11px] font-mono"
                aria-label="Your referral link"
              />
              <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={copyReferralLink} disabled={disabled}>
                <Share2 className="size-3" /> Copy
              </Button>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Invite a friend by email</label>
          <div className="flex gap-1.5">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setError(''); }}
              disabled={disabled}
              placeholder="friend@example.com"
              className="h-8 text-[11px]"
              aria-label="Friend email"
            />
            <Button type="button" size="sm" className="h-8 text-[11px] gap-1" onClick={handleInvite} disabled={disabled || !inviteEmail.trim()}>
              <ChevronRight className="size-3.5" /> Invite
            </Button>
          </div>
          {referred.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {referred.slice(-3).map((e) => (
                <li key={e} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="size-2.5 text-emerald-500" /> {e}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-[11px] text-red-500">{error}</p>}
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
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={disabled || loading}
            placeholder="you@example.com"
            className="h-9 pl-8 text-xs"
            aria-label="Email address"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleJoin(); } }}
          />
        </div>
        <Button type="button" disabled={disabled || loading || !email.trim()} onClick={handleJoin} size="sm" className="h-9 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <><Rocket className="size-3.5" /> Join</>}
        </Button>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Users className="size-3" /> 2,847 people already joined
      </p>
    </div>
  );
}

export default ViralWaitlist;

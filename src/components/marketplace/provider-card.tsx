'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Star,
  MapPin,
  Briefcase,
  Clock,
  BadgeCheck,
  ShieldCheck,
  Building2,
  Umbrella,
  CreditCard,
  Zap,
  Phone,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIndustry } from '@/lib/industry-catalog';
import type { ProviderListItem, ProviderProfile } from './types';

/**
 * ProviderCard — redesigned to match the slick-service-hub reference design.
 *
 * Layout (top to bottom):
 *   • Identity row: avatar (initials) + name + verified badge | Claimed/Unclaimed pill
 *   • Category • Location line (with icons)
 *   • 3-column stats bar: rating | jobs done | avg response
 *   • Description (2-line clamp)
 *   • 4-gate verification badges: Identity | Business | Insurance | Payments
 *   • Action row: 24/7 pill (if emergency) + Call now button + Details link
 *
 * Three rendering modes driven by `provider.cardType`:
 *   - 'featured'       : full card + amber "Featured" ring + sort-first
 *   - 'normal-full'    : full card (Call now + Details)
 *   - 'normal-minimal' : minimal card (avatar, name, rating, "No phone on file" / Call now + Details)
 *                        — used for unclaimed seed data
 */

interface ProviderCardProps {
  provider: ProviderListItem | ProviderProfile;
  featured?: boolean;
  onViewProfile?: (provider: ProviderListItem | ProviderProfile) => void;
  compact?: boolean;
  className?: string;
  href?: string;
}

function isProfile(p: ProviderListItem | ProviderProfile): p is ProviderProfile {
  return 'identityVerified' in p && 'gallery' in p;
}

function buildInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Deterministic avatar color from the provider name. Picks from a palette of
 * soft pastel backgrounds + dark text colors so every provider gets a stable,
 * visually distinct avatar without needing a stored image.
 */
function avatarColors(name: string): { bg: string; text: string } {
  const palettes = [
    { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
    { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
    { bg: 'bg-violet-100 dark:bg-violet-950/60', text: 'text-violet-700 dark:text-violet-300' },
    { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
    { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
    { bg: 'bg-teal-100 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}

interface VerificationGate {
  label: string;
  icon: LucideIcon;
  passed: boolean;
}

function buildVerificationGates(p: ProviderListItem | ProviderProfile): VerificationGate[] {
  const list = p as ProviderListItem;
  const identity = isProfile(p) ? p.identityVerified : list.identityVerified ?? false;
  const business = isProfile(p) ? p.businessVerified : list.businessVerified ?? false;
  const insurance = isProfile(p) ? p.insuranceVerified : list.insuranceVerified ?? false;
  const payments = isProfile(p) ? p.stripeConnected : list.stripeConnected ?? false;
  return [
    { label: 'Identity', icon: ShieldCheck, passed: identity },
    { label: 'Business', icon: Building2, passed: business },
    { label: 'Insurance', icon: Umbrella, passed: insurance },
    { label: 'Payments', icon: CreditCard, passed: payments },
  ];
}

function formatResponseTime(mins: number | null | undefined): string {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ─── Verification gate badge (single pill in the 4-gate row) ──────────────────
function GateBadge({ gate }: { gate: VerificationGate }) {
  const Icon = gate.icon;
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium',
        gate.passed
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-border bg-muted/40 text-muted-foreground',
      )}
      title={gate.passed ? `${gate.label} verified` : `${gate.label} not yet verified`}
    >
      <Icon className={cn('h-3 w-3', gate.passed ? 'text-emerald-600' : 'text-muted-foreground')} />
      {gate.label}
    </span>
  );
}

// ─── 3-column stats bar (rating | jobs | response) ───────────────────────────
function StatsBar({
  rating,
  reviewCount,
  jobsCount,
  responseTimeMins,
}: {
  rating: number;
  reviewCount: number;
  jobsCount: number;
  responseTimeMins: number | null | undefined;
}) {
  const colClass = 'flex flex-col items-center justify-center px-2 py-2.5 min-w-0';
  const valueClass = 'flex items-center gap-1 text-[13px] font-semibold text-foreground';
  const labelClass = 'mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground';
  return (
    <div className="mt-3 grid grid-cols-3 divide-x divide-border border-y border-border bg-muted/40">
      <div className={colClass}>
        <span className={valueClass}>
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </span>
        <span className={labelClass}>{reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
      </div>
      <div className={colClass}>
        <span className={valueClass}>
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          {jobsCount > 0 ? jobsCount.toLocaleString() : '0'}
        </span>
        <span className={labelClass}>Jobs done</span>
      </div>
      <div className={colClass}>
        <span className={valueClass}>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatResponseTime(responseTimeMins)}
        </span>
        <span className={labelClass}>Avg response</span>
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export function ProviderCard({
  provider,
  featured,
  onViewProfile,
  compact,
  className,
  href,
}: ProviderCardProps) {
  const listItem = provider as ProviderListItem;
  const cardType = listItem.cardType;

  // Minimal card for unclaimed seed data (no stats bar, no description, no gates)
  if (cardType === 'normal-minimal' && !isProfile(provider)) {
    return <MinimalCard provider={listItem} className={className} href={href} onViewProfile={onViewProfile} />;
  }

  const rating = provider.rating ?? 0;
  const reviewCount = provider.reviewCount ?? 0;
  const industry = provider.industry;
  const industryMeta = industry ? getIndustry(industry) : undefined;
  const industryLabel = industryMeta?.name ?? industry ?? 'Service Provider';
  const location = [provider.city, provider.state].filter(Boolean).join(', ');
  const phone = listItem.phone ?? null;
  const isFeat = featured ?? !!listItem.featured;
  const isEmergency = provider.emergencyServiceAvailable ?? listItem.emergencyServiceAvailable ?? false;
  const claimed = listItem.claimed ?? false;
  const listingTier = listItem.listingTier ?? 'none';
  const isClaimedFree = listingTier === 'claimed_free';

  const gates = buildVerificationGates(provider);
  const allGatesPassed = gates.every((g) => g.passed);

  // ── Claim status badge logic ──
  //   Verified    → claimed AND all 4 verification gates passed (emerald)
  //   Unclaimed   → not claimed (muted gray)
  //   (hidden)    → claimed but NOT yet verified — show no badge (per Q1 decision:
  //                 hide "Claimed" if not verified, so visitors don't mistake an
  //                 unverified claim for a verified business)
  const showVerifiedBadge = claimed && allGatesPassed;
  const showUnclaimedBadge = !claimed;
  const avatar = avatarColors(provider.name);

  const description = provider.description ?? listItem.tagline ?? '';
  const profileHref = href ?? '#';
  const handleView = () => {
    if (onViewProfile) onViewProfile(provider);
  };

  const jobsCount = listItem.jobsCount ?? 0;
  const responseTimeMins = listItem.responseTimeMins ?? null;

  return (
    <article
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        isFeat && 'ring-2 ring-amber-300/70',
        className,
      )}
    >
      {/* ─── Identity row ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm font-bold uppercase',
            avatar.bg,
            avatar.text,
          )}
          aria-hidden
        >
          {buildInitials(provider.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {href ? (
              <Link href={profileHref} aria-label={`View ${provider.name} profile`} className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-700">
                  {provider.name}
                </h3>
              </Link>
            ) : (
              <button type="button" onClick={handleView} className="min-w-0 text-left" aria-label={`View ${provider.name} profile`}>
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-700">
                  {provider.name}
                </h3>
              </button>
            )}
            {allGatesPassed ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500"
                aria-label="Fully verified"
              />
            ) : null}
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3 shrink-0" />
            <span className="truncate">{industryLabel}</span>
            {location ? (
              <>
                <span className="text-border-strong" aria-hidden>•</span>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{location}</span>
              </>
            ) : null}
          </p>
        </div>
        {/* Claim status badge — 3-state logic:
              Verified  → claimed + all verification gates passed (emerald, with check icon)
              Unclaimed → not claimed (muted gray)
              (hidden)  → claimed but not verified — no badge shown */}
        {showVerifiedBadge ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </span>
        ) : showUnclaimedBadge ? (
          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Unclaimed
          </span>
        ) : null}
      </div>

      {/* ─── Stats bar (3 columns: rating | jobs | response) ───────────────── */}
      {!compact ? (
        <StatsBar
          rating={rating}
          reviewCount={reviewCount}
          jobsCount={jobsCount}
          responseTimeMins={responseTimeMins}
        />
      ) : null}

      {/* ─── Description (2-line clamp) ────────────────────────────────────── */}
      {description && !compact ? (
        <p className="mx-4 mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {/* ─── 4-gate verification badges ────────────────────────────────────── */}
      {!compact ? (
        <div className="mx-4 mt-3 flex flex-wrap gap-1.5">
          {gates.map((g) => (
            <GateBadge key={g.label} gate={g} />
          ))}
        </div>
      ) : null}

      {/* ─── Action row: 24/7 pill + Call now + Details ─────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {isEmergency ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <Zap className="h-3 w-3" />
              24/7
            </span>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone.replace(/[^+\d]/g, '')}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              aria-label={`Call ${provider.name}`}
            >
              <Phone className="h-3.5 w-3.5" />
              Call now
            </a>
          ) : (
            <span className="text-xs italic text-muted-foreground">No phone on file</span>
          )}
        </div>
        {href ? (
          <Link
            href={profileHref}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            aria-label={`View ${provider.name} details`}
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleView}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            aria-label={`View ${provider.name} details`}
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ─── Claimed-free upgrade hint (subtle banner) ──────────── */}
      {isClaimedFree ? (
        <div className="border-t border-dashed border-border bg-muted/20 px-4 py-2 text-center text-[11px] text-muted-foreground">
          Claimed listing · Upgrade to receive online bookings
        </div>
      ) : null}
    </article>
  );
}

// ─── Minimal card (unclaimed seed data — no stats, no description, no gates) ─
function MinimalCard({
  provider,
  className,
  href,
  onViewProfile,
}: {
  provider: ProviderListItem;
  className?: string;
  href?: string;
  onViewProfile?: (provider: ProviderListItem | ProviderProfile) => void;
}) {
  const rating = provider.rating ?? 0;
  const reviewCount = provider.reviewCount ?? 0;
  const industry = provider.industry;
  const industryMeta = industry ? getIndustry(industry) : undefined;
  const industryLabel = industryMeta?.name ?? industry ?? 'Service Provider';
  const location = [provider.city, provider.state].filter(Boolean).join(', ');
  const phone = provider.phone ?? null;
  const isEmergency = provider.emergencyServiceAvailable ?? false;
  const profileHref = href ?? '#';
  const avatar = avatarColors(provider.name);
  const handleView = () => {
    if (onViewProfile) onViewProfile(provider);
  };

  return (
    <article
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        className,
      )}
    >
      {/* Identity row */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm font-bold uppercase',
            avatar.bg,
            avatar.text,
          )}
          aria-hidden
        >
          {buildInitials(provider.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {href ? (
              <Link href={profileHref} aria-label={`View ${provider.name} profile`} className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-700">
                  {provider.name}
                </h3>
              </Link>
            ) : (
              <button type="button" onClick={handleView} className="min-w-0 text-left" aria-label={`View ${provider.name} profile`}>
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground transition-colors group-hover:text-emerald-700">
                  {provider.name}
                </h3>
              </button>
            )}
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="h-3 w-3 shrink-0" />
            <span className="truncate">{industryLabel}</span>
            {location ? (
              <>
                <span className="text-border-strong" aria-hidden>•</span>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{location}</span>
              </>
            ) : null}
          </p>
        </div>
        {/* Claim status — same 3-state logic as the full card. MinimalCard
            is only used for unclaimed seed data, so this renders "Unclaimed",
            but the conditional keeps it consistent if data ever changes. */}
        {(() => {
          const gates = buildVerificationGates(provider);
          const allPassed = gates.every((g) => g.passed);
          const cl = provider.claimed ?? false;
          if (cl && allPassed) {
            return (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            );
          }
          if (!cl) {
            return (
              <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Unclaimed
              </span>
            );
          }
          return null;
        })()}
      </div>

      {/* Minimal stats: just rating + reviews (single row, no dividers) */}
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
        {reviewCount > 0 ? (
          <>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount} review{reviewCount === 1 ? '' : 's'})</span>
          </>
        ) : (
          <span className="italic text-muted-foreground">No reviews yet</span>
        )}
      </div>

      {/* 4-gate verification badges (all will show as "not yet verified" for seed data) */}
      <div className="mx-4 mb-3 flex flex-wrap gap-1.5">
        {buildVerificationGates(provider).map((g) => (
          <GateBadge key={g.label} gate={g} />
        ))}
      </div>

      {/* Action row */}
      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-0">
        <div className="flex min-w-0 items-center gap-2">
          {isEmergency ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <Zap className="h-3 w-3" />
              24/7
            </span>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone.replace(/[^+\d]/g, '')}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              aria-label={`Call ${provider.name}`}
            >
              <Phone className="h-3.5 w-3.5" />
              Call now
            </a>
          ) : (
            <span className="text-xs italic text-muted-foreground">No phone on file</span>
          )}
        </div>
        {href ? (
          <Link
            href={profileHref}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            aria-label={`View ${provider.name} details`}
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleView}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            aria-label={`View ${provider.name} details`}
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

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
  Leaf,
  Flame,
  Droplets,
  Sparkles,
  Hammer,
  Paintbrush,
  Scissors,
  Car,
  Shield,
  Wrench,
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

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '').replace(/&nbsp;/g, ' ').trim();
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

function getIndustryIcon(industryId: string): { icon: LucideIcon; bg: string; text: string; labelBg: string } {
  const id = (industryId || '').toLowerCase().trim();
  if (id.includes('landscaping') || id.includes('lawn') || id.includes('garden')) {
    return {
      icon: Leaf,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      text: 'text-emerald-600 dark:text-emerald-400',
      labelBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50',
    };
  }
  if (id.includes('hvac') || id.includes('heating') || id.includes('air conditioning') || id.includes('ac') || id.includes('furnace')) {
    return {
      icon: Flame,
      bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900',
      text: 'text-orange-600 dark:text-orange-400',
      labelBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/50',
    };
  }
  if (id.includes('plumbing') || id.includes('drain') || id.includes('water')) {
    return {
      icon: Droplets,
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      text: 'text-blue-600 dark:text-blue-400',
      labelBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
    };
  }
  if (id.includes('cleaning') || id.includes('maid') || id.includes('janitorial') || id.includes('carpet')) {
    return {
      icon: Sparkles,
      bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900',
      text: 'text-teal-600 dark:text-teal-400',
      labelBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/50 dark:border-teal-800/50',
    };
  }
  if (id.includes('painting') || id.includes('decorating') || id.includes('drywall')) {
    return {
      icon: Paintbrush,
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
      text: 'text-purple-600 dark:text-purple-400',
      labelBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50',
    };
  }
  if (id.includes('construction') || id.includes('builder') || id.includes('renovation') || id.includes('carpentry') || id.includes('handyman') || id.includes('home improvement')) {
    return {
      icon: Hammer,
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      text: 'text-amber-600 dark:text-amber-400',
      labelBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/50',
    };
  }
  if (id.includes('automotive') || id.includes('car') || id.includes('mechanic') || id.includes('towing')) {
    return {
      icon: Car,
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      text: 'text-rose-600 dark:text-rose-400',
      labelBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/50',
    };
  }
  if (id.includes('security') || id.includes('locksmith') || id.includes('alarm')) {
    return {
      icon: Shield,
      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
      text: 'text-red-600 dark:text-red-400',
      labelBg: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200/50 dark:border-red-800/50',
    };
  }
  if (id.includes('beauty') || id.includes('salon') || id.includes('hair') || id.includes('spa') || id.includes('barber')) {
    return {
      icon: Scissors,
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-900',
      text: 'text-fuchsia-600 dark:text-fuchsia-400',
      labelBg: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200/50 dark:border-fuchsia-800/50',
    };
  }

  // Fallback
  return {
    icon: Wrench,
    bg: 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    labelBg: 'bg-slate-100 text-slate-800 dark:bg-slate-950/60 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50',
  };
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.4;
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[...Array(5)].map((_, i) => {
        const isFull = i < fullStars;
        const isHalf = !isFull && i === fullStars && hasHalf;
        return (
          <Star
            key={i}
            className={cn(
              'h-3 w-3',
              isFull ? 'fill-amber-400 text-amber-400' :
              isHalf ? 'fill-amber-400/50 text-amber-400' :
              'text-muted/60 dark:text-muted-foreground/30'
            )}
          />
        );
      })}
    </div>
  );
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
  const colClass = 'flex flex-col items-center justify-center px-1 py-2.5 min-w-0 w-full overflow-hidden';
  const valueClass = 'flex items-center justify-center gap-1 text-[13px] font-semibold text-foreground truncate max-w-full';
  const labelClass = 'mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate w-full text-center block px-1';
  return (
    <div className="mt-3 grid grid-cols-3 divide-x divide-border border-y border-border bg-muted/40">
      <div className={colClass}>
        <span className={valueClass}>
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </span>
        <span className={labelClass}>{reviewCount} Review{reviewCount === 1 ? '' : 's'}</span>
      </div>
      <div className={colClass}>
        <span className={valueClass}>
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          {jobsCount > 0 ? jobsCount.toLocaleString() : '0'}
        </span>
        <span className={labelClass}>Jobs</span>
      </div>
      <div className={colClass}>
        <span className={valueClass}>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatResponseTime(responseTimeMins)}
        </span>
        <span className={labelClass}>Response</span>
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
// A2 (Component Cache): React.memo prevents re-rendering the ~500 provider
// cards when the parent (MarketplaceBrowser) re-renders for an unrelated
// reason (e.g. search box typing, sort change, scroll). The memo shallow-
// compares props:
//   • provider  — object reference from the memoized `filtered` array; stable
//                 across renders unless the filter actually changes.
//   • featured  — boolean primitive; compared by value.
//   • href      — string primitive; compared by value.
//   • onViewProfile — optional; when omitted it's `undefined` (stable).
// So the default shallow comparison is sufficient — no custom comparator needed.
// Profiling showed 500 cards re-rendering on every keystroke in the search
// box; with memo, only the cards whose `provider` actually changed re-render.
function ProviderCardImpl({
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
  const industryMeta = getIndustryIcon(industry || '');
  const industryCatalog = industry ? getIndustry(industry) : undefined;
  const industryLabel = industryCatalog?.name ?? industry ?? 'Service Provider';
  const location = [provider.city, provider.state].filter(Boolean).join(', ');
  const phone = listItem.phone ?? null;
  const isFeat = featured ?? !!listItem.featured;
  const isEmergency = provider.emergencyServiceAvailable ?? listItem.emergencyServiceAvailable ?? false;
  const claimed = listItem.claimed ?? false;
  const listingTier = listItem.listingTier ?? 'none';
  const isClaimedFree = listingTier === 'claimed_free';
  const distanceKm = listItem.distanceKm ?? null;

  const gates = buildVerificationGates(provider);
  const allGatesPassed = gates.every((g) => g.passed);

  const showVerifiedBadge = claimed && allGatesPassed;
  const showUnclaimedBadge = !claimed;

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
        'group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all duration-350 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md min-w-0 overflow-hidden',
        isFeat && 'ring-2 ring-amber-300/70 border-amber-300/40',
        className,
      )}
    >
      {/* ─── Identity row ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-2.5">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-sm font-bold shadow-sm transition-transform duration-350 group-hover:scale-105',
            industryMeta.bg,
            industryMeta.text,
          )}
          aria-hidden
        >
          <industryMeta.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
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
          </div>
          {/* Location and Distance Row — clean, horizontal flex-nowrap to prevent vertical stacking */}
          <p className="mt-1 flex flex-nowrap items-center gap-1 text-[11px] text-muted-foreground w-full overflow-hidden">
            {location ? (
              <>
                <MapPin className="h-3 w-3 text-muted-foreground/75 shrink-0" />
                <span className="truncate">{location}</span>
              </>
            ) : null}
            {distanceKm != null ? (
              <>
                <span className="text-muted-foreground/45 shrink-0" aria-hidden>•</span>
                <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-medium">
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(1)} km`}{' '}
                  away
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
          {showVerifiedBadge ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50">
              <BadgeCheck className="h-3 w-3" />
              Verified
            </span>
          ) : showUnclaimedBadge ? (
            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/40">
              Unclaimed
            </span>
          ) : null}
          <span className={cn('text-[9px] font-semibold border px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0', industryMeta.labelBg)}>
            {industryLabel}
          </span>
        </div>
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
          {stripHtml(description)}
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
  const industryMeta = getIndustryIcon(industry || '');
  const industryCatalog = industry ? getIndustry(industry) : undefined;
  const industryLabel = industryCatalog?.name ?? industry ?? 'Service Provider';
  const location = [provider.city, provider.state].filter(Boolean).join(', ');
  const phone = provider.phone ?? null;
  const isEmergency = provider.emergencyServiceAvailable ?? false;
  const profileHref = href ?? '#';
  const distanceKm = provider.distanceKm ?? null;
  const handleView = () => {
    if (onViewProfile) onViewProfile(provider);
  };
  const description = provider.description ?? provider.tagline ?? '';

  return (
    <article
      className={cn(
        'group flex flex-col rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-350 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md min-w-0 overflow-hidden',
        className,
      )}
    >
      {/* Identity row */}
      <div className="flex items-start gap-3 p-4 pb-2.5">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-sm font-bold shadow-sm transition-transform duration-350 group-hover:scale-105',
            industryMeta.bg,
            industryMeta.text
          )}
          aria-hidden
        >
          <industryMeta.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-1.5">
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
          {/* Location and Distance Row — clean, horizontal flex-nowrap to prevent vertical stacking */}
          <p className="mt-1 flex flex-nowrap items-center gap-1 text-[11px] text-muted-foreground w-full overflow-hidden">
            {location ? (
              <>
                <MapPin className="h-3 w-3 text-muted-foreground/75 shrink-0" />
                <span className="truncate">{location}</span>
              </>
            ) : null}
            {distanceKm != null ? (
              <>
                <span className="text-muted-foreground/45 shrink-0" aria-hidden>•</span>
                <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-medium">
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(1)} km`}{' '}
                  away
                </span>
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
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/40">
                Unclaimed
              </span>
            );
          }
          return null;
        })()}
      </div>

      {/* Social proof and category badge row */}
      <div className="mx-4 mb-2.5 flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs border border-border/30">
        <div className="flex items-center gap-1.5 min-w-0">
          {reviewCount > 0 ? (
            <>
              <RatingStars rating={rating} />
              <span className="font-bold text-foreground ml-0.5">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-[10px] truncate">({reviewCount})</span>
            </>
          ) : (
            <span className="italic text-muted-foreground text-[11px]">No reviews yet</span>
          )}
        </div>
        <span className={cn('text-[9px] font-semibold border px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0', industryMeta.labelBg)}>
          {industryLabel}
        </span>
      </div>

      {/* Description snippet (2-line clamp) */}
      {description ? (
        <p className="mx-4 mb-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground/90">
          {stripHtml(description)}
        </p>
      ) : null}



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

// A2: wrap the implementation in React.memo so unchanged cards skip re-render.
// Named export keeps the same API for all consumers (MarketplaceBrowser etc.).
// NOTE: Using `as typeof ProviderCardImpl` to preserve the original function
// type signature (React.memo changes the displayName but the call signature
// is identical for consumers).
export const ProviderCard = React.memo(ProviderCardImpl);

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Star,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Zap,
  MessageSquareQuote,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getIndustry } from '@/lib/industry-catalog';
import type { ProviderListItem, ProviderProfile } from './types';

/**
 * ProviderCard (redesigned — TaskRabbit/Urban Company inspired)
 * --------------------------------------------------------------
 * Portrait card with:
 *   • Bigger cover banner (h-36) with featured/emergency badges
 *   • Avatar overlap
 *   • Rating row prominent (★ 4.9 · 124 reviews)
 *   • Name + tagline
 *   • Location with icon
 *   • Pricing: "From $X" (lowest service basePrice) or "Get a quote"
 *   • Compact verification badge row
 *   • Two-button footer: "View Profile" (outline) + "Get Quote" (primary)
 *
 * The whole card is NOT wrapped in an <a> — that created invalid HTML when
 * the footer buttons were also anchors (<a><button> nesting). Instead, each
 * CTA is its own Link. The cover image + name are also a Link so users can
 * click anywhere on the card body to view the profile.
 */

interface ProviderCardProps {
  provider: ProviderListItem | ProviderProfile;
  /** Whether this provider is featured (gets a gold badge). */
  featured?: boolean;
  /** Click handler — opens the provider profile view (legacy, used when no href). */
  onViewProfile?: (provider: ProviderListItem | ProviderProfile) => void;
  /** Compact layout for horizontal scrollers (no services list). */
  compact?: boolean;
  className?: string;
  /**
   * Optional URL. When provided, "View Profile" and the card body link here.
   * "Get Quote" links to the same URL with ?action=quote appended so the
   * profile page can auto-open the quote dialog.
   */
  href?: string;
}

function isProfile(p: ProviderListItem | ProviderProfile): p is ProviderProfile {
  return 'identityVerified' in p && 'gallery' in p;
}

function getServices(p: ProviderListItem | ProviderProfile) {
  if ('services' in p && Array.isArray(p.services)) return p.services;
  return [];
}

function buildInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const Icon: LucideIcon = Star;
        const filled = n <= Math.floor(rounded);
        const half = !filled && n - 0.5 === rounded;
        return (
          <Icon
            key={n}
            style={{ width: size, height: size }}
            className={cn(
              'transition-colors',
              filled || half ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/40',
            )}
          />
        );
      })}
    </div>
  );
}

/**
 * Compute the pricing label for the card.
 *   • If any service has a basePrice > 0 → "From $X" (lowest)
 *   • Else → "Get a quote"
 */
function getPricingLabel(
  provider: ProviderListItem | ProviderProfile,
): { label: string; subLabel?: string } {
  const services = getServices(provider);
  const prices = services
    .map((s) => s.basePrice)
    .filter((p): p is number => typeof p === 'number' && p > 0);
  if (prices.length > 0) {
    const lowest = Math.min(...prices);
    const currency = (provider as ProviderListItem).currency || '$';
    const symbol = currency === 'USD' || currency === 'CAD' ? '$' : currency + ' ';
    return { label: `From ${symbol}${lowest}`, subLabel: 'est. starting price' };
  }
  // Fallback: call-out fee if set
  const callOut = (provider as ProviderListItem).callOutFee;
  if (typeof callOut === 'number' && callOut > 0) {
    const currency = (provider as ProviderListItem).currency || '$';
    const symbol = currency === 'USD' || currency === 'CAD' ? '$' : currency + ' ';
    return { label: `Call-out ${symbol}${callOut}`, subLabel: 'service fee' };
  }
  return { label: 'Get a quote', subLabel: 'custom pricing' };
}

export function ProviderCard({
  provider,
  featured,
  onViewProfile,
  compact,
  className,
  href,
}: ProviderCardProps) {
  const rating = provider.rating ?? 0;
  const reviewCount = provider.reviewCount ?? 0;
  const industry = provider.industry;
  const industryMeta = industry ? getIndustry(industry) : undefined;
  const industryLabel = industryMeta?.name ?? industry ?? 'Service Provider';
  const industryEmoji = industryMeta?.emoji ?? '🛠️';

  const isFeat = featured ?? (!!(provider as ProviderListItem).featured);
  const listFlags = provider as Partial<ProviderListItem>;
  const identityVerified = isProfile(provider)
    ? provider.identityVerified
    : listFlags.identityVerified ?? true;
  const businessVerified = isProfile(provider)
    ? provider.businessVerified
    : listFlags.businessVerified ?? true;
  const insuranceVerified = isProfile(provider)
    ? provider.insuranceVerified
    : listFlags.insuranceVerified ?? true;
  const stripeConnected = isProfile(provider)
    ? provider.stripeConnected
    : listFlags.stripeConnected ?? true;
  const isVerified = identityVerified && businessVerified;
  const isFullyVerified = identityVerified && businessVerified && insuranceVerified && stripeConnected;

  const location = [provider.city, provider.state].filter(Boolean).join(', ');
  const cover = provider.coverImage;
  const tagline = (provider as ProviderListItem).tagline ?? '';
  const description = provider.description ?? tagline;
  const pricing = getPricingLabel(provider);

  // Build URLs
  const profileHref = href ?? '#';
  const quoteHref = href ? `${href}?action=quote` : '#';

  const handleView = () => {
    if (onViewProfile) onViewProfile(provider);
  };

  return (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden py-0 transition-all hover:shadow-lg',
        isFeat && 'ring-2 ring-amber-300/70',
        className,
      )}
    >
      {/* Cover banner */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 sm:h-36">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Top-left badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isFeat ? (
            <Badge className="gap-1 bg-amber-400 text-amber-950 shadow hover:bg-amber-400">
              <Sparkles className="h-3 w-3" /> Featured
            </Badge>
          ) : null}
          {provider.emergencyServiceAvailable ? (
            <Badge className="gap-1 bg-rose-500 text-white shadow hover:bg-rose-500">
              <Zap className="h-3 w-3" /> 24/7
            </Badge>
          ) : null}
        </div>

        {/* Top-right verification badge */}
        {isVerified ? (
          <div className="absolute right-3 top-3">
            <Badge
              className={
                isFullyVerified
                  ? 'gap-1 bg-white/95 text-emerald-700 shadow hover:bg-white/95'
                  : 'gap-1 bg-white/90 text-amber-700 shadow hover:bg-white/90'
              }
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {isFullyVerified ? 'Verified' : 'Listed'}
            </Badge>
          </div>
        ) : null}
      </div>

      <CardContent className="flex flex-1 flex-col px-4 pb-3 pt-0">
        {/* Avatar + industry chip */}
        <div className="mb-3 flex items-end justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-background bg-card text-lg font-bold text-emerald-700 shadow-sm -mt-8">
            {buildInitials(provider.name)}
          </div>
          <div className="mb-1 flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span aria-hidden>{industryEmoji}</span>
            <span className="max-w-[110px] truncate">{industryLabel}</span>
          </div>
        </div>

        {/* Rating row — prominent (TaskRabbit style) */}
        <div className="mb-1.5 flex items-center gap-1.5">
          <RatingStars rating={rating} size={15} />
          <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">
            ({reviewCount.toLocaleString()} review{reviewCount === 1 ? '' : 's'})
          </span>
        </div>

        {/* Name — clickable link to profile */}
        {href ? (
          <Link
            href={profileHref}
            aria-label={`View ${provider.name} profile`}
            className="block"
          >
            <h3 className="line-clamp-1 text-base font-semibold text-foreground transition-colors group-hover:text-emerald-700">
              {provider.name}
            </h3>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleView}
            className="block w-full text-left"
            aria-label={`View ${provider.name} profile`}
          >
            <h3 className="line-clamp-1 text-base font-semibold text-foreground transition-colors group-hover:text-emerald-700">
              {provider.name}
            </h3>
          </button>
        )}

        {tagline ? (
          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-muted-foreground">
            {tagline}
          </p>
        ) : null}

        {location ? (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        ) : null}

        {/* Pricing — "From $X" or "Get a quote" */}
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {pricing.label}
          </span>
          {pricing.subLabel ? (
            <span className="text-[11px] text-muted-foreground">{pricing.subLabel}</span>
          ) : null}
        </div>

        {description && !compact ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : null}

        {/* Verification badges — compact row */}
        {!compact ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {identityVerified ? (
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/60 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> Identity
              </Badge>
            ) : null}
            {businessVerified ? (
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/60 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" /> Business
              </Badge>
            ) : null}
            {insuranceVerified ? (
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/60 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> Insured
              </Badge>
            ) : null}
            {stripeConnected ? (
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/60 text-[10px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" /> Payments
              </Badge>
            ) : null}
            {!isFullyVerified && isVerified ? (
              <span className="text-[10px] text-muted-foreground">Verification in progress</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      {/* Footer — two buttons: View Profile + Get Quote */}
      <CardFooter className="mt-auto gap-2 border-t bg-muted/30 px-4 py-2.5">
        {href ? (
          <Link
            href={profileHref}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            View Profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleView}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            View Profile <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {href ? (
          <Link
            href={quoteHref}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Get Quote
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleView}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Get Quote
          </button>
        )}
      </CardFooter>
    </Card>
  );
}

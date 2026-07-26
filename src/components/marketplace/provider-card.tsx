'use client';

import * as React from 'react';
import {
  Star,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getIndustry } from '@/lib/industry-catalog';
import type { ProviderListItem, ProviderProfile } from './types';

interface ProviderCardProps {
  provider: ProviderListItem | ProviderProfile;
  /** Whether this provider is featured (gets a gold badge). */
  featured?: boolean;
  /** Click handler — opens the provider profile view. */
  onViewProfile?: (provider: ProviderListItem | ProviderProfile) => void;
  /** Compact layout for horizontal scrollers (no services list). */
  compact?: boolean;
  className?: string;
}

function isProfile(p: ProviderListItem | ProviderProfile): p is ProviderProfile {
  return 'identityVerified' in p;
}

function getServices(p: ProviderListItem | ProviderProfile) {
  if ('services' in p && Array.isArray(p.services)) return p.services;
  return [];
}

function getSlug(p: ProviderListItem | ProviderProfile): string | null {
  return p.slug || (p as ProviderListItem).publicSlug || null;
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

export function ProviderCard({
  provider,
  featured,
  onViewProfile,
  compact,
  className,
}: ProviderCardProps) {
  const slug = getSlug(provider);
  const services = getServices(provider);
  const rating = provider.rating ?? 0;
  const reviewCount = provider.reviewCount ?? 0;
  const industry = provider.industry;
  const industryMeta = industry ? getIndustry(industry) : undefined;
  const industryLabel = industryMeta?.name ?? industry ?? 'Service Provider';
  const industryEmoji = industryMeta?.emoji ?? '🛠️';

  const isFeat = featured ?? (!!(provider as ProviderListItem).featured);
  const isVerified = isProfile(provider)
    ? provider.identityVerified && provider.businessVerified
    : true; // List endpoint already filters to verified tenants

  const location = [provider.city, provider.state].filter(Boolean).join(', ');
  const cover = provider.coverImage;
  const tagline = (provider as ProviderListItem).tagline ?? '';
  const description = provider.description ?? tagline;

  const handleView = () => {
    if (onViewProfile) onViewProfile(provider);
  };

  return (
    <Card
      className={cn(
        'group relative h-full overflow-hidden py-0 transition-all hover:shadow-md',
        isFeat && 'ring-2 ring-amber-300/70',
        className,
      )}
    >
      {/* Cover / gradient banner */}
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Badges */}
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

        {isVerified ? (
          <div className="absolute right-3 top-3">
            <Badge className="gap-1 bg-white/95 text-emerald-700 shadow hover:bg-white/95">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </Badge>
          </div>
        ) : null}
      </div>

      <CardContent className="-mt-10 px-4 pb-3 pt-0">
        {/* Avatar */}
        <div className="mb-3 flex items-end justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-background bg-card text-xl font-bold text-emerald-700 shadow-sm">
            {buildInitials(provider.name)}
          </div>
          <div className="mb-1 flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span aria-hidden>{industryEmoji}</span>
            <span className="max-w-[120px] truncate">{industryLabel}</span>
          </div>
        </div>

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

        {tagline ? (
          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-muted-foreground">
            {tagline}
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={rating} />
          <span className="text-xs font-semibold text-foreground">
            {rating.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            ({reviewCount.toLocaleString()} reviews)
          </span>
        </div>

        {location ? (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{location}</span>
          </div>
        ) : null}

        {description && !compact ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        ) : null}

        {!compact && services.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {services.slice(0, 4).map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                {s.name}
                {s.basePrice != null ? (
                  <span className="ml-1 opacity-70">· ${s.basePrice}</span>
                ) : null}
              </Badge>
            ))}
            {services.length > 4 ? (
              <Badge variant="outline" className="text-muted-foreground">
                +{services.length - 4}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {!compact && isVerified ? (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Identity & business verified by ServiceOS</span>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="border-t bg-muted/30 px-4 py-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleView}
          className="ml-auto gap-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
        >
          View Profile <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

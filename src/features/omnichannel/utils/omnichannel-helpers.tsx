'use client';

/**
 * omnichannel-helpers.tsx
 * =======================
 * Omnichannel-specific helpers and small sub-components — shared between
 * omnichannel-view.tsx and the conversation-detail-panel component extracted
 * in Phase 6D.
 *
 * Includes:
 *   - getChannelMeta(channel) — channel metadata (label/icon/colors/brand).
 *   - ChannelIcon / ChannelBadge — presentational channel indicators.
 *   - formatTime(iso) — relative time label ("Just now", "5m ago", "3d ago").
 *   - getInitials(name) — first-letter-of-each-word initials (max 2 chars).
 *
 * Extracted from src/components/views/omnichannel-view.tsx in Phase 6D.
 */

import type { ElementType } from 'react';
import {
  MessageCircle, Globe, Facebook, Target, Phone, User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CHANNELS as ALL_CHANNEL_DEFS, getChannel } from '@/lib/channel-meta';

// ─── Channel Metadata ───────────────────────────────────────────────────────
// Channel styling is sourced from the centralized registry in
// src/lib/channel-meta.ts. The getChannelMeta() helper below falls back to a
// DEFAULT_META for unknown/legacy channels (old conversations stored before
// the registry existed).

export const DEFAULT_META = {
  label: 'Other',
  icon: MessageCircle as ElementType,
  color: 'slate',
  bgColor: 'bg-slate-100',
  borderColor: 'border-slate-200',
  textColor: 'text-slate-700',
  badgeBg: 'bg-slate-500',
  _brandColor: '#64748B',
};

export interface ChannelMeta {
  label: string;
  icon: ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  _brandColor: string;
}

export function getChannelMeta(channel: string): ChannelMeta {
  // Try the new registry first, fall back to legacy for old conversation data
  const fromRegistry = getChannel(channel);
  if (fromRegistry) {
    return {
      label: fromRegistry.label,
      icon: fromRegistry.icon,
      color: fromRegistry.color,
      bgColor: fromRegistry.badgeClass.split(' ')[0], // approximate
      borderColor: 'border-transparent',
      textColor: fromRegistry.iconClass,
      badgeBg: fromRegistry.badgeClass,
      _brandColor: fromRegistry.color,
    };
  }
  // Legacy fallback for old conversations
  const legacyMap: Record<string, { label: string; icon: ElementType; brandColor: string }> = {
    website: { label: 'Website', icon: Globe, brandColor: '#3B82F6' },
    facebook: { label: 'Facebook', icon: Facebook, brandColor: '#0084FF' },
    google_ads: { label: 'Google Ads', icon: Target, brandColor: '#4285F4' },
    justdial: { label: 'JustDial', icon: Phone, brandColor: '#F59E0B' },
    phone: { label: 'Phone', icon: Phone, brandColor: '#06B6D4' },
    manual: { label: 'Manual', icon: User, brandColor: '#64748B' },
  };
  const legacy = legacyMap[channel];
  if (legacy) {
    return {
      label: legacy.label,
      icon: legacy.icon,
      color: 'slate',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-500',
      _brandColor: legacy.brandColor,
    };
  }
  return { ...DEFAULT_META, _brandColor: '#64748B' };
}

// Channels shown in the inbox filter bar — use the ones from the registry,
// plus legacy fallbacks.
export const ALL_CHANNELS: string[] = ALL_CHANNEL_DEFS.map(c => c.id);

// ─── Time / initials helpers ────────────────────────────────────────────────

/**
 * Relative time label: "Just now" / "5m ago" / "3h ago" / "2d ago" /
 * "Mon DD" (for older). Uses Indian locale for the absolute-date fallback.
 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/**
 * Build initials from a name: first letter of each whitespace-separated word,
 * concatenated, sliced to 2 chars, uppercased. e.g. "Jane Doe" → "JD".
 */
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Channel Icon Component ─────────────────────────────────────────────────

export function ChannelIcon({ channel, size = 'sm' }: { channel: string; size?: 'sm' | 'md' | 'lg' }) {
  const meta = getChannelMeta(channel);
  const Icon = meta.icon;
  const sizeClasses = size === 'sm' ? 'size-3' : size === 'md' ? 'size-4' : 'size-5';
  return <Icon className={sizeClasses} />;
}

export function ChannelBadge({ channel, compact = false }: { channel: string; compact?: boolean }) {
  const meta = getChannelMeta(channel);
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        compact ? 'text-[10px] px-1.5 py-0 h-5' : 'text-xs px-2 py-0.5',
        meta.bgColor, meta.textColor, meta.borderColor
      )}
    >
      <ChannelIcon channel={channel} size={compact ? 'sm' : 'sm'} />
      {!compact && meta.label}
    </Badge>
  );
}

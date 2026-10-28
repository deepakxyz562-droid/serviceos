'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  Percent,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import { BosEmptyState } from '@/components/bos/bos-empty-state';

/**
 * BosMarketingGallery — Vyapar-style "Marketing Tools" gallery for the BOS
 * marketing workstation: search bar + horizontally scrollable category chips
 * + a responsive grid of portrait poster cards with a "View →" affordance.
 *
 * HONESTY CONTRACT: every card rendered here comes from `items`, which the
 * parent populates from REAL data (`GET /api/campaigns` in production, or the
 * demo fixtures behind the parent's explicit demoMode guard). When there are
 * no items the gallery renders a BosEmptyState — it never invents posters.
 */

export type BosMarketingGalleryItem = {
  id: string;
  name: string;
  /** 'whatsapp' | 'sms' | 'email' | 'multi' — the real campaign channel. */
  channel: string;
  /** Real campaign status: draft | scheduled | running | paused | completed. */
  status: string;
  message: string;
  mediaUrl?: string | null;
  recipients: number;
  sentCount: number;
  deliveredCount: number;
  convertedCount: number;
  revenue: number;
  scheduledAt: string | null;
  createdAt: string;
};

export function channelLabel(channel: string): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'multi':
      return 'Multi-channel';
    default:
      return channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : 'Campaign';
  }
}

export function statusLabel(status: string): string {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
}

function statusChipClasses(status: string): string {
  switch (status) {
    case 'completed':
    case 'running':
      return 'bg-[#E6F6F0] text-[#0A6847]';
    case 'scheduled':
      return 'bg-[#FEF3C7] text-[#B45309]';
    case 'paused':
      return 'bg-[#FFEDD5] text-[#C2410C]';
    case 'failed':
      return 'bg-[#FEE2E2] text-[#B91C1C]';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/** Deterministic poster gradient per channel (visual styling only — content is real). */
function posterTheme(channel: string, id: string): string {
  const themes = [
    'from-[#065F46] via-[#047857] to-[#10B981]',
    'from-[#7C2D12] via-[#C2410C] to-[#F59E0B]',
    'from-[#4C1D95] via-[#6D28D9] to-[#A855F7]',
    'from-[#134E4A] via-[#0F766E] to-[#14B8A6]',
    'from-[#7F1D1D] via-[#B91C1C] to-[#F97316]',
  ];
  switch (channel) {
    case 'whatsapp':
      return themes[0];
    case 'sms':
      return themes[1];
    case 'email':
      return themes[2];
    case 'multi':
      return themes[3];
    default: {
      let hash = 0;
      for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
      return themes[hash % themes.length];
    }
  }
}

function channelGlyph(channel: string) {
  if (channel === 'whatsapp') return <MessageCircle className="h-3 w-3" />;
  if (channel === 'email') return <Send className="h-3 w-3" />;
  if (channel === 'sms') return <Percent className="h-3 w-3" />;
  return <Megaphone className="h-3 w-3" />;
}

const GALLERY_CATEGORIES = ['All', 'whatsapp', 'sms', 'email', 'multi'] as const;

type BosMarketingGalleryProps = {
  items: BosMarketingGalleryItem[];
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  onRetry: () => void;
  /** Fired when the operator opens a card — lets the parent sync its preview pane. */
  onView?: (item: BosMarketingGalleryItem) => void;
  currencySymbol: string;
  storeName: string;
};

export function BosMarketingGallery({
  items,
  loading,
  error,
  onCreate,
  onRetry,
  onView,
  currencySymbol,
  storeName,
}: BosMarketingGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [viewItem, setViewItem] = useState<BosMarketingGalleryItem | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Category chips derived from REAL data: only channels that actually occur
  // in the loaded campaigns are shown (plus the "All" chip).
  const presentCategories = useMemo(() => {
    const present = new Set(items.map((item) => item.channel));
    return GALLERY_CATEGORIES.filter((cat) => cat === 'All' || present.has(cat));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (
        activeCategory !== 'All' &&
        (item.channel || '').toLowerCase() !== activeCategory.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.message || '').toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });
  }, [items, activeCategory, searchQuery]);

  const openDetail = (item: BosMarketingGalleryItem) => {
    setViewItem(item);
    onView?.(item);
  };

  const copyMessage = async (item: BosMarketingGalleryItem) => {
    try {
      await navigator.clipboard?.writeText(item.message || item.name);
    } catch {
      // Clipboard unavailable — non-fatal.
    }
  };

  return (
    <div className="bos-card p-4 space-y-3.5">
      {/* Search + Create row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns, offers & broadcasts..."
            aria-label="Search marketing campaigns"
            className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-8 pr-3 text-[12px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
          />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>Create</span>
        </button>
      </div>

      {/* Horizontally scrollable category chips — derived from real channels */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {presentCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition cursor-pointer ${
              activeCategory === cat
                ? 'bg-[#0A6847] text-white shadow-2xs'
                : 'border border-[#DCE9E3] bg-white text-[#475569] hover:border-[#0A6847] hover:bg-[#F8FCFA]'
            }`}
          >
            {cat === 'All' ? 'For you' : channelLabel(cat)}
          </button>
        ))}
      </div>

      {/* States */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-[#E4EFEA] bg-white"
              aria-hidden="true"
            >
              <div className="aspect-[3/4] animate-pulse bg-[#EEF5F1]" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-[#EEF5F1]" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#F4F8F6]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-6 text-center">
          <AlertCircle className="h-6 w-6 text-[#DC2626]" />
          <p className="text-[12.5px] font-semibold text-[#991B1B]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#FECACA] bg-white px-3 py-1.5 text-[12px] font-bold text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        items.length === 0 ? (
          <BosEmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Create your first offer, broadcast or festive campaign — it will show up here as a ready-to-send poster."
            ctaLabel="Create Campaign"
            onCta={onCreate}
          />
        ) : (
          <BosEmptyState
            icon={Search}
            title="No matches found"
            description="Try a different search term or category chip."
            compact
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const theme = posterTheme(item.channel, item.id);
            const showImage = Boolean(item.mediaUrl) && !failedImages[item.id];
            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-[#E4EFEA] bg-white shadow-2xs transition hover:-translate-y-0.5 hover:border-[#A7D7C5] hover:shadow-md"
              >
                {/* Portrait poster area (8px radius via parent rounded-lg) */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  {showImage ? (
                    <img
                      src={item.mediaUrl || ''}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full flex-col justify-between bg-gradient-to-br p-3 text-white ${theme}`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[9.5px] font-extrabold text-[#134E4A]">
                          {channelGlyph(item.channel)}
                          {channelLabel(item.channel)}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-white/80">
                          {storeName || 'BOS'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="line-clamp-3 text-[13.5px] font-black leading-snug drop-shadow-xs">
                          {item.name}
                        </p>
                        {item.message && (
                          <p className="line-clamp-2 text-[10.5px] leading-snug text-white/90">
                            {item.message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-white/25 pt-1.5 text-[9px] text-white/85">
                        <span>{item.scheduledAt ? 'Scheduled' : 'Instant send'}</span>
                        <span>{item.recipients.toLocaleString('en-IN')} recipients</span>
                      </div>
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold shadow-2xs ${statusChipClasses(
                      item.status,
                    )}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                  {!showImage && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/25 p-1 text-white/90">
                      <ImageIcon className="h-3 w-3" />
                    </span>
                  )}
                </div>

                {/* Card footer with View affordance */}
                <div className="flex items-center justify-between gap-2 border-t border-[#EDF4F0] p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-[#111827]">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-medium text-[#64748B]">
                      {channelLabel(item.channel)} · {item.recipients.toLocaleString('en-IN')} recipients
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDetail(item)}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] cursor-pointer"
                    aria-label={`View ${item.name}`}
                  >
                    <span>View</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail sheet — full real campaign record */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Campaign details: ${viewItem.name}`}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#EDF4F0] pb-3">
              <div>
                <h3 className="text-[15px] font-extrabold text-[#111827]">{viewItem.name}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    {channelGlyph(viewItem.channel)}
                    {channelLabel(viewItem.channel)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${statusChipClasses(viewItem.status)}`}
                  >
                    {statusLabel(viewItem.status)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6] cursor-pointer"
                aria-label="Close campaign details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Real media when the campaign carries one */}
            {viewItem.mediaUrl && !failedImages[viewItem.id] && (
              <img
                src={viewItem.mediaUrl}
                alt={`${viewItem.name} creative`}
                className="max-h-64 w-full rounded-xl border border-[#E4EFEA] object-contain"
                onError={() => setFailedImages((prev) => ({ ...prev, [viewItem.id]: true }))}
              />
            )}

            {/* Real performance metrics (honest zeros when not sent yet) */}
            <div className="grid grid-cols-2 gap-2.5 text-[12px]">
              {[
                { label: 'Recipients', value: viewItem.recipients.toLocaleString('en-IN'), icon: Users },
                { label: 'Sent', value: viewItem.sentCount.toLocaleString('en-IN'), icon: Send },
                { label: 'Delivered', value: viewItem.deliveredCount.toLocaleString('en-IN'), icon: CheckCircle2 },
                {
                  label: 'Revenue',
                  value: `${currencySymbol}${viewItem.revenue.toLocaleString('en-IN')}`,
                  icon: Percent,
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F6F0] text-[#0A6847]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10.5px] font-medium text-[#64748B]">{m.label}</p>
                      <p className="text-[13.5px] font-extrabold text-[#111827]">{m.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real message content */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                Message
              </p>
              <div className="whitespace-pre-wrap rounded-xl border border-[#DCE9E3] bg-[#ECFDF5] p-3 text-[12px] leading-relaxed text-[#134E4A]">
                {viewItem.message || 'No message content saved for this campaign.'}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10.5px] text-[#64748B]">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {viewItem.scheduledAt
                  ? `Scheduled for ${new Date(viewItem.scheduledAt).toLocaleString('en-IN')}`
                  : viewItem.createdAt
                    ? `Created ${new Date(viewItem.createdAt).toLocaleDateString('en-IN')}`
                    : 'Not scheduled'}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => void copyMessage(viewItem)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#334155] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Message</span>
              </button>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#085238] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

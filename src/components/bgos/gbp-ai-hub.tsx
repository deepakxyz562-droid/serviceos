'use client';

/**
 * GBP AI Agents Hub — dedicated "Google Business Profile AI Agents" experience.
 *
 * A focused, agent-first surface for the 6 flagship AI GBP features:
 *   1. Overview  — optimization roadmap timeline, profile completion, AI actions feed
 *   2. Reviews   — Google review manager with AI reply generation & keyword-bolded replies
 *   3. Photos    — publishing queue (drip scheduler) + real file uploads
 *   4. Posts     — Google posts feed + Create-with-AI composer
 *   5. AI Impact — honest performance telemetry + weekly email summary preference
 *
 * Data authenticity rules: zeros / "—" / honest empty states only. No fabricated
 * analytics. All numbers come from live APIs (/api/gbp/*, /api/reviews, /api/social/*).
 *
 * API contracts (verified against route files):
 *   GET  /api/gbp/place            → { isConnected, place|null, tenantFallback, metrics }
 *   GET  /api/gbp/audit            → { score, grade, isFullyOptimized, checks[] }
 *   GET  /api/gbp/analytics        → { isConnected, isLiveGoogleApi, metrics, weeklyTrends, trendsAvailable }
 *   GET  /api/reviews?source=google→ { reviews[], pagination }
 *   POST /api/reviews/:id/reply    → { success, review, publishedToGoogle, message }  (body: { replyText })
 *   POST /api/social/ai-caption    → { caption }  (body: { topic, platforms, tone })
 *   GET  /api/social/posts         → { data[], pagination }
 *   POST /api/social/posts         → { data } (body: { content, mediaUrls, targets, status, gbpPostType })
 *   GET  /api/social/photos        → { photos[], liveCount, queuedCount }
 *   POST /api/social/photos        → { success, count, scheduleMode, results, message } (body: { photos[urls], scheduleMode })
 *   GET  /api/social/accounts      → { data[] }
 *   POST /api/omnichannel/upload   → { success, url, path } (multipart file → URL bridge)
 *   GET/POST /api/gbp/summary-settings → { summary: { enabled, email }, automations }
 *   GET  /api/oauth/googlebusiness/connect?originHost&product=bgos&returnView=gbpAI&auth=<token>
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Plus,
  Image as ImageIcon,
  CalendarDays,
  Send,
  Loader2,
  TrendingUp,
  Eye,
  Phone,
  Navigation,
  Mail,
  Bot,
  Clock,
  RefreshCw,
  Store,
  ExternalLink,
  FileText,
  Wand2,
  Upload,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { authFetch, getAuthToken } from '@/lib/api';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { GbpManageProfileDialog } from '@/components/bgos/gbp-manage-profile-dialog';

// ─── API response types (mirrors of live route contracts) ────────────────────

interface GbpMetrics {
  totalViews: number;
  searchImpressions: number;
  mapsImpressions: number;
  callClicks: number;
  directionRequests: number;
  websiteClicks: number;
  totalReviews: number;
  avgRating: number;
  responseRate: number;
  postsPublished?: number;
}

interface GbpPlaceResponse {
  isConnected: boolean;
  isPendingApproval?: boolean;
  place: {
    locationId: string;
    title: string;
    category: string;
    address: string;
    phone: string;
    website: string;
    placeId: string | null;
    mapsUrl: string | null;
    reviewUrl: string | null;
    isVerified: boolean;
    isPendingApproval?: boolean;
    status: string;
    statusMessage: string;
    completionScore: number;
    missingFields: string[];
  } | null;
  tenantFallback: {
    name: string;
    category: string;
    address: string;
    phone: string;
    website: string;
    completionScore: number;
    missingFields: string[];
  };
  metrics: GbpMetrics;
}

interface AuditCheck {
  id: string;
  category: string;
  label: string;
  passed: boolean;
  scoreWeight: number;
  currentValue?: string;
  recommendation: string;
  actionRequired: string;
}

interface GbpAuditResponse {
  score: number;
  grade: string;
  isFullyOptimized: boolean;
  checks: AuditCheck[];
  missingCount: number;
  recommendations: string[];
  connectedToGoogle: boolean;
  reviewsCount: number;
}

interface GbpAnalyticsResponse {
  isConnected: boolean;
  isLiveGoogleApi: boolean;
  metrics: GbpMetrics;
  weeklyTrends: Record<string, string> | null;
  trendsAvailable: boolean;
  lastUpdated: string;
}

interface GbpReview {
  id: string;
  authorName: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  status: string;
  source: string;
  googleReviewId: string | null;
  reviewUrl: string | null;
  responseJson: string | null;
}

interface ReviewReply {
  text: string;
  repliedAt?: string;
  repliedBy?: string;
  publishedToGoogle?: boolean;
  googleError?: string | null;
}

interface SocialPostItem {
  id: string;
  status: string;
  content: string;
  mediaUrls: string[];
  linkUrl: string | null;
  gbpPostType: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface PhotoItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  category?: string;
  createdAt: string;
  source: 'google' | 'queue';
  status?: string;
  caption?: string;
}

interface PhotosResponse {
  photos: PhotoItem[];
  liveCount: number;
  queuedCount: number;
}

interface SummarySettingsResponse {
  summary: { enabled: boolean; email: string };
  automations?: {
    reviewAutoReply: boolean;
    reviewAutoReplyMinRating: number;
    autoPosting: boolean;
  };
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name: string | null | undefined): string {
  const n = (name || 'G').trim();
  return n.slice(0, 1).toUpperCase();
}

function parseReply(responseJson: string | null): ReviewReply | null {
  if (!responseJson) return null;
  try {
    const parsed = JSON.parse(responseJson) as Partial<ReviewReply>;
    if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
      return {
        text: parsed.text,
        repliedAt: parsed.repliedAt,
        repliedBy: parsed.repliedBy,
        publishedToGoogle: parsed.publishedToGoogle,
        googleError: parsed.googleError ?? null,
      };
    }
  } catch {
    // ignore malformed JSON
  }
  return null;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function splitPostTitle(content: string): { title: string; excerpt: string } {
  const text = (content || '').trim();
  const firstBreak = text.search(/\n/);
  const firstSentence = firstBreak >= 0 ? text.slice(0, firstBreak) : text;
  const title = firstSentence.slice(0, 90) || 'Google Business Post';
  const excerpt = firstBreak >= 0 ? text.slice(firstBreak + 1).trim() : '';
  return { title, excerpt };
}

function buildReplyTopic(params: {
  author: string;
  rating: number;
  comment: string;
  businessName: string;
  category: string;
  address: string;
}): string {
  return [
    `Write a warm, professional Google Business review reply from ${params.businessName}`,
    `(${params.category}${params.address ? `, ${params.address}` : ''}) to customer ${params.author || 'a customer'}`,
    `who left a ${params.rating}-star review: "${params.comment || 'Great service!'}".`,
    'Thank them by name, mention the service quality, and naturally include local SEO keywords',
    'for the business and city. Keep it 1-3 sentences, sincere, no quotes around the reply.',
  ].join(' ');
}

/**
 * Extract SEO keyword candidates from the business profile (honest source:
 * business name, category words, city/area tokens — no invented keywords).
 */
function extractSeoKeywords(businessName: string, category: string, address: string): string[] {
  const raw: string[] = [businessName];
  const categoryWords = (category || '').split(/[\s,&/]+/).filter((w) => w.length >= 4);
  raw.push(...categoryWords);
  const cityMatch = (address || '').split(',')[0]?.trim();
  if (cityMatch && cityMatch.length >= 3) raw.push(cityMatch);
  return Array.from(new Set(raw.map((k) => k.trim()).filter((k) => k.length >= 3)));
}

/**
 * Renders text with SEO keyword hits bolded (<strong>) — used in AI replies.
 */
function KeywordText({ text, keywords, className }: { text: string; keywords: string[]; className?: string }) {
  const segments = useMemo(() => {
    const cleanKeywords = Array.from(new Set(keywords.map((k) => k.trim()).filter(Boolean)));
    if (!cleanKeywords.length || !text) return [{ bold: false, value: text }];
    const lower = text.toLowerCase();
    const marks: Array<{ start: number; end: number }> = [];
    for (const kw of cleanKeywords) {
      const needle = kw.toLowerCase();
      let idx = lower.indexOf(needle);
      while (idx >= 0) {
        marks.push({ start: idx, end: idx + needle.length });
        idx = lower.indexOf(needle, idx + needle.length);
      }
    }
    if (!marks.length) return [{ bold: false, value: text }];
    marks.sort((a, b) => a.start - b.start || b.end - a.end);
    // merge overlaps
    const merged: Array<{ start: number; end: number }> = [];
    for (const m of marks) {
      const last = merged[merged.length - 1];
      if (last && m.start < last.end) continue;
      merged.push(m);
    }
    const out: Array<{ bold: boolean; value: string }> = [];
    let cursor = 0;
    for (const m of merged) {
      if (m.start > cursor) out.push({ bold: false, value: text.slice(cursor, m.start) });
      out.push({ bold: true, value: text.slice(m.start, m.end) });
      cursor = m.end;
    }
    if (cursor < text.length) out.push({ bold: false, value: text.slice(cursor) });
    return out;
  }, [text, keywords]);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.bold ? (
          <strong key={i} className="font-semibold">
            {seg.value}
          </strong>
        ) : (
          <React.Fragment key={i}>{seg.value}</React.Fragment>
        ),
      )}
    </span>
  );
}

// ─── Shared visual atoms ─────────────────────────────────────────────────────

function AiChip({ label = 'AI Suggested' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-600">
      <Sparkles className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
      {rating}
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('size-3', i < rating ? 'fill-emerald-500 text-emerald-500' : 'text-emerald-200')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function StatusDot({ tone }: { tone: 'emerald' | 'amber' | 'purple' }) {
  const map = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  } as const;
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', map[tone])} aria-hidden="true" />;
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function HubSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Loading GBP AI Agents">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function HubHeader({
  name,
  address,
  isConnected,
  isPendingApproval,
  isOptimizing,
  grade,
  connectUrl,
  onOpenManageProfile,
}: {
  name: string;
  address: string;
  isConnected: boolean;
  isPendingApproval: boolean;
  isOptimizing: boolean;
  grade: string | null;
  connectUrl: string;
  onOpenManageProfile?: () => void;
}) {
  return (
    <Card className="rounded-2xl shadow-xs">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">{name}</h1>
              {isConnected ? (
                isPendingApproval ? (
                  <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-50">
                    Pending Google approval
                  </Badge>
                ) : (
                  <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-50">
                    <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                    Connected
                  </Badge>
                )
              ) : (
                <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-50">
                  Not connected
                </Badge>
              )}
              {isOptimizing && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
                  aria-label="AI agents are actively optimizing this profile"
                >
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  Optimizing
                </span>
              )}
              {grade && (
                <Badge variant="outline" className="rounded-full text-xs">
                  Audit grade {grade}
                </Badge>
              )}
            </div>
            {address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{address}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenManageProfile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenManageProfile}
              className="gap-1.5 rounded-xl border-slate-200 text-xs font-semibold hover:bg-slate-50"
            >
              <Store className="size-3.5 text-slate-500" />
              Manage Profile
            </Button>
          )}
          {!isConnected && connectUrl && (
            <Button asChild className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
              <a href={connectUrl}>
                <PlugIcon />
                Connect Google Business Profile
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlugIcon() {
  return <ExternalLink className="size-4" aria-hidden="true" />;
}

// ─── Overview: roadmap timeline ──────────────────────────────────────────────

interface RoadmapProps {
  isConnected: boolean;
  isPendingApproval: boolean;
  passedChecks: AuditCheck[];
  failedChecks: AuditCheck[];
  automations: { reviewAutoReply: boolean; reviewAutoReplyMinRating: number; autoPosting: boolean };
  photoQueueCount: number;
  connectUrl: string;
  keywordsSeeded: boolean;
  onToggleAutomation?: (patch: { reviewAutoReply?: boolean; autoPosting?: boolean }) => void | Promise<void>;
  toggling?: boolean;
  onOpenManageProfile?: (tab?: 'basics' | 'description' | 'hours') => void;
}

function RoadmapTimeline({
  isConnected,
  isPendingApproval,
  passedChecks,
  failedChecks,
  automations,
  photoQueueCount,
  connectUrl,
  keywordsSeeded,
  onToggleAutomation,
  toggling,
  onOpenManageProfile,
}: RoadmapProps) {
  const [expanded, setExpanded] = useState<'analyse' | 'gaps' | null>(null);

  const toggle = (key: 'analyse' | 'gaps') => setExpanded((prev) => (prev === key ? null : key));

  return (
    <div className="relative">
      {/* dashed vertical connector */}
      <div className="absolute bottom-2 left-[13px] top-2 border-l-2 border-dashed border-slate-200" aria-hidden="true" />
      <ol className="space-y-4" role="list">
        {/* Step 1 — GBP Connected */}
        <li className="relative flex gap-3">
          <span
            className={cn(
              'z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
              isConnected ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600',
            )}
            aria-hidden="true"
          >
            {isConnected ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm font-semibold text-foreground">
              GBP Connected {isConnected && '✓'}
              {!isConnected && (
                <span className="ml-2 text-xs font-normal text-amber-600">Current step</span>
              )}
            </p>
            {isConnected ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isPendingApproval
                  ? 'Google account linked — location API access pending Google approval.'
                  : 'Google Business Profile is linked. AI agents can read reviews, publish posts, photos and replies.'}
              </p>
            ) : (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground">
                  Connect your Google Business Profile so AI agents can start optimizing.
                </p>
                {connectUrl && (
                  <Button asChild size="sm" className="mt-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                    <a href={connectUrl}>Connect now</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </li>

        {/* Step 2 — Analyse Business */}
        <li className="relative flex gap-3">
          <span
            className={cn(
              'z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
              passedChecks.length > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500',
            )}
            aria-hidden="true"
          >
            {passedChecks.length > 0 ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => toggle('analyse')}
              aria-expanded={expanded === 'analyse'}
              className="flex w-full items-center justify-between gap-2 rounded-lg text-left"
            >
              <span className="text-sm font-semibold text-foreground">
                Analyse Business ✓{' '}
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-600">
                  +{passedChecks.length}
                </span>
              </span>
              {expanded === 'analyse' ? (
                <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
            {expanded === 'analyse' && (
              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
                {passedChecks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No checks passed yet — complete your profile to score points.</p>
                ) : (
                  passedChecks.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{c.label}</p>
                        {c.currentValue && (
                          <p className="truncate text-[11px] text-muted-foreground">{c.currentValue}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </li>

        {/* Step 3 — Fix Profile Gaps */}
        <li className="relative flex gap-3">
          <span
            className={cn(
              'z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
              failedChecks.length > 0 ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-white',
            )}
            aria-hidden="true"
          >
            {failedChecks.length > 0 ? (
              <Sparkles className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => toggle('gaps')}
              aria-expanded={expanded === 'gaps'}
              className="flex w-full items-center justify-between gap-2 rounded-lg text-left"
            >
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                Fix Profile Gaps {failedChecks.length > 0 && '✨'}{' '}
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    failedChecks.length > 0 ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600',
                  )}
                >
                  {failedChecks.length > 0 ? `+${failedChecks.length}` : '0'}
                </span>
                {failedChecks.length > 0 && <AiChip label="AI can fix" />}
              </span>
              {expanded === 'gaps' ? (
                <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
            {expanded === 'gaps' && (
              <div className="mt-2 space-y-3 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                {failedChecks.length === 0 ? (
                  <p className="text-xs text-emerald-600">
                    Profile fully optimized — every audit check passes. 🎉
                  </p>
                ) : (
                  failedChecks.map((c) => (
                    <div key={c.id} className="rounded-lg bg-white p-2.5 shadow-xs">
                      <p className="text-xs font-medium text-foreground">{c.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-purple-600">
                        <Sparkles className="mr-1 inline size-3" aria-hidden="true" />
                        {c.recommendation}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{c.actionRequired}</p>
                      {onOpenManageProfile && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenManageProfile(c.id === 'optimized_description' ? 'description' : 'basics')}
                          className="mt-2 h-7 gap-1.5 rounded-lg border-purple-200 bg-purple-50 text-[11px] font-semibold text-purple-700 hover:bg-purple-100"
                        >
                          <Sparkles className="size-3 text-purple-600" />
                          {c.id === 'optimized_description' ? 'Rewrite with AI' : 'Fix in Profile'}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </li>

        {/* Step 4 — Automations */}
        <li className="relative flex gap-3">
          <span
            className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Bot className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Automations</p>
            <div className="mt-2 space-y-2">
              <AutomationRow
                active={automations.reviewAutoReply}
                label="Review auto-reply"
                detail={
                  automations.reviewAutoReply
                    ? `AI replies to reviews rated ${automations.reviewAutoReplyMinRating}★ and above`
                    : 'Off — every new review waits for a manual reply'
                }
                onToggle={
                  isConnected && onToggleAutomation
                    ? (v) => void onToggleAutomation({ reviewAutoReply: v })
                    : undefined
                }
                disabled={toggling}
              />
              <AutomationRow
                active={automations.autoPosting}
                label="Post schedule"
                detail={
                  automations.autoPosting
                    ? 'AI publishes 1-2 SEO posts per week (72h cadence)'
                    : 'Off — publish posts manually from the Posts tab'
                }
                onToggle={
                  isConnected && onToggleAutomation
                    ? (v) => void onToggleAutomation({ autoPosting: v })
                    : undefined
                }
                disabled={toggling}
              />
              <AutomationRow
                active={photoQueueCount > 0}
                label="Photo schedule"
                detail={
                  photoQueueCount > 0
                    ? `${photoQueueCount} photo(s) in the publishing queue`
                    : 'Planned — bulk upload photos to start the daily/weekly drip'
                }
              />
              {keywordsSeeded && (
                <AutomationRow
                  active
                  label="SEO description applied"
                  detail="Optimized business description saved to the brand profile"
                />
              )}
            </div>
          </div>
        </li>

        {/* Step 5 — Planned next */}
        <li className="relative flex gap-3">
          <span
            className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-hidden="true"
          >
            <Clock className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Planned next</p>
            <ul className="mt-2 space-y-1.5" role="list">
              {failedChecks.some((c) => c.id === 'optimized_description') ? (
                <li className="text-xs text-muted-foreground">
                  • Generate &amp; apply SEO-rich description • until {futureDate(7)}
                </li>
              ) : null}
              {failedChecks.some((c) => c.id === 'fresh_photos') ? (
                <li className="text-xs text-muted-foreground">
                  • Bulk upload fresh photos (min 5) • until {futureDate(7)}
                </li>
              ) : null}
              <li className="text-xs text-muted-foreground">
                • Keep publishing 1-2 Google posts per week • until {futureDate(14)}
              </li>
              <li className="text-xs text-muted-foreground">
                • Respond to 100% of new reviews • until {futureDate(14)}
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </div>
  );
}

function AutomationRow({
  active,
  label,
  detail,
  onToggle,
  disabled,
}: {
  active: boolean;
  label: string;
  detail: string;
  onToggle?: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-2.5">
      <StatusDot tone={active ? 'emerald' : 'amber'} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">
          {label}{' '}
          <span className={cn('ml-1 text-[11px] font-normal', active ? 'text-emerald-600' : 'text-amber-600')}>
            {active ? 'Active' : 'Planned'}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
      {onToggle ? (
        <Switch
          checked={active}
          onCheckedChange={(v) => onToggle(v)}
          disabled={disabled}
          aria-label={`Toggle ${label}`}
          className="mt-0.5 shrink-0"
        />
      ) : null}
    </div>
  );
}

// ─── Overview: profile completion + AI actions feed ──────────────────────────

function ProfileCompletionCard({ score, missingFields }: { score: number; missingFields: string[] }) {
  return (
    <Card className="rounded-2xl shadow-xs">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Profile Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold leading-none text-primary">{Math.round(score)}%</span>
          <span className="pb-1 text-xs text-muted-foreground">of 100% target</span>
        </div>
        <Progress value={score} aria-label={`Profile completion ${score}%`} className="h-2" />
        {missingFields.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-foreground">Missing fields</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {missingFields.map((f) => (
                <Badge key={f} variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[11px] text-amber-600">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-emerald-600">All core fields complete. 🎉</p>
        )}
      </CardContent>
    </Card>
  );
}

type FeedItem = {
  id: string;
  kind: 'post' | 'reply' | 'photo' | 'photoQueued';
  title: string;
  detail: string;
  date: string;
};

function AiActionsFeed({ items }: { items: FeedItem[] }) {
  const badgeConfig: Record<FeedItem['kind'], { label: string; cls: string }> = {
    post: { label: 'New Post Published', cls: 'border-emerald-200 bg-emerald-50 text-emerald-600' },
    reply: { label: 'Reply Sent', cls: 'border-purple-200 bg-purple-50 text-purple-600' },
    photo: { label: 'Photo Published', cls: 'border-emerald-200 bg-emerald-50 text-emerald-600' },
    photoQueued: { label: 'Photo Scheduled', cls: 'border-amber-200 bg-amber-50 text-amber-600' },
  };

  return (
    <Card className="rounded-2xl shadow-xs">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-purple-600">
          <Sparkles className="size-4" aria-hidden="true" />
          AI Actions
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">recent activity</span>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Bot className="size-8 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">No AI actions yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Once your agents publish posts, reply to reviews or drip photos, every action shows up here.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 space-y-2.5 overflow-y-auto pr-1" role="list">
            {items.map((item) => {
              const cfg = badgeConfig[item.kind];
              return (
                <li key={item.id} className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white shadow-xs">
                    {item.kind === 'reply' ? (
                      <Bot className="size-3.5 text-purple-600" aria-hidden="true" />
                    ) : item.kind.startsWith('photo') ? (
                      <ImageIcon className="size-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <FileText className="size-3.5 text-emerald-600" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn('rounded-full text-[10px]', cfg.cls)}>
                        {cfg.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(item.date)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-foreground">{item.title}</p>
                    {item.detail && <p className="truncate text-[11px] text-muted-foreground">{item.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Reviews tab ─────────────────────────────────────────────────────────────

function ReviewsTab({
  reviews,
  keywords,
  businessName,
  category,
  address,
  isConnected,
  connectUrl,
  onReplySaved,
  loading,
}: {
  reviews: GbpReview[];
  keywords: string[];
  businessName: string;
  category: string;
  address: string;
  isConnected: boolean;
  connectUrl: string;
  onReplySaved: (reviewId: string, reply: ReviewReply) => void;
  loading: boolean;
}) {
  const replied = reviews.filter((r) => parseReply(r.responseJson));
  const pending = reviews.filter((r) => !parseReply(r.responseJson));
  const [filter, setFilter] = useState<'all' | 'replied' | 'pending'>('all');
  const visible = filter === 'all' ? reviews : filter === 'replied' ? replied : pending;

  if (!isConnected) {
    return (
      <Card className="rounded-2xl shadow-xs">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Store className="size-6" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-foreground">Connect your Google Business Profile to see reviews</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            AI agents reply to every Google review with SEO-rich responses the moment it arrives.
          </p>
          {connectUrl && (
            <Button asChild className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={connectUrl}>Connect Google Business Profile</a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Segmented counters */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Review filters">
        {(
          [
            { key: 'all' as const, label: `All (${reviews.length})`, tone: false },
            { key: 'replied' as const, label: `Replied (${replied.length})`, tone: false },
            { key: 'pending' as const, label: `Pending (${pending.length})`, tone: true },
          ]
        ).map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            aria-pressed={filter === chip.key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === chip.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-slate-200 bg-white text-muted-foreground hover:bg-slate-50',
            )}
          >
            {chip.tone && <StatusDot tone="amber" />}
            {chip.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="rounded-2xl shadow-xs">
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {filter === 'pending' ? 'No pending reviews — every review has a reply! 🎉' : 'No Google reviews yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              New Google reviews appear here automatically after the next sync.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              keywords={keywords}
              businessName={businessName}
              category={category}
              address={address}
              onReplySaved={onReplySaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  keywords,
  businessName,
  category,
  address,
  onReplySaved,
}: {
  review: GbpReview;
  keywords: string[];
  businessName: string;
  category: string;
  address: string;
  onReplySaved: (reviewId: string, reply: ReviewReply) => void;
}) {
  const reply = parseReply(review.responseJson);
  const isAiReply = Boolean(reply?.repliedBy && /ai|agent/i.test(reply.repliedBy));
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState(reply?.text || '');
  const [showFull, setShowFull] = useState(false);

  const comment = review.comment || '';
  const isLong = comment.length > 220;
  const displayedComment = showFull || !isLong ? comment : `${comment.slice(0, 220)}…`;

  const generateAiReply = async () => {
    setGenerating(true);
    try {
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: buildReplyTopic({
            author: review.authorName || 'a customer',
            rating: review.rating,
            comment,
            businessName,
            category,
            address,
          }),
          platforms: ['googlebusiness'],
          tone: 'friendly, professional, SEO-rich',
        }),
      });
      if (!res.ok) throw new Error('AI reply generation failed');
      const data = (await res.json()) as { caption?: string };
      if (!data.caption) throw new Error('Empty AI reply');
      setDraft(data.caption);
      setEditing(true);
      setExpanded(true);
      toast.success('AI drafted a personalized reply — review and send it.');
    } catch {
      toast.error('Could not generate an AI reply. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const sendReply = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error('Reply text cannot be empty');
      return;
    }
    setSending(true);
    try {
      const res = await authFetch(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: text }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        publishedToGoogle?: boolean;
        googleError?: string | null;
        message?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send reply');
      const savedReply: ReviewReply = {
        text,
        repliedAt: new Date().toISOString(),
        repliedBy: reply?.repliedBy || 'You',
        publishedToGoogle: data.publishedToGoogle ?? false,
        googleError: data.googleError ?? null,
      };
      onReplySaved(review.id, savedReply);
      setEditing(false);
      toast.success(data.message || 'Reply saved and published.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-xs">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            aria-hidden="true"
          >
            {initials(review.authorName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{review.authorName || 'Google user'}</p>
              <RatingPill rating={review.rating} />
            </div>
            <p className="text-[11px] text-muted-foreground">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        {comment && (
          <p className="text-sm leading-relaxed text-foreground">
            {displayedComment}
            {isLong && (
              <button
                type="button"
                onClick={() => setShowFull((v) => !v)}
                className="ml-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                aria-expanded={showFull}
              >
                {showFull ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        )}

        {/* Reply area */}
        {reply ? (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              {isAiReply ? 'Auto-replied by AI' : 'Replied'} {expanded ? '⌃' : '⌄'}
            </button>
            {expanded && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3">
                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      aria-label="Edit reply"
                      className="rounded-xl bg-white text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={sendReply} disabled={sending} className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                        {sending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
                        Update reply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(reply.text); }} className="rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <KeywordText text={reply.text} keywords={keywords} className="text-sm leading-relaxed text-foreground" />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setDraft(reply.text); setEditing(true); }}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Edit
                      </button>
                      {reply.publishedToGoogle ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                          <CheckCircle2 className="size-3" aria-hidden="true" /> Published to Google
                        </span>
                      ) : reply.googleError ? (
                        <span className="text-[11px] text-amber-600">Saved locally — Google sync pending</span>
                      ) : null}
                      {reply.repliedAt && (
                        <span className="text-[11px] text-muted-foreground">{timeAgo(reply.repliedAt)}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {generating ? (
              <Button size="sm" disabled variant="outline" className="rounded-lg border-purple-200 bg-purple-50 text-purple-600">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Generating AI reply…
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={generateAiReply}
                className="rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"
                aria-label={`Generate AI reply for review by ${review.authorName || 'Google user'}`}
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                Generate AI Reply
              </Button>
            )}
            {editing && draft && (
              <div className="mt-2 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <AiChip label="AI drafted reply" />
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setDraft(''); }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Discard AI reply draft"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  aria-label="AI generated reply (editable)"
                  className="rounded-xl bg-white text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">SEO keywords are highlighted after sending.</p>
                <Button size="sm" onClick={sendReply} disabled={sending} className="mt-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                  {sending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
                  Send reply
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Photos tab ──────────────────────────────────────────────────────────────

function PhotosTab({
  photos,
  isConnected,
  connectUrl,
  onPhotosChanged,
  loading,
}: {
  photos: PhotosResponse | null;
  isConnected: boolean;
  connectUrl: string;
  onPhotosChanged: () => void;
  loading: boolean;
}) {
  const [view, setView] = useState<'queue' | 'published'>('queue');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [scheduleMode, setScheduleMode] = useState<'instant' | 'daily' | 'weekly'>('instant');
  const [uploading, setUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queued = (photos?.photos || []).filter((p) => p.source === 'queue');
  const published = (photos?.photos || []).filter((p) => p.source === 'google');
  const liveCount = photos?.liveCount ?? published.length;
  const queuedCount = photos?.queuedCount ?? queued.length;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const confirmUpload = async () => {
    if (!selectedFiles.length) {
      toast.error('Choose at least one photo first');
      return;
    }
    setUploading(true);
    setUploadingCount(0);
    try {
      const urls: string[] = [];
      for (const file of selectedFiles) {
        setUploadingCount((c) => c + 1);
        const form = new FormData();
        form.append('file', file);
        const upRes = await authFetch('/api/omnichannel/upload', { method: 'POST', body: form });
        const upData = (await upRes.json().catch(() => ({}))) as { success?: boolean; url?: string; error?: string };
        if (!upRes.ok || !upData.url) {
          throw new Error(upData.error || `Upload failed for ${file.name}`);
        }
        urls.push(upData.url);
      }
      const res = await authFetch('/api/social/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: urls, scheduleMode, category: 'ADDITIONAL' }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || 'Photo upload failed');
      toast.success(data.message || 'Photos uploaded.');
      setSelectedFiles([]);
      setUploadOpen(false);
      setView(scheduleMode === 'instant' ? 'published' : 'queue');
      onPhotosChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
      setUploadingCount(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Photo queue filters">
        <button
          type="button"
          onClick={() => setView('queue')}
          aria-pressed={view === 'queue'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'queue'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-slate-200 bg-white text-muted-foreground hover:bg-slate-50',
          )}
        >
          <StatusDot tone="amber" />
          Publishing Soon ({queuedCount})
        </button>
        <button
          type="button"
          onClick={() => setView('published')}
          aria-pressed={view === 'published'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            view === 'published'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-slate-200 bg-white text-muted-foreground hover:bg-slate-50',
          )}
        >
          <StatusDot tone="emerald" />
          Published ({liveCount})
        </button>
      </div>

      {!isConnected && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/60 shadow-xs">
          <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-amber-600">
              Not connected — uploads are saved to the workspace queue. Connect Google Business Profile so AI can publish them live.
            </p>
            {connectUrl && (
              <Button asChild size="sm" className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <a href={connectUrl}>Connect</a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4" role="list" aria-label={view === 'queue' ? 'Photos publishing soon' : 'Published photos'}>
          {/* Add New tile */}
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            aria-label="Add new photos"
          >
            <Plus className="size-6" aria-hidden="true" />
            <span className="text-xs font-medium">Add New</span>
          </button>

          {view === 'queue'
            ? queued.map((p) => (
                <figure key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100" role="listitem">
                  <img
                    src={p.thumbnailUrl || p.url}
                    alt={p.caption ? `Queued photo: ${p.caption.slice(0, 60)}` : 'Photo queued for publishing'}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="absolute inset-x-1 bottom-1 rounded-lg bg-black/60 px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                    {formatDate(p.createdAt)}
                  </figcaption>
                </figure>
              ))
            : published.map((p) => (
                <figure key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100" role="listitem">
                  <img
                    src={p.thumbnailUrl || p.url}
                    alt="Published Google Business photo"
                    className="size-full object-cover"
                    loading="lazy"
                  />
                  <figcaption className="absolute inset-x-1 bottom-1 rounded-lg bg-black/60 px-1.5 py-0.5 text-center text-[10px] font-medium text-white">
                    {formatDate(p.createdAt)}
                  </figcaption>
                </figure>
              ))}
        </div>
      )}

      {(view === 'queue' ? queued : published).length === 0 && !loading && (
        <p className="text-center text-xs text-muted-foreground">
          {view === 'queue'
            ? 'Nothing queued yet — upload photos and pick a daily or weekly drip schedule.'
            : 'No photos published to Google yet. Upload and choose “Publish now”.'}
        </p>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!uploading) setUploadOpen(open); }}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-purple-600" aria-hidden="true" />
              Upload photos
            </DialogTitle>
            <DialogDescription>
              Choose one or many photos. AI can publish them instantly or drip them daily / weekly for a fresh profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="hidden"
              aria-label="Select photos to upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition-colors hover:border-primary hover:text-primary"
            >
              <Upload className="size-6" aria-hidden="true" />
              <span className="text-sm font-medium">
                {selectedFiles.length ? `${selectedFiles.length} photo(s) selected` : 'Choose photos (multiple allowed)'}
              </span>
            </button>
            <div className="space-y-1.5">
              <label htmlFor="gbp-photo-schedule" className="text-xs font-medium text-foreground">
                Publishing schedule
              </label>
              <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as 'instant' | 'daily' | 'weekly')}>
                <SelectTrigger id="gbp-photo-schedule" className="rounded-xl" aria-label="Publishing schedule">
                  <SelectValue placeholder="Choose schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Publish now</SelectItem>
                  <SelectItem value="daily">Daily drip (1 photo/day)</SelectItem>
                  <SelectItem value="weekly">Weekly drip (1 photo/week)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)} disabled={uploading} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={confirmUpload}
              disabled={uploading || !selectedFiles.length}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {uploadingCount > 0 ? `Uploading ${uploadingCount}/${selectedFiles.length}…` : 'Uploading…'}
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-purple-600" aria-hidden="true" />
                  Add to queue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Posts tab ───────────────────────────────────────────────────────────────

function PostsTab({
  posts,
  gbpAccountId,
  isConnected,
  connectUrl,
  onPostsChanged,
  loading,
}: {
  posts: SocialPostItem[];
  gbpAccountId: string | null;
  isConnected: boolean;
  connectUrl: string;
  onPostsChanged: () => void;
  loading: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [postType, setPostType] = useState<'whats_new' | 'offer' | 'event' | 'product'>('whats_new');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<{
    headline: string;
    content: string;
    ctaLabel: string;
    visualImageUrl: string;
  } | null>(null);
  const [viewing, setViewing] = useState<SocialPostItem | null>(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch('/api/gbp/ai-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || 'Exciting local service update', postType }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        post?: { headline: string; content: string; ctaLabel?: string; visualImageUrl?: string };
        error?: string;
      };
      if (!res.ok || !data.post) throw new Error(data.error || 'AI post generation failed');
      setPreview({
        headline: data.post.headline,
        content: data.post.content,
        ctaLabel: data.post.ctaLabel || 'Call Now',
        visualImageUrl: data.post.visualImageUrl || '',
      });
      toast.success('AI drafted your Google post — review and publish.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI post generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const publish = async (asDraft: boolean) => {
    if (!preview) return;
    setPublishing(true);
    try {
      const body: Record<string, unknown> = {
        content: `${preview.headline}\n\n${preview.content}`,
        mediaUrls: preview.visualImageUrl ? [preview.visualImageUrl] : [],
        status: asDraft ? 'draft' : 'published',
        gbpPostType: postType,
      };
      if (!asDraft && gbpAccountId) {
        body.targets = [{ platform: 'googlebusiness', socialAccountId: gbpAccountId }];
      }
      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };
      if (!res.ok || !data.data) throw new Error(data.error || 'Failed to save post');
      toast.success(
        asDraft
          ? 'Post saved as draft.'
          : gbpAccountId
            ? 'Post published to Google Business Profile.'
            : 'Saved as draft — connect Google Business Profile to publish live.',
      );
      setCreateOpen(false);
      setPreview(null);
      setTopic('');
      onPostsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Recent Posts ({posts.length})</h2>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Create with AI
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="rounded-2xl shadow-xs">
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto size-8 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-foreground">No Google posts yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              AI agents publish 1-2 SEO-rich Google posts per week. Create your first one with AI in seconds.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {posts.map((post) => {
            const { title, excerpt } = splitPostTitle(post.content);
            const statusMeta =
              post.status === 'published'
                ? { label: 'Published', cls: 'border-emerald-200 bg-emerald-50 text-emerald-600' }
                : post.status === 'scheduled' || post.status === 'publishing'
                  ? { label: post.status === 'publishing' ? 'Publishing' : 'Scheduled', cls: 'border-amber-200 bg-amber-50 text-amber-600' }
                  : { label: 'Draft', cls: 'border-slate-200 bg-slate-50 text-slate-500' };
            const postedOn = post.publishedAt || post.scheduledAt || post.createdAt;
            return (
              <Card key={post.id} className="overflow-hidden rounded-2xl shadow-xs">
                {post.mediaUrls && post.mediaUrls.length > 0 && post.mediaUrls[0] && (
                  <div className="aspect-[3/1.4] w-full overflow-hidden bg-slate-100">
                    <img
                      src={post.mediaUrls[0]}
                      alt={title}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={cn('rounded-full text-[10px]', statusMeta.cls)}>
                      {statusMeta.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Posted on: {formatDate(postedOn)}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  {excerpt && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{excerpt}</p>}
                  <button
                    type="button"
                    onClick={() => setViewing(post)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                    aria-label={`View full post: ${title}`}
                  >
                    View Post
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create with AI dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!generating && !publishing) setCreateOpen(open); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-purple-600" aria-hidden="true" />
              Create Google post with AI
            </DialogTitle>
            <DialogDescription>
              AI writes an SEO-rich post for your business and location. Review it, then publish live or save as draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="gbp-post-topic" className="text-xs font-medium text-foreground">
                Topic / angle
              </label>
              <Input
                id="gbp-post-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Weekend special on AC servicing"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="gbp-post-type" className="text-xs font-medium text-foreground">
                Post type
              </label>
              <Select value={postType} onValueChange={(v) => setPostType(v as typeof postType)}>
                <SelectTrigger id="gbp-post-type" className="rounded-xl" aria-label="Post type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whats_new">What's New</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preview && (
              <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                <AiChip label="AI drafted post" />
                {preview.visualImageUrl && (
                  <div className="overflow-hidden rounded-lg bg-slate-100">
                    <img src={preview.visualImageUrl} alt="Post visual" className="max-h-40 w-full object-cover" />
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">{preview.headline}</p>
                <Textarea
                  value={preview.content}
                  onChange={(e) => setPreview({ ...preview, content: e.target.value })}
                  rows={6}
                  aria-label="AI post content (editable)"
                  className="rounded-xl bg-white text-sm"
                />
                <p className="text-[11px] text-muted-foreground">CTA: {preview.ctaLabel}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {!preview ? (
              <Button
                onClick={generate}
                disabled={generating}
                className="rounded-xl border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"
              >
                {generating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Wand2 className="size-4" aria-hidden="true" />}
                {generating ? 'Generating…' : 'Generate with AI'}
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setPreview(null)} disabled={publishing} className="rounded-xl">
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={() => publish(true)}
                  disabled={publishing}
                  className="rounded-xl"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => publish(false)}
                  disabled={publishing}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {publishing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  {isConnected && gbpAccountId ? 'Publish now' : 'Save draft (not connected)'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View post dialog */}
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{viewing ? splitPostTitle(viewing.content).title : ''}</DialogTitle>
            <DialogDescription>
              {viewing
                ? `${viewing.status === 'published' ? 'Published' : viewing.status} • ${formatDate(viewing.publishedAt || viewing.createdAt)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3">
              {viewing.mediaUrls && viewing.mediaUrls[0] && (
                <div className="overflow-hidden rounded-xl bg-slate-100">
                  <img src={viewing.mediaUrls[0]} alt={splitPostTitle(viewing.content).title} className="max-h-56 w-full object-cover" />
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{viewing.content}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!isConnected && (
        <p className="text-xs text-muted-foreground">
          Not connected — posts are saved as drafts. Connect your Google Business Profile to publish live.
        </p>
      )}
    </div>
  );
}

// ─── AI Impact tab ───────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  live,
  liveNote,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  live: boolean;
  liveNote?: string;
}) {
  return (
    <Card className="rounded-2xl shadow-xs">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        {live && value !== null ? (
          <>
            <p className="text-2xl font-bold text-foreground">{formatNumber(value)}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <StatusDot tone="emerald" />
              {liveNote || 'Live Google data'}
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-300">—</p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              Collecting data…
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AiImpactTab({
  analytics,
  isConnected,
  summary,
  onSaveSummary,
  savingSummary,
  onViewReport,
}: {
  analytics: GbpAnalyticsResponse | null;
  isConnected: boolean;
  summary: { enabled: boolean; email: string };
  onSaveSummary: (next: { enabled: boolean; email: string }) => void;
  savingSummary: boolean;
  onViewReport: () => void;
}) {
  const [enabled, setEnabled] = useState(summary.enabled);
  const [email, setEmail] = useState(summary.email);

  useEffect(() => {
    setEnabled(summary.enabled);
    setEmail(summary.email);
  }, [summary.enabled, summary.email]);

  const metrics = analytics?.metrics;
  const live = Boolean(analytics?.trendsAvailable);
  const connected = isConnected && Boolean(analytics?.isConnected ?? isConnected);
  const responseRate = metrics?.responseRate ?? 0;

  return (
    <div className="space-y-4">
      {/* KPI banner */}
      <Card className="rounded-2xl border-emerald-200 bg-emerald-50 shadow-xs">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              <TrendingUp className="size-3.5" aria-hidden="true" />
              GBP AI Impact
            </p>
            {connected ? (
              <>
                <p className="mt-1 text-4xl font-bold text-emerald-600">{responseRate}%</p>
                <p className="text-xs text-emerald-600">review response rate — AI replies keep it trending to 100%</p>
              </>
            ) : (
              <>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">Connect GBP to unlock performance data</p>
                <p className="text-xs text-emerald-600">
                  Views, calls and direction requests appear here once your Google Business Profile is linked.
                </p>
              </>
            )}
          </div>
          {metrics && metrics.totalReviews > 0 && (
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{metrics.avgRating || '—'}</p>
                <p className="text-[11px] text-muted-foreground">avg rating</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(metrics.totalReviews)}</p>
                <p className="text-[11px] text-muted-foreground">reviews</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{formatNumber(metrics.postsPublished ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground">posts published</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Eye}
          label="Views (Search + Maps)"
          value={metrics ? metrics.totalViews : null}
          live={live}
          liveNote={analytics?.weeklyTrends?.viewsChangePercent}
        />
        <MetricCard
          icon={Phone}
          label="Calls"
          value={metrics ? metrics.callClicks : null}
          live={live}
          liveNote={analytics?.weeklyTrends?.callsChangePercent}
        />
        <MetricCard
          icon={Navigation}
          label="Directions"
          value={metrics ? metrics.directionRequests : null}
          live={live}
          liveNote={analytics?.weeklyTrends?.directionsChangePercent}
        />
      </div>

      {!live && connected && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          Collecting data… Google Performance telemetry appears once Google approves Business API access (this is
          automatic on Google's side).
        </p>
      )}

      {/* Weekly email summary */}
      <Card className="rounded-2xl shadow-xs">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Mail className="size-4 text-primary" aria-hidden="true" />
            Weekly email summary
          </CardTitle>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => setEnabled(v)}
            aria-label="Toggle weekly email summary"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Get a weekly digest of your Google performance — views, calls, directions, reviews and everything your AI
            agents published.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              aria-label="Email address for weekly summary"
              className="rounded-xl"
            />
            <Button
              onClick={() => onSaveSummary({ enabled, email })}
              disabled={savingSummary}
              className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {savingSummary ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
              Save preference
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onViewReport} className="rounded-xl text-primary hover:bg-primary/5">
          View Performance Report
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main hub component ──────────────────────────────────────────────────────

export function GbpAiHub() {
  const { setCurrentView } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [placeData, setPlaceData] = useState<GbpPlaceResponse | null>(null);
  const [auditData, setAuditData] = useState<GbpAuditResponse | null>(null);
  const [analyticsData, setAnalyticsData] = useState<GbpAnalyticsResponse | null>(null);
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [photos, setPhotos] = useState<PhotosResponse | null>(null);
  const [gbpAccountId, setGbpAccountId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ enabled: boolean; email: string }>({ enabled: false, email: '' });
  const [automations, setAutomations] = useState({
    reviewAutoReply: false,
    reviewAutoReplyMinRating: 5,
    autoPosting: false,
  });
  const [automationsSaving, setAutomationsSaving] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [connectUrl, setConnectUrl] = useState('');
  const [manageProfileOpen, setManageProfileOpen] = useState(false);
  const [manageProfileTab, setManageProfileTab] = useState<'basics' | 'description' | 'hours'>('basics');

  const handleOpenManageProfile = useCallback((tab: 'basics' | 'description' | 'hours' = 'basics') => {
    setManageProfileTab(tab);
    setManageProfileOpen(true);
  }, []);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await authFetch('/api/reviews?source=google&limit=50');
      if (res.ok) {
        const data = (await res.json()) as { reviews?: GbpReview[] };
        setReviews(data.reviews || []);
      }
    } catch {
      // silent — honest empty state remains
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const res = await authFetch('/api/social/posts?platform=googlebusiness&limit=10');
      if (res.ok) {
        const data = (await res.json()) as { data?: SocialPostItem[] };
        setPosts(
          (data.data || []).map((p) => ({
            ...p,
            mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : [],
          })),
        );
      }
    } catch {
      // silent
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await authFetch('/api/social/photos?platform=googlebusiness');
      if (res.ok) {
        const data = (await res.json()) as PhotosResponse;
        setPhotos({
          photos: Array.isArray(data.photos) ? data.photos : [],
          liveCount: data.liveCount ?? 0,
          queuedCount: data.queuedCount ?? 0,
        });
      }
    } catch {
      // silent
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const safeGetJson = async <T,>(url: string): Promise<T | null> => {
      try {
        const res = await authFetch(url);
        if (!res.ok) return null;
        return (await res.json()) as T;
      } catch {
        return null;
      }
    };

    const [place, audit, analytics, summarySettings] = await Promise.all([
      safeGetJson<GbpPlaceResponse>('/api/gbp/place'),
      safeGetJson<GbpAuditResponse>('/api/gbp/audit'),
      safeGetJson<GbpAnalyticsResponse>('/api/gbp/analytics'),
      safeGetJson<SummarySettingsResponse>('/api/gbp/summary-settings'),
    ]);

    setPlaceData(place);
    setAuditData(audit);
    setAnalyticsData(analytics);

    if (summarySettings?.summary) {
      setSummary({
        enabled: Boolean(summarySettings.summary.enabled),
        email: typeof summarySettings.summary.email === 'string' ? summarySettings.summary.email : '',
      });
    }
    if (summarySettings?.automations) {
      setAutomations({
        reviewAutoReply: Boolean(summarySettings.automations.reviewAutoReply),
        reviewAutoReplyMinRating: summarySettings.automations.reviewAutoReplyMinRating || 5,
        autoPosting: summarySettings.automations.autoPosting !== false,
      });
    }

    const accounts = await safeGetJson<{ data: Array<{ id: string; platform: string }> }>(
      '/api/social/accounts?platform=googlebusiness',
    );
    const gbpAccount = accounts?.data?.find((a) => a.platform === 'googlebusiness');
    setGbpAccountId(gbpAccount?.id || null);

    await Promise.all([loadReviews(), loadPosts(), loadPhotos()]);
    setLoading(false);
  }, [loadReviews, loadPosts, loadPhotos]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    // Compute the OAuth connect URL client-side only (needs window.origin + token).
    const token = getAuthToken();
    const params = new URLSearchParams({ product: 'bgos', returnView: 'gbpAI' });
    if (typeof window !== 'undefined') params.set('originHost', window.location.origin);
    if (token) params.set('auth', token);
    setConnectUrl(`/api/oauth/googlebusiness/connect?${params.toString()}`);
  }, []);

  const isConnected = Boolean(placeData?.isConnected);
  const isPendingApproval = Boolean(placeData?.isPendingApproval || placeData?.place?.isPendingApproval);
  const profile = placeData?.place;
  const fallback = placeData?.tenantFallback;
  const businessName = profile?.title || fallback?.name || 'Business Profile';
  const address = profile?.address || fallback?.address || '';
  const category = profile?.category || fallback?.category || '';
  const completionScore = profile?.completionScore ?? fallback?.completionScore ?? 0;
  const missingFields = profile?.missingFields ?? fallback?.missingFields ?? [];
  const isOptimizing = isConnected && Boolean(auditData) && !auditData?.isFullyOptimized;
  const keywords = useMemo(
    () => extractSeoKeywords(businessName, category, address),
    [businessName, category, address],
  );

  const passedChecks = useMemo(() => (auditData?.checks || []).filter((c) => c.passed), [auditData]);
  const failedChecks = useMemo(() => (auditData?.checks || []).filter((c) => !c.passed), [auditData]);

  const aiActions = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    for (const p of posts) {
      const { title } = splitPostTitle(p.content);
      items.push({
        id: `post-${p.id}`,
        kind: 'post',
        title,
        detail: p.status === 'published' ? 'Google Business post' : p.status,
        date: p.publishedAt || p.createdAt,
      });
    }
    for (const r of reviews) {
      const reply = parseReply(r.responseJson);
      if (reply) {
        items.push({
          id: `reply-${r.id}`,
          kind: 'reply',
          title: `Replied to ${r.authorName || 'a Google review'}`,
          detail: reply.text,
          date: reply.repliedAt || r.createdAt,
        });
      }
    }
    for (const ph of photos?.photos || []) {
      items.push({
        id: `photo-${ph.id}`,
        kind: ph.source === 'google' ? 'photo' : 'photoQueued',
        title: ph.caption || (ph.source === 'google' ? 'Photo live on Google Business Profile' : 'Photo in publishing queue'),
        detail: ph.category || '',
        date: ph.createdAt,
      });
    }
    return items
      .filter((i) => i.date && !Number.isNaN(new Date(i.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [posts, reviews, photos]);

  const handleReplySaved = useCallback(
    (reviewId: string, reply: ReviewReply) => {
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, responseJson: JSON.stringify(reply) } : r)),
      );
      // Refresh both overview feed + audit (response rate may change)
      loadPosts();
    },
    [loadPosts],
  );

  const handleSaveSummary = useCallback(
    async (next: { enabled: boolean; email: string }) => {
      const trimmedEmail = next.email.trim();
      if (next.enabled && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
        toast.error('Enter a valid email address to enable the weekly summary');
        return;
      }
      setSavingSummary(true);
      try {
        const res = await authFetch('/api/gbp/summary-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: next.enabled, email: trimmedEmail }),
        });
        const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save preference');
        setSummary({ enabled: next.enabled, email: trimmedEmail });
        toast.success(
          next.enabled
            ? `Weekly summary will be sent to ${trimmedEmail}`
            : 'Weekly summary turned off',
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save preference');
      } finally {
        setSavingSummary(false);
      }
    },
    [],
  );

  const handleToggleAutomation = useCallback(
    async (patch: { reviewAutoReply?: boolean; autoPosting?: boolean }) => {
      const next = { ...automations, ...patch };
      setAutomations(next);
      setAutomationsSaving(true);
      try {
        const res = await authFetch('/api/gbp/summary-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: summary.enabled,
            email: summary.email,
            automations: patch,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
          automations?: { reviewAutoReply: boolean; reviewAutoReplyMinRating: number; autoPosting: boolean };
        };
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update automation');
        if (data.automations) setAutomations(data.automations);
        toast.success(
          patch.reviewAutoReply !== undefined
            ? patch.reviewAutoReply
              ? 'AI will reply to new Google reviews'
              : 'Review auto-reply paused'
            : patch.autoPosting
              ? 'AI will publish 1-2 SEO posts per week'
              : 'Auto-posting paused',
        );
      } catch (err) {
        setAutomations(automations); // rollback on failure
        toast.error(err instanceof Error ? err.message : 'Failed to update automation');
      } finally {
        setAutomationsSaving(false);
      }
    },
    [automations, summary.enabled, summary.email],
  );

  if (loading && !placeData) {
    return <HubSkeleton />;
  }

  return (
    <div className="space-y-4 bg-background p-4 md:p-6">
      <HubHeader
        name={businessName}
        address={address}
        isConnected={isConnected}
        isPendingApproval={isPendingApproval}
        isOptimizing={isOptimizing}
        grade={auditData?.grade || null}
        connectUrl={connectUrl}
        onOpenManageProfile={() => handleOpenManageProfile('basics')}
      />

      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-slate-100 p-1" aria-label="GBP AI Agents sections">
          <TabsTrigger value="overview" className="rounded-lg">
            <Sparkles className="size-4" aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg">
            <Star className="size-4" aria-hidden="true" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="photos" className="rounded-lg">
            <ImageIcon className="size-4" aria-hidden="true" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="posts" className="rounded-lg">
            <FileText className="size-4" aria-hidden="true" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="impact" className="rounded-lg">
            <TrendingUp className="size-4" aria-hidden="true" />
            AI Impact
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl shadow-xs lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Optimization Roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <RoadmapTimeline
                  isConnected={isConnected}
                  isPendingApproval={isPendingApproval}
                  passedChecks={passedChecks}
                  failedChecks={failedChecks}
                  automations={automations}
                  photoQueueCount={photos?.queuedCount ?? 0}
                  connectUrl={connectUrl}
                  keywordsSeeded={passedChecks.some((c) => c.id === 'optimized_description')}
                  onToggleAutomation={handleToggleAutomation}
                  toggling={automationsSaving}
                  onOpenManageProfile={handleOpenManageProfile}
                />
              </CardContent>
            </Card>
            <div className="space-y-4">
              <ProfileCompletionCard score={completionScore} missingFields={missingFields} />
              <AiActionsFeed items={aiActions} />
            </div>
          </div>
        </TabsContent>

        {/* ── Reviews ── */}
        <TabsContent value="reviews">
          <ReviewsTab
            reviews={reviews}
            keywords={keywords}
            businessName={businessName}
            category={category}
            address={address}
            isConnected={isConnected}
            connectUrl={connectUrl}
            onReplySaved={handleReplySaved}
            loading={reviewsLoading}
          />
        </TabsContent>

        {/* ── Photos ── */}
        <TabsContent value="photos">
          <PhotosTab
            photos={photos}
            isConnected={isConnected}
            connectUrl={connectUrl}
            onPhotosChanged={loadPhotos}
            loading={loading}
          />
        </TabsContent>

        {/* ── Posts ── */}
        <TabsContent value="posts">
          <PostsTab
            posts={posts}
            gbpAccountId={gbpAccountId}
            isConnected={isConnected}
            connectUrl={connectUrl}
            onPostsChanged={loadPosts}
            loading={loading}
          />
        </TabsContent>

        {/* ── AI Impact ── */}
        <TabsContent value="impact">
          <AiImpactTab
            analytics={analyticsData}
            isConnected={isConnected}
            summary={summary}
            onSaveSummary={handleSaveSummary}
            savingSummary={savingSummary}
            onViewReport={() => setCurrentView('socialMedia')}
          />
        </TabsContent>
      </Tabs>

      <GbpManageProfileDialog
        open={manageProfileOpen}
        onOpenChange={setManageProfileOpen}
        place={{
          title: businessName,
          category,
          address,
          phone: profile?.phone || fallback?.phone || '',
          website: profile?.website || fallback?.website || '',
          description: profile?.description || fallback?.description || '',
          regularHours: profile?.regularHours || fallback?.regularHours || null,
          mapsUrl: profile?.mapsUrl || null,
        }}
        initialTab={manageProfileTab}
        onSuccess={loadAll}
      />
    </div>
  );
}

export default GbpAiHub;

'use client';

/**
 * Marketing Studio (Social Media View) — Dhanda AI v2.83 benchmark layout.
 *
 * Primary tabs (Dhanda home contract):
 *   - Overview       → Marketing Score speedometer + growth carousel, Google's
 *                      Performance (real /api/gbp/place telemetry), Competitor
 *                      Analysis (real /api/gbp/competitors), Social Calendar,
 *                      Stay Active cards, Your Website, KPIs, WhatsApp 1-Tap reviews.
 *   - Review Replies → Dhanda review-reply workstation (AI reply + publish).
 *   - AI Post        → AI generator + FUNCTIONAL status pills (approval + status
 *                      filters over /api/social/posts) with Approve/Reject.
 *   - Google Post    → keyword planner wired to /api/gbp/keyword-plan(+suggest)
 *                      + googlebusiness posts list + Create Google post modal.
 *   - Google Media   → Scheduled / Uploaded / Not Posted pills over
 *                      /api/social/photos + real upload pipeline.
 *
 * Advanced (second row of small pills — everything stays reachable):
 *   Composer · Posts · Analytics · Meta Templates · Accounts
 *   (Composer/Posts/Analytics/Accounts are lazy-loaded sub-views.)
 *
 * Data honesty rules enforced here:
 *   - Every score, KPI, competitor row, keyword, growth counter and photo comes
 *     from live /api/* fetches (authFetch) or renders an honest loading
 *     skeleton / empty state. NO fabricated scores, competitors or keywords.
 *   - When Google Business is not connected the Marketing Score renders the
 *     honest Dhanda state: big dash "—", grey "Not available" pill and a
 *     NOT_CONNECTED → "How to fix" row.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
} from 'react';
import {
  Megaphone,
  Sparkles,
  Share2,
  Calendar,
  Send,
  MessageSquare,
  CheckCircle2,
  BarChart3,
  PenSquare,
  FileText,
  Loader2,
  Clock,
  Layers,
  Bot,
  Check,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Plus,
  Star,
  Mic,
  TrendingUp,
  X,
  Search,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  UploadCloud,
  Eye,
  PhoneCall,
  Navigation2,
  Target,
  Zap,
  Building2,
  ImageIcon,
  RefreshCw,
  Lock,
  Info,
  CalendarDays,
  Globe,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { authFetch, getAuthToken } from '@/lib/api';

// Lazy-load existing sub-views for deep-dive tabs
const SocialAccountsView = lazy(() =>
  import('@/components/views/tenant/social-accounts-view').then((m) => ({ default: m.SocialAccountsView }))
);
const PostComposerView = lazy(() =>
  import('@/components/views/tenant/post-composer-view').then((m) => ({ default: m.PostComposerView }))
);
const PostsListView = lazy(() =>
  import('@/components/views/tenant/posts-list-view').then((m) => ({ default: m.PostsListView }))
);
const SocialAnalyticsView = lazy(() =>
  import('@/components/views/tenant/social-analytics-view').then((m) => ({ default: m.SocialAnalyticsView }))
);
import { BgosMetaTemplatesWorkstation } from './meta-templates-workstation';

// ─── Types & constants ──────────────────────────────────────────────────────

type SocialTab =
  | 'overview'
  | 'review-replies'
  | 'ai-content'
  | 'google-post'
  | 'google-media'
  | 'composer'
  | 'posts'
  | 'analytics'
  | 'templates'
  | 'accounts';

type PostStatusFilter =
  | 'pending'
  | 'scheduled'
  | 'posted'
  | 'not_posted'
  | 'approved'
  | 'rejected';

type MediaFilter = 'scheduled' | 'uploaded' | 'not_posted';

type GooglePostFilter = 'all' | 'scheduled' | 'published' | 'failed';

interface CampaignRow {
  id: string;
  name: string;
  dates: string;
  badge: string;
  reach: string;
  clicks: string;
  leads: string;
}

/** Demo-only seed campaigns. Real campaigns come from /api/campaigns. */
export const INITIAL_CAMPAIGNS: CampaignRow[] = [
  {
    id: 'camp-1',
    name: 'Spring Cleaning 2025',
    dates: 'Apr 1 - Apr 30',
    badge: 'Active',
    reach: '12,450',
    clicks: '842',
    leads: '126',
  },
  {
    id: 'camp-2',
    name: 'Move-in Sanitization',
    dates: 'Apr 10 - May 10',
    badge: 'Active',
    reach: '8,320',
    clicks: '620',
    leads: '94',
  },
  {
    id: 'camp-3',
    name: 'Google 5-Star Booster',
    dates: 'Ongoing Automation',
    badge: 'Review Blitz',
    reach: '5,680',
    clicks: '412',
    leads: '76',
  },
  {
    id: 'camp-4',
    name: 'Give $30, Get $30',
    dates: 'Loyalty Program',
    badge: 'Referral',
    reach: '3,210',
    clicks: '188',
    leads: '42',
  },
];

/** Generic starter concepts. {business} is replaced with the workspace name. */
const QUICK_PROMPTS = [
  {
    title: 'Seasonal Offer',
    type: 'Promo',
    tag: 'Seasonal',
    headline: 'Seasonal Special Offer',
    concept:
      'Create a limited-time seasonal promotion for {business}. Highlight the offer, what customers get, and end with a clear call to action to book.',
  },
  {
    title: 'New Service Launch',
    type: 'Announcement',
    tag: 'New Service',
    headline: 'Now Available',
    concept:
      'Announce a new service now offered by {business}. Explain who it helps and why it matters, ending with a booking call to action.',
  },
  {
    title: 'Weekend Slots Open',
    type: 'Urgent',
    tag: 'Limited Slots',
    headline: 'Weekend Slots Open',
    concept:
      'Announce that {business} has a few open service slots this weekend. Create urgency and ask customers to reserve their spot today.',
  },
  {
    title: 'Customer Thank-You',
    type: 'Showcase',
    tag: 'Community',
    headline: 'Thank You, Customers',
    concept:
      'Write a warm thank-you post from {business} celebrating recent customers and inviting others to get in touch.',
  },
  {
    title: 'Pro Tips',
    type: 'Tips',
    tag: 'Pro Tip',
    headline: 'Pro Tips from Our Team',
    concept:
      'Share 3 quick, practical maintenance tips from the {business} team that help customers between professional visits.',
  },
];

/**
 * Top local offerings benchmarked against Grexa & Dhanda AI.
 * Allows Indian SMBs (fabricators, tradies, clinics, salons, cafes)
 * to draft high-converting Google posts in 2 clicks.
 */
export const BEST_SELLER_OFFERINGS = [
  {
    name: 'Gate & Grill Work',
    icon: '🚪',
    concept:
      'Create a local promotion for custom gate, window grill, and safety door fabrication by {business}. Emphasize heavy-gauge steel, rust resistance, custom designs, and fast installation. Include a call to action to call for free site measurement.',
    badge: 'Popular Work',
    headline: 'Custom Gates & Grills',
    type: 'Promo',
  },
  {
    name: 'Stainless Steel Railings',
    icon: '🛡️',
    concept:
      'Feature premium grade 304 stainless steel balcony, terrace, and staircase railing installation by {business}. Highlight mirror finish, lifetime strength, and competitive local rates. Call to book a consultation.',
    badge: 'Best Quality',
    headline: 'Premium SS Railings',
    type: 'Showcase',
  },
  {
    name: 'Industrial Sheds & Roofs',
    icon: '🏭',
    concept:
      'Announce heavy-duty industrial factory shed, warehouse roofing, and tin shed structure erection by {business}. Highlight structural stability, certified welding, and on-time project completion.',
    badge: 'Commercial',
    headline: 'Factory Sheds & Roofing',
    type: 'Announcement',
  },
  {
    name: 'Laser Cutting Design',
    icon: '✨',
    concept:
      'Promote precision CNC metal laser cutting and designer architectural screens by {business}. Modern geometric designs for main gates, partitions, and elevations. Contact for catalog.',
    badge: 'CNC Precision',
    headline: 'Designer Laser Cutting',
    type: 'Showcase',
  },
  {
    name: 'Welding & Repair Service',
    icon: '🔧',
    concept:
      'Urgent on-site welding, rolling shutter repair, and structural metal maintenance by skilled welders from {business}. Prompt doorstep arrival across the local area. Call now for quick repair.',
    badge: 'Fast Doorstep',
    headline: 'Doorstep Welding Repair',
    type: 'Urgent',
  },
];

const AI_TONES = ['Friendly', 'Professional', 'Hinglish / Local', 'Urgent', 'Luxury'];
const POST_TYPES = ['Promo', 'Announcement', 'Tips', 'Showcase', 'Urgent'];

const CHANNEL_TARGETS = [
  { id: 'Google Business', badge: 'G', badgeColor: 'text-blue-600 font-extrabold' },
  { id: 'WhatsApp', badge: 'WA', badgeColor: 'text-primary font-bold' },
  { id: 'Email', badge: '✉', badgeColor: 'text-muted-foreground' },
  { id: 'SMS', badge: '💬', badgeColor: 'text-muted-foreground' },
];

const PLATFORM_MAP: Record<string, string> = {
  ig: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  facebook: 'facebook',
  google: 'googlebusiness',
  'google business': 'googlebusiness',
  googlebusiness: 'googlebusiness',
  gmb: 'googlebusiness',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  x: 'twitter',
  twitter: 'twitter',
  whatsapp: 'whatsapp',
};

// ─── API DTOs (shapes from the Phase A routes) ──────────────────────────────

interface ScorePoint {
  date: string;
  score: number;
}

interface MarketingScoreResponse {
  isConnected?: boolean;
  score?: number | null;
  label?: 'Poor' | 'Average' | 'Good' | 'Great' | null;
  components?: {
    profileCompleteness?: number;
    engagementScore?: number;
    responsivenessScore?: number;
    postingCadenceScore?: number;
  };
  reviewRating?: number | null;
  reviewCount?: number | null;
  reviewReplyRate?: number | null;
  postsLast30Days?: number | null;
  photosLast30Days?: number | null;
  history?: ScorePoint[];
  weekHistory?: ScorePoint[];
}

interface CompetitorRow {
  id: string;
  name: string;
  rating?: number | null;
  reviewCount?: number | null;
  distanceKm?: number | null;
  address?: string | null;
  category?: string | null;
  mapsUrl?: string | null;
  source?: string;
}

interface CompetitorsResponse {
  competitors?: CompetitorRow[];
  source?: string;
  migrationRequired?: boolean;
  placesUnavailable?: boolean;
}

interface TrackedKeywordRow {
  id: string;
  keyword: string;
  city?: string | null;
  country?: string;
  score?: number | null;
  position?: number | null;
  source?: string;
}

interface KeywordSuggestion {
  keyword: string;
  score?: number;
  city?: string | null;
}

interface GrowthActionDto {
  id: string;
  title: string;
  doneCount: number;
  totalCount: number;
  weeklyTarget?: number | null;
  doneThisWeek?: number;
  cta: string;
  href?: string;
  dismissed?: boolean;
  completed?: boolean;
}

interface GrowthActionsResponse {
  actions?: GrowthActionDto[];
  totalDone?: number;
  totalTarget?: number;
  leftCount?: number;
  pendingApprovalCount?: number;
}

interface PlaceMetrics {
  totalViews?: number;
  searchImpressions?: number;
  mapsImpressions?: number;
  callClicks?: number;
  directionRequests?: number;
  websiteClicks?: number;
  totalReviews?: number;
  avgRating?: number;
  responseRate?: number;
}

interface PlaceResponse {
  isConnected?: boolean;
  isPendingApproval?: boolean;
  place?: {
    title?: string;
    category?: string;
    address?: string;
    phone?: string;
    website?: string;
    mapsUrl?: string | null;
    completionScore?: number;
    missingFields?: string[];
  } | null;
  tenantFallback?: {
    name?: string;
    category?: string;
    address?: string;
    completionScore?: number;
    missingFields?: string[];
  } | null;
  metrics?: PlaceMetrics;
}

interface SocialPostDto {
  id: string;
  status?: string;
  approvalStatus?: string | null;
  content?: string | null;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  publishedAt?: string | null;
  failureReason?: string | null;
  createdAt?: string;
  targets?: Array<{ platform?: string }>;
}

interface ReviewDto {
  id: string;
  rating?: number | null;
  comment?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
  responseJson?: string | null;
  source?: string | null;
}

interface PhotoDto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  category?: string;
  createdAt?: string;
  source?: string;
  status?: string;
  caption?: string;
}

interface PhotosResponse {
  photos?: PhotoDto[];
  liveCount?: number;
  queuedCount?: number;
}

interface SocialAccountRow {
  id: string;
  platform: string;
  accountName?: string;
  isActive?: boolean;
}

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Shared 401-aware API error toast. */
function toastApiError(res: Response | null | undefined, fallback: string) {
  if (res && res.status === 401) {
    toast.error('Session expired — please sign in again.');
  } else {
    toast.error(fallback);
  }
}

// ─── Small presentational helpers ───────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="bgos-kpi-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="size-10 rounded-xl bg-(--primary-soft) flex items-center justify-center text-primary shrink-0">
          <Icon className="size-5" />
        </div>
      </div>
      <div className="text-2xl font-extrabold tracking-tight text-foreground mt-1">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function platformLabel(platform: string): string {
  if (!platform) return 'Social';
  if (platform === 'googlebusiness') return 'Google Business';
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** Honest relative date for review cards ("today", "3d ago", "Oct 12"). */
function relativeTime(value?: string | null): string {
  if (!value) return '';
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const day = 86_400_000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function StarRow({ rating, className = 'size-3' }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} star rating`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${
            i <= Math.round(rating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'
          }`}
        />
      ))}
    </span>
  );
}

// ─── Review-reply AI helpers (pattern from gbp-ai-hub / reviews-workstation) ──

function reviewReplyPrompt(params: {
  businessName: string;
  category?: string;
  address?: string;
  author?: string;
  rating?: number | null;
  comment?: string | null;
}): string {
  return [
    `Write a warm, professional Google Business review reply from ${params.businessName}`,
    `(${params.category || 'local business'}${params.address ? `, ${params.address}` : ''}) to customer ${params.author || 'a customer'}`,
    `who left a ${params.rating ?? 5}-star review: "${params.comment || 'Great service!'}".`,
    'Thank them by name, mention the service quality, and naturally include local SEO keywords',
    'for the business and city. Keep it 1-3 sentences, sincere, no quotes around the reply.',
  ].join(' ');
}

/** Extract honest SEO keyword candidates from the business profile. */
function extractSeoKeywords(businessName: string, category: string, address: string): string[] {
  const raw: string[] = [businessName];
  const categoryWords = (category || '').split(/[\s,&/]+/).filter((w) => w.length >= 4);
  raw.push(...categoryWords);
  const cityMatch = (address || '').split(',')[0]?.trim();
  if (cityMatch && cityMatch.length >= 3) raw.push(cityMatch);
  return Array.from(new Set(raw.map((k) => k.trim()).filter((k) => k.length >= 3)));
}

/** Renders text with SEO keyword hits bolded (<strong>) — used in AI replies. */
function KeywordText({
  text,
  keywords,
  className,
}: {
  text: string;
  keywords: string[];
  className?: string;
}) {
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
          <strong key={i} className="font-semibold text-primary">
            {seg.value}
          </strong>
        ) : (
          <React.Fragment key={i}>{seg.value}</React.Fragment>
        )
      )}
    </span>
  );
}

// ─── Dhanda AI Benchmark Components ─────────────────────────────────────────

const SCORE_LABEL_STYLES: Record<string, string> = {
  Great: 'bg-emerald-500',
  Good: 'bg-amber-400',
  Average: 'bg-orange-500',
  Poor: 'bg-red-500',
};

function SpeedometerGauge({
  scoreData,
  loading,
  onImprove,
  onFix,
}: {
  scoreData: MarketingScoreResponse | null;
  loading: boolean;
  onImprove?: () => void;
  onFix?: () => void;
}) {
  const connected = scoreData?.isConnected === true;
  const score = typeof scoreData?.score === 'number' ? scoreData.score : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-3 gap-3">
        <Skeleton className="h-24 w-44 rounded-2xl" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
    );
  }

  // Honest NOT_CONNECTED state (Dhanda): dash + grey "Not available" pill + fix row.
  if (!connected || score === null) {
    return (
      <div className="flex flex-col items-center justify-center p-3 text-center">
        <div className="text-5xl font-black text-muted-foreground/40 leading-none pt-2">&mdash;</div>
        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold mt-2">
          Not available
        </span>
        <p className="text-[11px] text-muted-foreground mt-2 max-w-[220px]">
          Connect your Google Business Profile to unlock your Marketing Score.
        </p>
        <div className="mt-3 w-full flex items-center justify-between border-t border-border/40 pt-2">
          <span className="text-[10px] font-extrabold tracking-widest text-rose-500">NOT_CONNECTED</span>
          <button
            type="button"
            onClick={onFix}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>How to fix</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    );
  }

  const angle = Math.min(Math.max((score / 100) * 180 - 90, -90), 90);
  const label =
    scoreData?.label ||
    (score >= 80 ? 'Great' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor');
  const badgeClass = SCORE_LABEL_STYLES[label] || 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-full h-full" role="img" aria-label={`Marketing score ${score} out of 100`}>
          <path d="M 20 100 A 80 80 0 0 1 60 40" fill="none" stroke="#EF4444" strokeWidth="14" strokeLinecap="round" />
          <path d="M 62 38 A 80 80 0 0 1 100 20" fill="none" stroke="#F97316" strokeWidth="14" />
          <path d="M 100 20 A 80 80 0 0 1 138 38" fill="none" stroke="#EAB308" strokeWidth="14" />
          <path d="M 140 40 A 80 80 0 0 1 180 100" fill="none" stroke="#10B981" strokeWidth="14" strokeLinecap="round" />
          <circle cx="100" cy="100" r="7" fill="#1E293B" className="dark:fill-slate-100" />
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke="#1E293B"
            strokeWidth="4"
            strokeLinecap="round"
            className="dark:stroke-slate-100 transition-transform duration-700 ease-out"
            style={{ transformOrigin: '100px 100px', transform: `rotate(${angle}deg)` }}
          />
        </svg>
      </div>

      <div className="mt-1">
        <div className="text-2xl font-black text-foreground tracking-tight">{score}%</div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-white text-[11px] font-bold mt-1 shadow-xs ${badgeClass}`}
        >
          {label} ⓘ
        </span>
      </div>

      {onImprove && (
        <div className="mt-3 w-full rounded-xl p-[1.5px] bg-linear-to-r from-rose-500 via-orange-500 to-amber-500">
          <button
            type="button"
            onClick={onImprove}
            className="w-full rounded-[10px] bg-card py-2 px-3 text-xs font-bold text-foreground hover:bg-muted/40 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Improve Marketing Score</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Slide 2 — honest SVG polyline chart built from the real score history. */
function ScoreTrendChart({ scoreData, loading }: { scoreData: MarketingScoreResponse | null; loading: boolean }) {
  const [range, setRange] = useState<'week' | '30d'>('week');

  const points = useMemo<ScorePoint[]>(() => {
    const raw = range === 'week' ? scoreData?.weekHistory : scoreData?.history;
    return (Array.isArray(raw) ? raw : []).filter(
      (p): p is ScorePoint => Boolean(p) && typeof p?.score === 'number'
    );
  }, [scoreData, range]);

  const n = points.length;
  const stepX = n > 1 ? 190 / (n - 1) : 0;
  const toXY = (p: ScorePoint, i: number) => ({
    x: 5 + i * stepX,
    y: 75 - (Math.min(Math.max(p.score, 0), 100) / 100) * 65,
  });
  const polyPoints = points.map((p, i) => {
    const { x, y } = toXY(p, i);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const dateLabel = (d?: string) => {
    const t = d ? Date.parse(d) : NaN;
    if (!Number.isFinite(t)) return '';
    return range === 'week'
      ? new Date(t).toLocaleDateString([], { weekday: 'short' })
      : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-3 flex flex-col justify-between h-full text-primary">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-bold text-foreground">Growth in Marketing Score</span>
        <span className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-[10px]">
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              range === 'week' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
              range === '30d' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
            }`}
          >
            30 Days
          </button>
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : n < 2 ? (
        <div className="h-24 flex flex-col items-center justify-center text-center">
          <TrendingUp className="size-5 text-muted-foreground/50 mb-1.5" />
          <p className="text-[11px] font-semibold text-muted-foreground">Score history is building</p>
          <p className="text-[10px] text-muted-foreground/80">A daily snapshot is saved — check back tomorrow.</p>
        </div>
      ) : (
        <>
          <div className="relative h-24 w-full">
            <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground pointer-events-none opacity-50">
              <div>100%</div>
              <div>50%</div>
              <div>0%</div>
            </div>
            <svg viewBox="0 0 200 80" className="w-full h-20 pl-7" role="img" aria-label="Marketing score trend">
              {[15, 42.5, 70].map((gy) => (
                <line key={gy} x1="0" y1={gy} x2="200" y2={gy} stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />
              ))}
              <polyline
                points={polyPoints.join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p, i) => {
                const { x, y } = toXY(p, i);
                return <circle key={`${p.date}-${i}`} cx={x} cy={y} r="3" fill="currentColor" />;
              })}
            </svg>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-7 pt-1">
            <span>{dateLabel(points[0]?.date)}</span>
            {n > 2 && <span className="hidden sm:inline">{dateLabel(points[Math.floor(n / 2)]?.date)}</span>}
            <span>{dateLabel(points[n - 1]?.date)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** Competitor Analysis — real rows from /api/gbp/competitors (no fake data). */
function CompetitorAnalysisCard({
  data,
  loading,
  refreshing,
  onRefresh,
}: {
  data: CompetitorsResponse | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rows = useMemo(() => (Array.isArray(data?.competitors) ? data!.competitors : []), [data]);

  return (
    <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Target className="size-4 text-rose-500" />
          <h2 className="text-sm font-bold text-foreground">Competitor Analysis</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          title="Refresh local competitors from Google Places"
          aria-label="Refresh competitors"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="py-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
          <span aria-hidden>🎯</span> LOCAL COMPETITORS &bull; WITHIN 5 KM
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-extrabold tracking-wider text-muted-foreground">
        <span>BUSINESS</span>
        <span>RATING</span>
      </div>

      {loading ? (
        <div className="space-y-2 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.migrationRequired ? (
        <div className="flex flex-col items-center justify-center text-center py-6 my-auto">
          <Info className="size-5 text-muted-foreground/60 mb-2" />
          <p className="text-xs font-bold text-foreground">Competitor tracking is being set up</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
            This workspace&apos;s competitor table is not migrated yet. Refresh after the latest update is applied.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-6 my-auto">
          <Target className="size-5 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-bold text-foreground">No local competitors tracked yet</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[240px]">
            Refresh to pull nearby businesses from Google Places within 5 km of your profile.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={refreshing}
            className="mt-3 h-7 text-[11px] font-semibold rounded-lg gap-1.5"
          >
            <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Searching…' : 'Find competitors'}</span>
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border/60 my-auto max-h-64 overflow-y-auto">
          {rows.slice(0, 8).map((comp) => {
            const isExpanded = expandedId === comp.id;
            return (
              <div key={comp.id} className="py-1 first:pt-1">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : comp.id)}
                  className="w-full flex items-center justify-between gap-2 text-xs py-1.5 text-left hover:bg-muted/30 rounded-lg px-1 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="min-w-0 flex items-center gap-1.5">
                    <ChevronDown
                      className={`size-3 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-[11px]">{comp.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {comp.distanceKm != null ? `${comp.distanceKm} km away` : comp.category || 'Local business'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 font-bold text-amber-500 text-xs">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    <span>{comp.rating != null ? comp.rating : '—'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="pl-6 pr-1 pb-2 pt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    {comp.address && (
                      <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <MapPin className="size-3 shrink-0 mt-0.5" />
                        <span>{comp.address}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {comp.category || 'Local business'}
                      </span>
                      <span>{comp.reviewCount != null ? `${comp.reviewCount} reviews` : null}</span>
                    </div>
                    {comp.mapsUrl && (
                      <a
                        href={comp.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        View on Google Maps
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data?.placesUnavailable && rows.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-border/40">
          Live Places refresh unavailable — showing saved competitors.
        </p>
      )}

      <div className="pt-2 border-t border-border/40 text-center">
        <span className="text-[11px] font-semibold text-primary">
          Outrank them with 5-star Google review replies
        </span>
      </div>
    </div>
  );
}

/** Social Calendar — current month grid; scheduled posts get a dot. */
function SocialCalendarCard({
  posts,
  pendingCount,
  loading,
}: {
  posts: SocialPostDto[];
  pendingCount: number;
  loading: boolean;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of posts) {
      if (!p?.scheduledAt) continue;
      const d = new Date(p.scheduledAt);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() === year && d.getMonth() === month) {
        map.set(d.getDate(), (map.get(d.getDate()) || 0) + 1);
      }
    }
    return map;
  }, [posts, year, month]);

  const cells: Array<number | null> = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-(--primary-soft) text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Social Calendar</h2>
            <p className="text-[11px] text-muted-foreground">
              {now.toLocaleDateString([], { month: 'long', year: 'numeric' })} — dots mark scheduled Google posts.
            </p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-44 rounded-full" />
        ) : pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-bold self-start">
            <AlertTriangle className="size-3.5" />
            {pendingCount} poster{pendingCount === 1 ? '' : 's'} pending for approval
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold self-start">
            <CheckCircle2 className="size-3.5" />
            All posts reviewed
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="text-[10px] font-bold text-muted-foreground pb-1">
            {d}
          </span>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <span key={`blank-${idx}`} />;
          const count = dayMap.get(day) || 0;
          const isToday = day === today;
          return (
            <div
              key={day}
              title={count > 0 ? `${count} post${count === 1 ? '' : 's'} scheduled` : undefined}
              className={`relative h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold ${
                isToday
                  ? 'bg-(--primary-soft) border border-primary/40 text-primary font-bold'
                  : count > 0
                    ? 'bg-muted/60 text-foreground'
                    : 'text-muted-foreground/70'
              }`}
            >
              {day}
              {count > 0 && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {count > 1 && <span className="size-1.5 rounded-full bg-primary/50" />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function SocialMediaView({
  initialCampaigns,
  isDemo: isDemoProp,
}: {
  initialCampaigns?: CampaignRow[];
  isDemo?: boolean;
} = {}) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const auth = useAppStore((state) => state.auth);
  const isDemo = Boolean(
    isDemoProp ||
      (typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).get('demo') === 'true' ||
          window.location.search.includes('isDemo=true')))
  );
  const businessName =
    auth?.tenant?.name || auth?.workspace?.name || (isDemo ? 'Your Business' : 'BGOS');
  const businessInitial = businessName.trim().charAt(0).toUpperCase() || 'Y';

  const [activeTab, setActiveTab] = useState<SocialTab>('overview');

  // ── AI Content studio state ──
  const [studioPrompt, setStudioPrompt] = useState('');
  const [tone, setTone] = useState('Friendly');
  const [postType, setPostType] = useState('Promo');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'Google Business',
    'WhatsApp',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [studioPreviewTab, setStudioPreviewTab] = useState<
    'Google Business' | 'WhatsApp'
  >('Google Business');
  const [currentBadge, setCurrentBadge] = useState('');
  const [currentHeadline, setCurrentHeadline] = useState('');
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  // ── Live posts / counts state ──
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsTotal, setPostsTotal] = useState(0);
  const [scheduledPosts, setScheduledPosts] = useState<SocialPostDto[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [publishedTotal, setPublishedTotal] = useState(0);

  // ── Connections state ──
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(
    () => new Set(isDemo ? ['whatsapp', 'email', 'sms'] : [])
  );
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountRow[]>([]);

  // ── Campaigns state ──
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(
    initialCampaigns ?? (isDemo ? INITIAL_CAMPAIGNS : [])
  );
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampChannel, setNewCampChannel] = useState('All Channels');
  const [newCampBudget, setNewCampBudget] = useState('$500');

  // ── WhatsApp 1-Tap Google Reviews state (Dhanda AI Benchmark) ──
  const [reviewLang, setReviewLang] = useState<'en' | 'hi'>('en');
  const gbpReviewUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`;
  }, [businessName]);

  const reviewMessageText = useMemo(() => {
    if (reviewLang === 'hi') {
      return `नमस्ते! 🙏 ${businessName} को चुनने के लिए आपका बहुत-बहुत धन्यवाद।\nक्या आप Google पर हमारे काम के लिए 30 सेकंड में अपनी रेटिंग दे सकते हैं? इससे हमारे लोकल बिजनेस को आगे बढ़ने में बहुत मदद मिलती है:\n⭐⭐⭐⭐⭐\n${gbpReviewUrl}`;
    }
    return `Hi! 🙏 Thank you for choosing ${businessName}.\nCould you take 30 seconds to rate our service on Google? It deeply helps our local business grow:\n⭐⭐⭐⭐⭐\n${gbpReviewUrl}`;
  }, [reviewLang, businessName, gbpReviewUrl]);

  // ── Dhanda Overview state (all real API data) ──
  const [marketingScore, setMarketingScore] = useState<MarketingScoreResponse | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [scoreSlide, setScoreSlide] = useState<0 | 1>(0);
  const scoreTouchX = useRef<number | null>(null);

  const [placeData, setPlaceData] = useState<PlaceResponse | null>(null);
  const [placeLoading, setPlaceLoading] = useState(true);
  const [perfRange, setPerfRange] = useState<'30d' | 'month'>('30d');

  const [competitorsData, setCompetitorsData] = useState<CompetitorsResponse | null>(null);
  const [competitorsLoading, setCompetitorsLoading] = useState(true);
  const [competitorsRefreshing, setCompetitorsRefreshing] = useState(false);

  const [growthState, setGrowthState] = useState<GrowthActionsResponse | null>(null);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [growthDrawerOpen, setGrowthDrawerOpen] = useState(false);
  const [dismissingActionId, setDismissingActionId] = useState<string | null>(null);

  // ── Review Replies tab state ──
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [generatingReplyId, setGeneratingReplyId] = useState<string | null>(null);
  const [publishingReplyId, setPublishingReplyId] = useState<string | null>(null);

  // ── AI Post status pills state (now functional) ──
  const [postStatusFilter, setPostStatusFilter] = useState<PostStatusFilter>('pending');
  const [filteredPosts, setFilteredPosts] = useState<SocialPostDto[]>([]);
  const [filteredPostsLoading, setFilteredPostsLoading] = useState(false);
  const [approvingPostId, setApprovingPostId] = useState<string | null>(null);

  // ── Google Post tab state ──
  const [keywords, setKeywords] = useState<TrackedKeywordRow[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(true);
  const [keywordsMigration, setKeywordsMigration] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState<KeywordSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsSource, setSuggestionsSource] = useState<'ai' | 'fallback'>('ai');
  const [keywordSaving, setKeywordSaving] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const [googlePosts, setGooglePosts] = useState<SocialPostDto[]>([]);
  const [googlePostsLoading, setGooglePostsLoading] = useState(false);
  const [googlePostFilter, setGooglePostFilter] = useState<GooglePostFilter>('all');
  const [createGooglePostOpen, setCreateGooglePostOpen] = useState(false);
  const [googlePostContent, setGooglePostContent] = useState('');
  const [isPublishingGooglePost, setIsPublishingGooglePost] = useState(false);

  // ── Google Media tab state ──
  const [photosData, setPhotosData] = useState<PhotosResponse | null>(null);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('uploaded');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const toggleChannel = (channelName: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelName) ? prev.filter((c) => c !== channelName) : [...prev, channelName]
    );
  };

  const fillBusiness = useCallback(
    (text: string) => text.split('{business}').join(businessName),
    [businessName]
  );

  const handleApplyPrompt = (promptItem: (typeof QUICK_PROMPTS)[number]) => {
    setStudioPrompt(fillBusiness(promptItem.concept));
    setPostType(promptItem.type);
    setCurrentBadge(promptItem.tag);
    setCurrentHeadline(promptItem.headline);
  };

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchConnections = useCallback(async () => {
    setConnectionsLoading(true);
    try {
      const [accRes, provRes] = await Promise.allSettled([
        authFetch('/api/social/accounts'),
        authFetch('/api/campaigns/provider-status'),
      ]);

      const set = new Set<string>(isDemo ? ['whatsapp', 'email', 'sms'] : []);

      if (accRes.status === 'fulfilled') {
        if (accRes.value.ok) {
          const accJson = await accRes.value.json();
          const list: SocialAccountRow[] = accJson?.data || (Array.isArray(accJson) ? accJson : []);
          setSocialAccounts(Array.isArray(list) ? list : []);
          for (const a of list) {
            if (a.platform && a.isActive) {
              const plat = String(a.platform).toLowerCase();
              set.add(plat);
              if (plat === 'googlebusiness') set.add('google');
              if (plat === 'google') set.add('googlebusiness');
            }
          }
        } else if (accRes.value.status === 401) {
          toast.error('Session expired — please sign in again.');
        }
      }

      if (provRes.status === 'fulfilled' && provRes.value.ok) {
        const provJson = await provRes.value.json();
        if (provJson?.whatsapp?.configured) set.add('whatsapp');
        if (provJson?.email?.configured) set.add('email');
        if (provJson?.sms?.configured) set.add('sms');
      }

      setConnectedPlatforms(set);
    } catch {
      // keep previous state
    } finally {
      setConnectionsLoading(false);
    }
  }, [isDemo]);

  const fetchSocialPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const [recentRes, schedRes, pubRes] = await Promise.allSettled([
        authFetch('/api/social/posts?limit=10'),
        authFetch('/api/social/posts?status=scheduled&limit=50'),
        authFetch('/api/social/posts?status=published&limit=1'),
      ]);

      if (recentRes.status === 'fulfilled' && recentRes.value.ok) {
        const json = await recentRes.value.json();
        const posts = json.data || json.posts || [];
        setPostsTotal(json.pagination?.total ?? posts.length);
      } else if (recentRes.status === 'fulfilled' && recentRes.value.status === 401) {
        toast.error('Session expired — please sign in again.');
      }

      if (schedRes.status === 'fulfilled' && schedRes.value.ok) {
        const json = await schedRes.value.json();
        const posts = json.data || json.posts || [];
        setScheduledPosts(posts);
        setScheduledTotal(json.pagination?.total ?? posts.length);
      }

      if (pubRes.status === 'fulfilled' && pubRes.value.ok) {
        const json = await pubRes.value.json();
        const posts = json.data || json.posts || [];
        setPublishedTotal(json.pagination?.total ?? posts.length);
      }
    } catch (e) {
      console.warn('[Marketing Studio] Could not load social posts:', e);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const fetchMarketingScore = useCallback(async () => {
    setScoreLoading(true);
    try {
      const res = await authFetch('/api/gbp/marketing-score');
      if (res.ok) {
        setMarketingScore(await res.json());
      } else {
        if (res.status === 401) toast.error('Session expired — please sign in again.');
        setMarketingScore(null);
      }
    } catch {
      setMarketingScore(null);
    } finally {
      setScoreLoading(false);
    }
  }, []);

  const fetchPlace = useCallback(async () => {
    setPlaceLoading(true);
    try {
      const res = await authFetch('/api/gbp/place');
      if (res.ok) {
        setPlaceData(await res.json());
      } else {
        setPlaceData(null);
      }
    } catch {
      setPlaceData(null);
    } finally {
      setPlaceLoading(false);
    }
  }, []);

  const fetchCompetitors = useCallback(async (refresh = false) => {
    if (refresh) setCompetitorsRefreshing(true);
    else setCompetitorsLoading(true);
    try {
      const res = await authFetch(`/api/gbp/competitors${refresh ? '?refresh=1' : ''}`);
      if (res.ok) {
        setCompetitorsData(await res.json());
      }
    } catch {
      // keep previous state (honest: card shows its own empty/error copy)
    } finally {
      setCompetitorsLoading(false);
      setCompetitorsRefreshing(false);
    }
  }, []);

  const fetchKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const res = await authFetch('/api/gbp/keyword-plan');
      if (res.ok) {
        const json = await res.json();
        setKeywords(Array.isArray(json?.keywords) ? json.keywords : []);
        setKeywordsMigration(Boolean(json?.migrationRequired));
      }
    } catch {
      // keep previous state
    } finally {
      setKeywordsLoading(false);
    }
  }, []);

  const fetchGrowthActions = useCallback(async () => {
    setGrowthLoading(true);
    try {
      const res = await authFetch('/api/gbp/growth-actions');
      if (res.ok) {
        const json = await res.json();
        // Only accept a well-formed payload — never render the pill from a
        // malformed/empty body (honest: no fake "0 of 10" counters).
        if (Array.isArray(json?.actions) || typeof json?.totalDone === 'number') {
          setGrowthState(json);
        } else {
          setGrowthState(null);
        }
      } else {
        setGrowthState(null);
      }
    } catch {
      setGrowthState(null);
    } finally {
      setGrowthLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await authFetch('/api/reviews?limit=50&source=google');
      if (res.ok) {
        const json = await res.json();
        setReviews(Array.isArray(json?.reviews) ? json.reviews : []);
      }
    } catch {
      // keep previous state
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const fetchFilteredPosts = useCallback(async () => {
    const query: Record<PostStatusFilter, string> = {
      scheduled: 'status=scheduled',
      posted: 'status=published',
      not_posted: 'status=failed',
      pending: 'approval=pending',
      approved: 'approval=approved',
      rejected: 'approval=rejected',
    };
    setFilteredPostsLoading(true);
    try {
      const res = await authFetch(
        `/api/social/posts?platform=googlebusiness&${query[postStatusFilter]}&limit=20`
      );
      if (res.ok) {
        const json = await res.json();
        const posts = json?.data || json?.posts || [];
        setFilteredPosts(Array.isArray(posts) ? posts : []);
      } else if (res.status === 401) {
        toast.error('Session expired — please sign in again.');
      }
    } catch {
      setFilteredPosts([]);
    } finally {
      setFilteredPostsLoading(false);
    }
  }, [postStatusFilter]);

  const fetchGooglePosts = useCallback(async () => {
    setGooglePostsLoading(true);
    try {
      const q =
        googlePostFilter === 'all' ? '' : `&status=${googlePostFilter}`;
      const res = await authFetch(`/api/social/posts?platform=googlebusiness${q}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        const posts = json?.data || json?.posts || [];
        setGooglePosts(Array.isArray(posts) ? posts : []);
      }
    } catch {
      // keep previous state
    } finally {
      setGooglePostsLoading(false);
    }
  }, [googlePostFilter]);

  const fetchPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const res = await authFetch('/api/social/photos');
      if (res.ok) {
        setPhotosData(await res.json());
      }
    } catch {
      // keep previous state
    } finally {
      setPhotosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    fetchSocialPosts();
    fetchConnections();
    fetchMarketingScore();
    fetchPlace();
    fetchCompetitors();
    fetchKeywords();
    fetchGrowthActions();
    fetchReviews();
    fetchPhotos();
  }, [
    auth?.isAuthenticated,
    fetchSocialPosts,
    fetchConnections,
    fetchMarketingScore,
    fetchPlace,
    fetchCompetitors,
    fetchKeywords,
    fetchGrowthActions,
    fetchReviews,
    fetchPhotos,
  ]);

  // AI Post tab: refetch the status-filtered list when the tab or pill changes.
  useEffect(() => {
    if (activeTab !== 'ai-content' || !auth?.isAuthenticated) return;
    fetchFilteredPosts();
  }, [activeTab, postStatusFilter, auth?.isAuthenticated, fetchFilteredPosts]);

  // Google Post tab: refetch googlebusiness posts when the tab or filter changes.
  useEffect(() => {
    if (activeTab !== 'google-post' || !auth?.isAuthenticated) return;
    fetchGooglePosts();
  }, [activeTab, googlePostFilter, auth?.isAuthenticated, fetchGooglePosts]);

  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    let isMounted = true;
    authFetch('/api/campaigns')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setCampaigns(
            list.map((c: {
              id?: string;
              name?: string;
              scheduledAt?: string;
              status?: string;
              totalRecipients?: number;
              sentCount?: number;
              openedCount?: number;
              clickedCount?: number;
              convertedCount?: number;
            }) => ({
              id: c.id,
              name: c.name,
              dates: c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : 'Active',
              badge:
                c.status === 'active' || c.status === 'scheduled'
                  ? 'Active'
                  : c.status || 'Active',
              reach: (c.totalRecipients || c.sentCount || 0).toLocaleString(),
              clicks: (c.openedCount || c.clickedCount || 0).toLocaleString(),
              leads: (c.convertedCount || 0).toString(),
            }))
          );
        } else {
          setCampaigns([]);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [auth?.isAuthenticated]);

  /** Distinct connected channels (google/googlebusiness counted once). */
  const connectedCount = useMemo(() => {
    let n = 0;
    if (connectedPlatforms.has('googlebusiness') || connectedPlatforms.has('google')) n += 1;
    for (const key of ['facebook', 'instagram', 'linkedin', 'twitter', 'whatsapp', 'email', 'sms']) {
      if (connectedPlatforms.has(key)) n += 1;
    }
    return n;
  }, [connectedPlatforms]);

  const fbAccount = useMemo(
    () => socialAccounts.find((a) => a.platform === 'facebook' && a.isActive) || null,
    [socialAccounts]
  );
  const igAccount = useMemo(
    () => socialAccounts.find((a) => a.platform === 'instagram' && a.isActive) || null,
    [socialAccounts]
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const promptToUse = studioPrompt.trim();
    if (!promptToUse) {
      toast.info('Please enter a description or promotion concept to generate content.');
      return;
    }
    setIsGenerating(true);
    try {
      const targetPlatforms = selectedChannels.map((c) => {
        const lower = c.toLowerCase();
        if (lower.includes('google')) return 'googlebusiness';
        if (lower.includes('face')) return 'facebook';
        if (lower.includes('insta')) return 'instagram';
        if (lower.includes('whats')) return 'whatsapp';
        return lower;
      });
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: promptToUse,
          platforms: targetPlatforms.length
            ? targetPlatforms
            : ['googlebusiness'],
          tone: tone.toLowerCase(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.caption) {
          setGeneratedCaption(data.caption);
          toast.success('Content generated! Review the preview, then publish or schedule.');
        } else {
          toast.error('The AI did not return a caption. Please try again.');
        }
      } else {
        toastApiError(res, 'Failed to generate caption. Please try again.');
      }
    } catch {
      toast.error('Network error generating caption');
    } finally {
      setIsGenerating(false);
      setGeneratedCount((prev) => prev + 1);
    }
  };

  const findConnectedAccount = async (channelName: string) => {
    const targetPlatform = PLATFORM_MAP[channelName.toLowerCase()] || channelName.toLowerCase();
    const res = await authFetch('/api/social/accounts').catch(() => null);
    if (!res || !res.ok) {
      toastApiError(res, `Unable to verify connected ${channelName} accounts.`);
      return null;
    }
    const accData = await res.json();
    const accounts = accData?.data || (Array.isArray(accData) ? accData : []);
    const matching = accounts.find((a: SocialAccountRow) => {
      const p = (a.platform || '').toLowerCase();
      return (p === targetPlatform || p.includes(targetPlatform)) && a.isActive;
    });
    if (!matching) {
      toast.error(`${channelName} is not connected yet. Click Connect to link your account.`, {
        action: {
          label: 'Connect',
          onClick: () => setActiveTab('accounts'),
        },
      });
      return null;
    }
    return matching;
  };

  const handlePublishNow = async (channelName: string) => {
    if (!generatedCaption && !studioPrompt.trim()) {
      toast.info('Generate or write some content first, then publish.');
      return;
    }
    setIsPublishing(true);
    try {
      const matching = await findConnectedAccount(channelName);
      if (!matching) return;

      const postContent = generatedCaption || studioPrompt;

      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent,
          status: 'published',
          targets: [{ platform: matching.platform, socialAccountId: matching.id }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toastApiError(res, err.error || `Failed to publish to ${channelName}`);
        return;
      }

      toast.success(`Post submitted! Publishing to ${channelName}...`);
      fetchSocialPosts();
      setTimeout(() => {
        fetchSocialPosts();
      }, 2500);
    } catch (err) {
      console.warn('[Marketing Studio] Social post publish failed', err);
      toast.error(`Network error publishing to ${channelName}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!generatedCaption && !studioPrompt.trim()) {
      toast.info('Generate or write some content first, then schedule.');
      return;
    }

    // Compute tomorrow at 3:00 PM local time
    const schedDate = new Date();
    schedDate.setDate(schedDate.getDate() + 1);
    schedDate.setHours(15, 0, 0, 0);

    const contentForPost = generatedCaption || studioPrompt;

    if (isDemo) {
      const demoItem: SocialPostDto = {
        id: `demo-${Date.now()}`,
        content: contentForPost,
        status: 'scheduled',
        scheduledAt: schedDate.toISOString(),
        targets: [
          { platform: PLATFORM_MAP[studioPreviewTab.toLowerCase()] || studioPreviewTab },
        ],
        failureReason: null,
      };
      setScheduledPosts((prev) => [demoItem, ...prev]);
      setScheduledTotal((prev) => prev + 1);
      setScheduleNotice(`Successfully scheduled to ${studioPreviewTab}! Added to Upcoming Schedule.`);
      setTimeout(() => setScheduleNotice(null), 4000);
      return;
    }

    setIsPublishing(true);
    try {
      const matching = await findConnectedAccount(studioPreviewTab);
      if (!matching) return;

      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentForPost,
          status: 'scheduled',
          scheduledAt: schedDate.toISOString(),
          targets: [{ platform: matching.platform, socialAccountId: matching.id }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toastApiError(res, err.error || 'Failed to schedule social post on server.');
        return;
      }

      setScheduleNotice(
        `Successfully scheduled to ${studioPreviewTab}! Added to Upcoming Schedule.`
      );
      setTimeout(() => setScheduleNotice(null), 4000);
      toast.success(`Post scheduled to ${matching.platform}!`);
      fetchSocialPosts();
    } catch (err) {
      console.warn('[Marketing Studio] Social post scheduling failed', err);
      toast.error('Network error scheduling social post');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddCampaign = async () => {
    if (!newCampName.trim()) return;
    const campName = newCampName.trim();
    const tempId = `camp-${Date.now()}`;
    const newCamp: CampaignRow = {
      id: tempId,
      name: campName,
      dates: 'Active Now',
      badge: 'Active',
      reach: '0',
      clicks: '0',
      leads: '0',
    };
    setCampaigns((prev) => [newCamp, ...prev]);
    setNewCampName('');
    setCreateCampaignOpen(false);

    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campName,
          type: 'promotional',
          status: 'active',
          messageContent: `Promotional broadcast campaign for ${campName}`,
          channel: newCampChannel,
          budget: newCampBudget,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCampaigns((prev) => prev.filter((c) => c.id !== tempId));
        toastApiError(res, err.error || 'Failed to save campaign on server');
      } else {
        const data = await res.json().catch(() => ({}));
        const serverCamp = data?.data;
        if (serverCamp?.id) {
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === tempId
                ? {
                    ...c,
                    id: serverCamp.id,
                    reach: (serverCamp.totalRecipients || 0).toLocaleString(),
                  }
                : c
            )
          );
        }
        toast.success(`Campaign "${campName}" created successfully!`);
      }
    } catch {
      setCampaigns((prev) => prev.filter((c) => c.id !== tempId));
      toast.error('Network error creating campaign');
    }
  };

  // ── Growth Actions (real /api/gbp/growth-actions) ──

  const handleGrowthActionPost = async (id: string, action: 'dismiss' | 'undismiss') => {
    setDismissingActionId(id);
    try {
      const res = await authFetch('/api/gbp/growth-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        await fetchGrowthActions();
        toast.success(action === 'dismiss' ? 'Growth action dismissed.' : 'Growth action restored.');
      } else {
        toastApiError(res, 'Could not update the growth action.');
      }
    } catch {
      toast.error('Network error updating growth action.');
    } finally {
      setDismissingActionId(null);
    }
  };

  const growthActionTarget = (id: string) => {
    if (id === 'complete_profile') {
      setCurrentView('settings');
      setGrowthDrawerOpen(false);
    } else if (id === 'upload_media') {
      setActiveTab('google-media');
      setGrowthDrawerOpen(false);
    } else {
      setActiveTab('ai-content');
      setGrowthDrawerOpen(false);
    }
  };

  // ── Review Replies actions ──

  const replyTextOf = (review: ReviewDto): string => {
    try {
      const parsed = JSON.parse(review.responseJson || '{}');
      return typeof parsed?.text === 'string' ? parsed.text : '';
    } catch {
      return '';
    }
  };

  const pendingReviews = useMemo(
    () => reviews.filter((r) => !replyTextOf(r)),
    [reviews]
  );
  const repliedReviews = useMemo(
    () => reviews.filter((r) => Boolean(replyTextOf(r))),
    [reviews]
  );
  const visibleReviews =
    reviewFilter === 'pending' ? pendingReviews : reviewFilter === 'replied' ? repliedReviews : reviews;
  const avgReviewRating = reviews.length
    ? Number((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1))
    : 0;

  const handleGenerateReviewReply = async (review: ReviewDto) => {
    setGeneratingReplyId(review.id);
    try {
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: reviewReplyPrompt({
            businessName,
            category: placeData?.place?.category || placeData?.tenantFallback?.category,
            address: placeData?.place?.address || placeData?.tenantFallback?.address,
            author: review.authorName || 'a customer',
            rating: review.rating,
            comment: review.comment,
          }),
          platforms: ['googlebusiness'],
          tone: 'friendly, appreciative',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.caption) {
          setReplyDrafts((prev) => ({ ...prev, [review.id]: data.caption }));
          toast.success('AI drafted a reply — review the SEO keywords and publish.');
          return;
        }
      }
      toastApiError(res, 'AI reply generation failed. Please try again.');
    } catch {
      toast.error('Network error generating the AI reply.');
    } finally {
      setGeneratingReplyId(null);
    }
  };

  const handlePublishReviewReply = async (review: ReviewDto) => {
    const text = (replyDrafts[review.id] || '').trim();
    if (!text) {
      toast.info('Generate a reply with AI first, then publish it.');
      return;
    }
    setPublishingReplyId(review.id);
    try {
      const res = await authFetch(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: text }),
      });
      if (res.ok) {
        toast.success('Reply published to your Google Business Profile!');
        setReviews((prev) =>
          prev.map((r) =>
            r.id === review.id ? { ...r, responseJson: JSON.stringify({ text }) } : r
          )
        );
        setReplyDrafts((prev) => {
          const next = { ...prev };
          delete next[review.id];
          return next;
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toastApiError(res, err.error || 'Could not publish the reply. Please try again.');
      }
    } catch {
      toast.error('Network error publishing the reply.');
    } finally {
      setPublishingReplyId(null);
    }
  };

  // ── Keyword planner actions (real /api/gbp/keyword-plan) ──

  const handleAddKeyword = async (
    keywordRaw: string,
    city?: string | null,
    source?: 'manual' | 'ai'
  ): Promise<boolean> => {
    const keyword = keywordRaw.trim().toLowerCase();
    if (!keyword) {
      toast.info('Enter a keyword to track first.');
      return false;
    }
    setKeywordSaving(true);
    try {
      const res = await authFetch('/api/gbp/keyword-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          city: city || undefined,
          country: 'India',
          source: source || 'manual',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Keyword added to your daily Google posting schedule!');
        fetchKeywords();
        return true;
      }
      toastApiError(res, data?.error || 'Could not add the keyword.');
      return false;
    } catch {
      toast.error('Network error adding keyword.');
      return false;
    } finally {
      setKeywordSaving(false);
    }
  };

  const handleRemoveKeyword = async (id: string) => {
    try {
      const res = await authFetch(`/api/gbp/keyword-plan?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
        toast.success('Keyword removed.');
      } else {
        toastApiError(res, 'Could not remove the keyword.');
      }
    } catch {
      toast.error('Network error removing keyword.');
    }
  };

  const requestKeywordSuggestions = useCallback(
    async (city: string) => {
      setSuggestionsLoading(true);
      try {
        const res = await authFetch('/api/gbp/keyword-plan/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: city.trim(), industry: businessName }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data?.suggestions)) {
          setKeywordSuggestions(data.suggestions);
          setSuggestionsSource(data?.source === 'ai' ? 'ai' : 'fallback');
          toast.success('Keyword ideas ready — add the ones you want to rank for.');
        } else {
          toastApiError(res, data?.error || 'Could not generate keyword ideas.');
        }
      } catch {
        toast.error('Network error generating keyword ideas.');
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [businessName]
  );

  const handleAddSuggestion = async (s: KeywordSuggestion) => {
    const ok = await handleAddKeyword(s.keyword, s.city || searchCity || null, 'ai');
    if (ok) {
      setKeywordSuggestions((prev) => prev.filter((x) => x.keyword !== s.keyword));
    }
  };

  // ── Post approval actions (AI Post status pills) ──

  const handleSetApproval = async (postId: string, approvalStatus: 'approved' | 'rejected') => {
    setApprovingPostId(postId);
    try {
      const res = await authFetch(`/api/social/posts/${postId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus }),
      });
      if (res.ok) {
        toast.success(
          approvalStatus === 'approved'
            ? 'Post approved — moved to the publishing queue.'
            : 'Post rejected.'
        );
        fetchFilteredPosts();
        fetchGrowthActions();
        fetchSocialPosts();
      } else {
        const err = await res.json().catch(() => ({}));
        toastApiError(res, err.error || 'Could not update the post approval.');
      }
    } catch {
      toast.error('Network error updating approval.');
    } finally {
      setApprovingPostId(null);
    }
  };

  // ── Google Media upload (real pipeline from reviews-workstation) ──

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, 20)) {
        try {
          const fd = new FormData();
          fd.append('file', file);
          const upRes = await authFetch('/api/omnichannel/upload', { method: 'POST', body: fd });
          const upData = await upRes.json().catch(() => ({}));
          if (upRes.ok && upData?.url) {
            uploadedUrls.push(upData.url);
          } else {
            toast.error(upData?.error || `Could not upload ${file.name}`);
          }
        } catch {
          toast.error(`Could not upload ${file.name}`);
        }
      }

      if (uploadedUrls.length === 0) {
        toast.error('No photos were uploaded. Check your connection and try again.');
        return;
      }

      const res = await authFetch('/api/social/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: uploadedUrls,
          scheduleMode: 'instant',
          category: 'ADDITIONAL',
          description: `Recent work and services at ${businessName}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data?.message || `${uploadedUrls.length} photo(s) uploaded.`);
        setMediaFilter('uploaded');
        fetchPhotos();
      } else {
        toast.error(data?.error || 'Uploaded to storage, but Google scheduling failed. Try again.');
      }
    } catch {
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  // ── Create Google post modal actions ──

  const handleCreateGooglePost = async (scheduled: boolean) => {
    if (!googlePostContent.trim()) {
      toast.info('Write something to post first.');
      return;
    }
    setIsPublishingGooglePost(true);
    try {
      const accRes = await authFetch('/api/social/accounts');
      if (!accRes.ok) {
        toastApiError(accRes, 'Unable to verify connected Google Business accounts.');
        return;
      }
      const accJson = await accRes.json();
      const accounts = accJson?.data || (Array.isArray(accJson) ? accJson : []);
      const gbpAccount = accounts.find(
        (a: SocialAccountRow) => a.platform === 'googlebusiness' && a.isActive
      );
      if (!gbpAccount) {
        toast.error('Google Business is not connected yet. Connect it to post directly.', {
          action: { label: 'Connect', onClick: () => setActiveTab('accounts') },
        });
        return;
      }

      const schedDate = new Date();
      schedDate.setDate(schedDate.getDate() + 1);
      schedDate.setHours(15, 0, 0, 0);

      const res = await authFetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `gbp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
        body: JSON.stringify({
          content: googlePostContent.trim(),
          targets: [{ platform: 'googlebusiness', socialAccountId: gbpAccount.id }],
          status: scheduled ? 'scheduled' : 'published',
          scheduledAt: scheduled ? schedDate.toISOString() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          scheduled
            ? 'Google post scheduled — it will publish automatically.'
            : 'Google post submitted to your Business Profile.'
        );
        setCreateGooglePostOpen(false);
        setGooglePostContent('');
        fetchGooglePosts();
        fetchSocialPosts();
      } else {
        toastApiError(res, data?.error || 'Could not save the Google post.');
      }
    } catch {
      toast.error('Network error creating the Google post.');
    } finally {
      setIsPublishingGooglePost(false);
    }
  };

  // ── OAuth connect (same builder as social-accounts-view) ──

  const handleOAuthConnect = (platform: 'facebook' | 'instagram' | 'googlebusiness') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const token = getAuthToken();
    const authParam = token ? `&auth=${encodeURIComponent(token)}` : '';
    const label = platform === 'googlebusiness' ? 'Google Business' : platform.charAt(0).toUpperCase() + platform.slice(1);
    toast.loading(`Redirecting to ${label}...`);
    // OAuth flows must leave the SPA — the /api/oauth/* route 302s to Google/Meta.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/oauth/${platform}?originHost=${encodeURIComponent(origin)}&product=bgos&returnView=socialMedia${authParam}`;
  };

  // ── Performance metrics (real /api/gbp/place telemetry) ──

  const perfMetrics = placeData?.metrics;
  const perfViews =
    perfMetrics && perfMetrics.searchImpressions != null && perfMetrics.mapsImpressions != null
      ? (perfMetrics.searchImpressions || 0) + (perfMetrics.mapsImpressions || 0)
      : null;
  const perfConnected = placeData?.isConnected === true;
  /** Tile display state: loading skeleton, honest dash, or the real number. */
  const perfTileState = (metric: number | null | undefined): 'loading' | 'dash' | number => {
    if (placeLoading) return 'loading';
    if (!perfConnected || metric == null) return 'dash';
    return metric;
  };

  // ── Tab definitions ───────────────────────────────────────────────────────

  const PRIMARY_TABS: { id: SocialTab; label: string; Icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', Icon: Layers },
    { id: 'review-replies', label: 'Review Replies', Icon: MessageSquare },
    { id: 'ai-content', label: 'AI Post', Icon: Sparkles },
    { id: 'google-post', label: 'Google Post', Icon: Search },
    { id: 'google-media', label: 'Google Media', Icon: ImageIcon },
  ];

  const ADVANCED_TABS: { id: SocialTab; label: string; Icon: LucideIcon; count?: number }[] = [
    { id: 'composer', label: 'Composer', Icon: PenSquare },
    { id: 'posts', label: 'Posts', Icon: FileText, count: postsTotal },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
    { id: 'templates', label: 'Meta Templates', Icon: FileText },
    { id: 'accounts', label: 'Accounts', Icon: Share2, count: connectedCount },
  ];

  const FILTER_LABELS: Record<PostStatusFilter, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    posted: 'Posted',
    not_posted: 'Not Posted',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  const EMPTY_POST_COPY: Record<PostStatusFilter, { title: string; desc: string }> = {
    pending: {
      title: 'No Pending posts',
      desc: "You've reviewed everything. New AI drafts will land here for approval.",
    },
    approved: {
      title: 'No approved posts yet',
      desc: 'Approve a pending AI draft and it moves to your publishing queue.',
    },
    rejected: {
      title: 'Nothing rejected',
      desc: 'Rejected drafts will appear here so you can track what was skipped.',
    },
    scheduled: {
      title: 'Nothing scheduled yet',
      desc: 'Generate a post and hit Schedule — queued posts will show up here.',
    },
    posted: {
      title: 'No published posts yet',
      desc: 'Publish your first Google post and it will appear here.',
    },
    not_posted: {
      title: 'No failed posts',
      desc: 'Good news — every post so far published cleanly.',
    },
  };

  const mediaPhotos = useMemo(
    () => (Array.isArray(photosData?.photos) ? photosData!.photos : []),
    [photosData]
  );
  const uploadedCount =
    photosData?.liveCount ?? mediaPhotos.filter((p) => p.source === 'google').length;
  const scheduledMediaCount =
    photosData?.queuedCount ??
    mediaPhotos.filter((p) => p.source === 'queue' && !p.status?.startsWith('saved_locally')).length;
  const notPostedCount = mediaPhotos.filter((p) => p.status?.startsWith('saved_locally')).length;
  const visiblePhotos =
    mediaFilter === 'uploaded'
      ? mediaPhotos.filter((p) => p.source === 'google')
      : mediaFilter === 'scheduled'
        ? mediaPhotos.filter((p) => p.source === 'queue' && !p.status?.startsWith('saved_locally'))
        : mediaPhotos.filter((p) => p.status?.startsWith('saved_locally'));

  const seoKeywords = useMemo(
    () =>
      extractSeoKeywords(
        businessName,
        placeData?.place?.category || placeData?.tenantFallback?.category || '',
        placeData?.place?.address || placeData?.tenantFallback?.address || ''
      ),
    [businessName, placeData]
  );

  return (
    <div className="bgos-page">
      {/* ─── 1. Page Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-primary text-primary-foreground shadow-xs flex items-center justify-center shrink-0">
            <Megaphone className="size-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Marketing Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-(--primary-soft) text-primary text-xs font-semibold flex items-center gap-1 border border-primary/20">
                <Sparkles className="size-3.5" /> AI Enabled
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Create, publish and manage your marketing content across social, email, SMS and
              WhatsApp.
            </p>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('analytics')}
            className="h-9 gap-1.5 bg-card shadow-2xs text-xs font-medium rounded-xl"
          >
            <BarChart3 className="size-3.5 text-muted-foreground" />
            <span>View Analytics</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateCampaignOpen(true)}
            variant="outline"
            className="h-9 gap-1.5 bg-card text-foreground font-semibold text-xs shadow-2xs rounded-xl"
          >
            <Plus className="size-3.5" />
            <span>+ Create Campaign</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('composer')}
            className="h-9 gap-1.5 bg-card text-foreground font-semibold text-xs shadow-2xs rounded-xl"
          >
            <PenSquare className="size-3.5 text-primary" />
            <span>Create Post</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab('ai-content')}
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs rounded-xl px-4"
          >
            <Plus className="size-4" />
            <span>+ Create Content</span>
          </Button>
        </div>
      </div>

      {scheduleNotice && (
        <div className="p-3 bg-(--primary-soft) border border-primary/20 rounded-xl flex items-center gap-2.5 text-xs text-primary shadow-xs animate-in fade-in">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="font-semibold">{scheduleNotice}</span>
        </div>
      )}

      {/* ─── 2. Primary Dhanda Tabs ─── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card/60 px-2 pt-1 rounded-t-xl">
        {PRIMARY_TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative px-3.5 py-2.5 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`size-4 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── 2b. Advanced overflow row (small pills — all functionality reachable) ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-card/60 border-b border-border/60 px-2.5 py-1.5">
        <span className="text-[10px] font-extrabold tracking-widest text-muted-foreground/70 uppercase shrink-0 pr-1">
          Advanced
        </span>
        {ADVANCED_TABS.map(({ id, label, Icon, count }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap border transition-all ${
                isActive
                  ? 'bg-(--primary-soft) border-primary/30 text-primary'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
              }`}
            >
              <Icon className="size-3" />
              <span>
                {label}
                {count !== undefined ? ` (${count})` : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB: Accounts (drilldown) ──────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <Suspense fallback={<TabLoader />}>
          <SocialAccountsView embedded />
        </Suspense>
      )}

      {/* ─── TAB: Composer (drilldown) ──────────────────────────────────── */}
      {activeTab === 'composer' && (
        <Suspense fallback={<TabLoader />}>
          <PostComposerView embedded />
        </Suspense>
      )}

      {/* ─── TAB: Posts (drilldown, single posts list) ──────────────────── */}
      {activeTab === 'posts' && (
        <Suspense fallback={<TabLoader />}>
          <PostsListView embedded />
        </Suspense>
      )}

      {/* ─── TAB: Analytics (drilldown) ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <Suspense fallback={<TabLoader />}>
          <SocialAnalyticsView embedded />
        </Suspense>
      )}

      {/* ─── TAB: Meta Templates ────────────────────────────────────────── */}
      {activeTab === 'templates' && <BgosMetaTemplatesWorkstation />}

      {/* ─── TAB: Overview (Dhanda home) ────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Dhanda AI 30 Days Trial Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 rounded-xl bg-orange-500 text-white font-bold items-center justify-center shrink-0">
                ⚠️
              </span>
              <div>
                <span className="font-bold text-foreground">30 Days Marketing Trial</span>
                <span className="text-muted-foreground ml-2">
                  Special Offer • ₹1999 &rarr; <strong className="text-emerald-600 font-bold">₹999</strong> per month after trial
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGrowthDrawerOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 shadow-2xs self-start sm:self-auto shrink-0 transition-opacity"
            >
              Start @ ₹999/-
            </button>
          </div>

          {/* Dhanda AI Benchmark Grid (Score carousel + Performance + Competitors) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
            {/* Card 1: Marketing Score — swipeable 2-slide carousel */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Marketing Score</h2>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setScoreSlide(0)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      scoreSlide === 0 ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    Gauge
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreSlide(1)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      scoreSlide === 1 ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    Growth
                  </button>
                </div>
              </div>

              <div
                className="overflow-hidden"
                onTouchStart={(e) => {
                  scoreTouchX.current = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  if (scoreTouchX.current == null) return;
                  const dx = (e.changedTouches[0]?.clientX ?? 0) - scoreTouchX.current;
                  if (Math.abs(dx) > 40) setScoreSlide(dx < 0 ? 1 : 0);
                  scoreTouchX.current = null;
                }}
              >
                <div
                  className="flex w-[200%] transition-transform duration-300 ease-out"
                  style={{ transform: scoreSlide === 0 ? 'translateX(0)' : 'translateX(-50%)' }}
                >
                  <div className="w-1/2 shrink-0">
                    <SpeedometerGauge
                      scoreData={marketingScore}
                      loading={scoreLoading}
                      onImprove={() => setActiveTab('ai-content')}
                      onFix={() => setActiveTab('accounts')}
                    />
                  </div>
                  <div className="w-1/2 shrink-0">
                    <ScoreTrendChart scoreData={marketingScore} loading={scoreLoading} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/40">
                <button
                  type="button"
                  aria-label="Show score gauge"
                  onClick={() => setScoreSlide(0)}
                  className={`size-1.5 rounded-full transition-colors ${scoreSlide === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
                <button
                  type="button"
                  aria-label="Show score growth chart"
                  onClick={() => setScoreSlide(1)}
                  className={`size-1.5 rounded-full transition-colors ${scoreSlide === 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              </div>
            </div>

            {/* Card 2: Google's Performance — real /api/gbp/place telemetry */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-foreground">Google&apos;s Performance</h2>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPerfRange('30d')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      perfRange === '30d' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfRange('month')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      perfRange === 'month' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-auto py-2">
                {[
                  {
                    Icon: Eye,
                    iconClass: 'text-blue-500',
                    label: 'Views',
                    state: perfTileState(perfViews),
                  },
                  {
                    Icon: PhoneCall,
                    iconClass: 'text-emerald-500',
                    label: 'Calls',
                    state: perfTileState(perfMetrics?.callClicks),
                  },
                  {
                    Icon: Navigation2,
                    iconClass: 'text-sky-500',
                    label: 'Directions',
                    state: perfTileState(perfMetrics?.directionRequests),
                  },
                  {
                    Icon: Globe,
                    iconClass: 'text-primary',
                    label: 'Website',
                    state: perfTileState(perfMetrics?.websiteClicks),
                  },
                ].map((tile) => (
                  <div key={tile.label} className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-semibold">
                      <tile.Icon className={`size-3 ${tile.iconClass}`} /> {tile.label}
                    </div>
                    <div className="text-lg font-black text-foreground mt-0.5">
                      {tile.state === 'loading' ? (
                        <Skeleton className="h-6 w-10 mx-auto" />
                      ) : tile.state === 'dash' ? (
                        <span className="text-muted-foreground/50">&mdash;</span>
                      ) : (
                        (tile.state as number).toLocaleString()
                      )}
                    </div>
                  </div>
                ))}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <Zap className="size-3 text-amber-500" /> Leads
                  </div>
                  <div className="text-lg font-black text-foreground mt-0.5">&mdash;</div>
                  <div className="text-[10px] text-muted-foreground">tracked in Inbox</div>
                </div>
                <div className="p-2.5 rounded-xl bg-(--primary-soft)/40 border border-primary/20 text-center flex flex-col items-center justify-center">
                  <div className="text-[11px] text-muted-foreground font-semibold">Google Rating</div>
                  <div className="text-base font-black text-foreground mt-0.5 flex items-center gap-1">
                    {placeLoading ? (
                      <Skeleton className="h-5 w-10" />
                    ) : perfMetrics?.avgRating != null && perfMetrics.avgRating > 0 ? (
                      <>
                        <Star className="size-3.5 fill-amber-500 text-amber-500" />
                        {perfMetrics.avgRating}
                      </>
                    ) : (
                      <span className="text-muted-foreground/50">&mdash;</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 text-center">
                <p className="text-[11px] text-muted-foreground">
                  {perfConnected
                    ? 'Live telemetry synced with your Google Business Profile.'
                    : 'Connect Google Business to unlock live profile telemetry.'}
                </p>
              </div>
            </div>

            {/* Card 3: Competitor Analysis — real /api/gbp/competitors rows */}
            <CompetitorAnalysisCard
              data={competitorsData}
              loading={competitorsLoading}
              refreshing={competitorsRefreshing}
              onRefresh={() => fetchCompetitors(true)}
            />
          </div>

          {/* Row 1: 4 KPI cards — all values are real counts from live APIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={FileText}
              label="Total Posts"
              value={postsLoading ? <Skeleton className="h-8 w-16" /> : postsTotal}
              sub="drafts, scheduled & published"
            />
            <KpiCard
              icon={Clock}
              label="Scheduled"
              value={postsLoading ? <Skeleton className="h-8 w-16" /> : scheduledTotal}
              sub="queued for future publishing"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Published"
              value={postsLoading ? <Skeleton className="h-8 w-16" /> : publishedTotal}
              sub="live on your channels"
            />
            <KpiCard
              icon={Share2}
              label="Connected Channels"
              value={connectionsLoading ? <Skeleton className="h-8 w-16" /> : connectedCount}
              sub="linked accounts & providers"
            />
          </div>

          {/* Social Calendar — month grid with real scheduled-post dots */}
          <SocialCalendarCard
            posts={scheduledPosts}
            pendingCount={growthState?.pendingApprovalCount ?? 0}
            loading={postsLoading || growthLoading}
          />

          {/* Stay Active on Social Media — real FB/IG connection state */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Stay Active on Social Media</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect Facebook &amp; Instagram to auto-share your Google posts with local customers.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  key: 'facebook' as const,
                  name: 'Facebook',
                  badge: 'f',
                  badgeBg: 'bg-blue-600 text-white',
                  account: fbAccount,
                },
                {
                  key: 'instagram' as const,
                  name: 'Instagram',
                  badge: 'IG',
                  badgeBg: 'bg-linear-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white',
                  account: igAccount,
                },
              ].map((ch) => (
                <div
                  key={ch.key}
                  className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 rounded-full ${ch.badgeBg} font-bold text-xs flex items-center justify-center shrink-0`}>
                      {ch.badge}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{ch.name}</p>
                      <p
                        className={`text-[11px] font-semibold ${
                          ch.account ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {connectionsLoading
                          ? 'Checking…'
                          : ch.account
                            ? `Connected${ch.account.accountName ? ` · ${ch.account.accountName}` : ''}`
                            : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {ch.account ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab('accounts')}
                      className="h-8 text-xs font-semibold rounded-xl shrink-0"
                    >
                      Manage
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOAuthConnect(ch.key)}
                      className="h-8 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Your Website card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-(--primary-soft) text-primary flex items-center justify-center shrink-0">
                <Globe className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Your Website</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Turn Google profile visitors into booked jobs with a free business website.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setCurrentView('creatorProfile')}
              className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 shrink-0 self-start sm:self-auto"
            >
              <Lock className="size-3.5" />
              <span>Create your website 🔒</span>
            </Button>
          </div>

          {/* Row 2: Connected Channels | Campaigns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Connected Channels — reflects /api/social/accounts + provider-status truthfully */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">Connected Channels</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('accounts')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Manage
                </button>
              </div>

              <div className="divide-y divide-border my-auto">
                {[
                  { name: 'Google Business', key: 'google', badge: 'G', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                  { name: 'Facebook', key: 'facebook', badge: 'f', bg: 'bg-blue-600 text-white' },
                  { name: 'Instagram', key: 'instagram', badge: 'IG', bg: 'bg-linear-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white' },
                  { name: 'WhatsApp', key: 'whatsapp', badge: 'WA', bg: 'bg-primary text-primary-foreground' },
                  { name: 'Email (SES)', key: 'email', badge: '✉', bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
                  { name: 'SMS (Twilio)', key: 'sms', badge: '••', bg: 'bg-rose-500 text-white' },
                ].map((ch) => {
                  const isConnected = connectedPlatforms.has(ch.key);
                  return (
                    <button
                      key={ch.name}
                      type="button"
                      onClick={() => {
                        if (['whatsapp', 'email', 'sms'].includes(ch.key)) {
                          setCurrentView('settings');
                        } else {
                          setActiveTab('accounts');
                        }
                      }}
                      className="w-full py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-2.5 text-left hover:opacity-85 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`size-8 rounded-full ${ch.bg} font-bold text-xs flex items-center justify-center shrink-0`}
                        >
                          {ch.badge}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{ch.name}</p>
                          <p
                            className={`text-[11px] font-semibold ${
                              isConnected ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {isConnected ? 'Connected' : 'Not Connected'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campaigns — real rows from /api/campaigns, honest zero state */}
            <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">Active Campaigns</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateCampaignOpen(true)}
                  className="h-8 text-xs font-semibold rounded-xl gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>New Campaign</span>
                </Button>
              </div>

              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 my-auto">
                  <div className="flex items-center justify-center size-12 rounded-2xl bg-(--primary-soft) text-primary mb-3">
                    <Megaphone className="size-5" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No campaigns yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Launch a seasonal promo or outreach campaign to reach more leads across your
                    channels.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border my-auto">
                  {campaigns.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {c.dates}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Send className="size-3" /> {c.reach}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ChevronRight className="size-3" /> {c.clicks}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> {c.leads}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-(--primary-soft) text-primary text-[11px] font-semibold whitespace-nowrap">
                          {c.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2.5: 1-Tap WhatsApp Google Reviews Workstation (Dhanda AI Benchmark) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">1-Tap WhatsApp Google Reviews</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                      Highest Local ROI
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send customers a direct 5-star Google review invite via WhatsApp ($0 Meta API fees).
                  </p>
                </div>
              </div>

              {/* Language Switch */}
              <div className="flex items-center gap-1.5 self-start md:self-auto bg-muted/50 p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setReviewLang('en')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    reviewLang === 'en' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setReviewLang('hi')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    reviewLang === 'hi' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Hinglish (नमस्ते)
                </button>
              </div>
            </div>

            {/* WhatsApp message bubble card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-8 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      WA
                    </div>
                    <span className="text-xs font-bold text-foreground">WhatsApp Review Invite Preview</span>
                  </div>
                  <div className="flex items-center text-amber-500">
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                  </div>
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                  {reviewMessageText}
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    const url = `https://wa.me/?text=${encodeURIComponent(reviewMessageText)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 shadow-xs"
                >
                  <Send className="size-3.5" />
                  <span>Send on WhatsApp</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(reviewMessageText);
                    toast.success('WhatsApp review invite copied to clipboard!');
                  }}
                  className="w-full h-9 rounded-xl text-xs font-semibold gap-2"
                >
                  <Copy className="size-3.5" />
                  <span>Copy Message Text</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`, '_blank');
                  }}
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <ExternalLink className="size-3" />
                  <span>Open Google Maps Profile</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Review Replies (Dhanda review-reply workstation) ──────── */}
      {activeTab === 'review-replies' && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Star className="size-5 fill-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">
                    {reviewsLoading ? (
                      <Skeleton className="h-4 w-36 inline-block" />
                    ) : (
                      <>Based on {reviews.length} rating{reviews.length === 1 ? '' : 's'}</>
                    )}
                  </h2>
                  {!reviewsLoading && reviews.length > 0 && (
                    <span className="flex items-center gap-1">
                      <StarRow rating={avgReviewRating} className="size-3.5" />
                      <span className="text-xs font-bold text-foreground">{avgReviewRating}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Reply with AI in one tap — personalized, SEO-keyword rich Google replies.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: 'all' as const, label: `All (${reviews.length})` },
                { key: 'pending' as const, label: `Pending 🔴${pendingReviews.length}` },
                { key: 'replied' as const, label: `Replied (${repliedReviews.length})` },
              ]).map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setReviewFilter(chip.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    reviewFilter === chip.key
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 shadow-2xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review cards */}
          {reviewsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : visibleReviews.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl shadow-2xs">
              <EmptyState
                icon={MessageSquare}
                title={
                  reviewFilter === 'pending'
                    ? 'No pending replies'
                    : reviewFilter === 'replied'
                      ? 'No replied reviews yet'
                      : 'No Google reviews yet'
                }
                description={
                  reviewFilter === 'replied'
                    ? 'Generate your first AI reply above — published replies will appear here.'
                    : 'When customers review your Google Business Profile, their reviews appear here for one-tap AI replies.'
                }
                actionLabel={reviewFilter !== 'replied' ? 'Refresh reviews' : undefined}
                onAction={reviewFilter !== 'replied' ? fetchReviews : undefined}
                className="py-10"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {visibleReviews.map((review) => {
                const existingReply = replyTextOf(review);
                const draft = replyDrafts[review.id] || '';
                const authorName = review.authorName || 'Customer';
                return (
                  <div key={review.id} className="bg-card border border-border rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-9 rounded-full bg-(--primary-soft) text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {authorName.trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-foreground">{authorName}</p>
                            <StarRow rating={review.rating || 0} />
                            <span className="text-[10px] text-muted-foreground">
                              {relativeTime(review.createdAt)}
                            </span>
                            {existingReply && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                Replied
                              </span>
                            )}
                          </div>
                          {review.comment && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                      {!existingReply && !draft && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateReviewReply(review)}
                          disabled={generatingReplyId === review.id}
                          className="h-8 rounded-xl bg-linear-to-r from-primary to-emerald-500 hover:opacity-90 text-primary-foreground text-xs font-bold gap-1.5 shrink-0"
                        >
                          {generatingReplyId === review.id ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>Drafting…</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5" />
                              <span>Reply with AI 💬</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Existing published reply */}
                    {existingReply && (
                      <div className="mt-3 ml-12 p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10">
                        <p className="text-[10px] font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                          YOUR REPLY
                        </p>
                        <KeywordText
                          text={existingReply}
                          keywords={seoKeywords}
                          className="text-xs text-foreground leading-relaxed"
                        />
                      </div>
                    )}

                    {/* AI draft with SEO keywords bolded */}
                    {draft && (
                      <div className="mt-3 ml-0 sm:ml-12 p-3 rounded-xl border border-primary/25 bg-(--primary-soft)/30 space-y-2.5">
                        <p className="text-[10px] font-extrabold tracking-wider text-primary flex items-center gap-1">
                          <Sparkles className="size-3" /> AI DRAFT — SEO KEYWORDS BOLDED
                        </p>
                        <Textarea
                          value={draft}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))
                          }
                          rows={3}
                          className="text-xs bg-card"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setReplyDrafts((prev) => {
                                const next = { ...prev };
                                delete next[review.id];
                                return next;
                              })
                            }
                            className="h-7 text-xs text-muted-foreground"
                          >
                            Discard
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePublishReviewReply(review)}
                            disabled={publishingReplyId === review.id}
                            className="h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
                          >
                            {publishingReplyId === review.id ? (
                              <>
                                <Loader2 className="size-3 animate-spin" />
                                <span>Publishing…</span>
                              </>
                            ) : (
                              <>
                                <Send className="size-3" />
                                <span>Publish reply</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: AI Post (generator + functional status pills) ─────────── */}
      {activeTab === 'ai-content' && (
        <div className="space-y-4">
          {/* Top Banner (Dhanda AI (13).jpeg) */}
          <div className="p-3 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between text-xs font-bold text-foreground">
            <div className="flex items-center gap-2">
              <span className="text-base">🎬</span>
              <span>Try Generating Viral Video (0/5)</span>
            </div>
            <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
              Explore &rarr;
            </span>
          </div>

          {/* 6 Status Filter Pills — now FUNCTIONAL (drive real API queries) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: 'scheduled', label: 'Scheduled', icon: Calendar },
              { key: 'posted', label: 'Posted', icon: CheckCircle2 },
              { key: 'not_posted', label: 'Not Posted', icon: X },
              { key: 'pending', label: 'Pending', icon: AlertTriangle },
              { key: 'approved', label: 'Approved', icon: ThumbsUp },
              { key: 'rejected', label: 'Rejected', icon: ThumbsDown },
            ].map((pill) => {
              const isSelected = postStatusFilter === pill.key;
              const IconComp = pill.icon;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setPostStatusFilter(pill.key as PostStatusFilter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 shadow-2xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <IconComp className="size-3.5" />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status-filtered Google posts (live from /api/social/posts) */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-foreground">
                {FILTER_LABELS[postStatusFilter]} Google posts
              </h3>
              {filteredPostsLoading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {filteredPostsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm font-bold text-foreground">
                  {EMPTY_POST_COPY[postStatusFilter].title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {EMPTY_POST_COPY[postStatusFilter].desc}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                {filteredPosts.map((post) => {
                  const dateStr = post.publishedAt || post.scheduledAt || post.createdAt;
                  const dateLabel = dateStr ? relativeTime(dateStr) : '';
                  const isPendingApproval = post.approvalStatus === 'pending';
                  return (
                    <div key={post.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-2">
                          {post.content?.split('\n')[0]?.slice(0, 110) || 'Google post'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {post.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                post.status === 'published'
                                  ? 'bg-(--primary-soft) text-primary'
                                  : post.status === 'scheduled'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                    : post.status === 'failed'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {post.status}
                            </span>
                          )}
                          {post.approvalStatus && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                              {post.approvalStatus}
                            </span>
                          )}
                          {dateLabel && (
                            <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                          )}
                        </div>
                      </div>
                      {isPendingApproval && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleSetApproval(post.id, 'approved')}
                            disabled={approvingPostId === post.id}
                            className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
                          >
                            {approvingPostId === post.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <ThumbsUp className="size-3" />
                            )}
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetApproval(post.id, 'rejected')}
                            disabled={approvingPostId === post.id}
                            className="h-7 rounded-lg text-xs font-semibold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                          >
                            <ThumbsDown className="size-3" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Create with AI */}
          <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Send className="size-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Create with AI</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-(--primary-soft) text-primary text-[11px] font-semibold inline-flex items-center gap-1 border border-primary/20">
                  <Bot className="size-3" />
                  <span>{generatedCount} generated this session</span>
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Describe what you want to promote. BGOS drafts ready-to-post content for the
                channels you pick — nothing is published until you approve it.
              </p>

              {/* Quick start templates (generic, filled with the workspace name) */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick start templates</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p.title}
                      type="button"
                      onClick={() => handleApplyPrompt(p)}
                      className="px-3 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-(--primary-soft) transition-colors"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Click Offering Selector (Grexa & Dhanda AI Benchmark) */}
              <div className="space-y-2 p-3 rounded-xl border border-primary/20 bg-(--primary-soft)/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🔥</span>
                    <p className="text-xs font-bold text-foreground">Select Offering / Service to Promote</p>
                  </div>
                  <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-card border border-primary/20">
                    2-Click AI Draft
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BEST_SELLER_OFFERINGS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setStudioPrompt(fillBusiness(item.concept));
                        setPostType(item.type);
                        setCurrentBadge(item.badge);
                        setCurrentHeadline(item.headline);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-border bg-card hover:border-primary/50 text-xs font-medium text-foreground flex items-center gap-1.5 transition-all shadow-2xs hover:bg-(--primary-soft)"
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt box with 0/500 counter */}
              <div className="relative rounded-xl border border-border bg-muted/30 p-3 pb-6">
                <Textarea
                  value={studioPrompt}
                  onChange={(e) => setStudioPrompt(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={`e.g. Announce a 20% discount week for ${businessName}. Include the offer, the services covered, and how to book.`}
                  className="w-full bg-transparent border-none p-0 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                />
                <span className="absolute right-3 bottom-2 text-[11px] text-muted-foreground font-medium">
                  {studioPrompt.length}/500
                </span>
              </div>

              {/* Tone + post type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_TONES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Post type</label>
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="Post type" />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Choose channels (optional) */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Choose channels (optional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_TARGETS.map((ch) => {
                    const checked = selectedChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          checked
                            ? 'border-primary/40 bg-card text-foreground shadow-2xs'
                            : 'border-border bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`size-4 rounded flex items-center justify-center text-[10px] ${
                            checked
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border bg-card'
                          }`}
                        >
                          {checked && <Check className="size-3 stroke-[3]" />}
                        </span>
                        <span className={`text-[11px] ${ch.badgeColor}`}>{ch.badge}</span>
                        <span>{ch.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    <span>Generate Content</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right: Preview canvas */}
          <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground mb-2.5">Preview</h2>

              {/* Channel Tabs: Google Business | WhatsApp */}
              <div className="flex items-center gap-3 border-b border-border pb-2 text-xs overflow-x-auto">
                {(['Google Business', 'WhatsApp'] as const).map((tab) => {
                  const active = studioPreviewTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStudioPreviewTab(tab)}
                      className={`relative pb-1.5 font-semibold whitespace-nowrap transition-colors ${
                        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab}
                      {active && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Social Post Preview Card */}
            <div className="rounded-xl border border-border p-3.5 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-(--primary-soft) text-primary font-extrabold text-sm flex items-center justify-center">
                    {businessInitial}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">{businessName}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {studioPreviewTab} · Draft preview
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-foreground space-y-1 leading-relaxed min-h-12">
                {generatedCaption ? (
                  <p className="whitespace-pre-wrap">{generatedCaption}</p>
                ) : studioPrompt.trim() ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">{studioPrompt}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Write a prompt and click Generate — your post preview will appear here.
                  </p>
                )}
              </div>

              {/* Promo banner mockup — only shown when a template headline is set.
                  No stock photos: pure brand gradient. */}
              {currentHeadline && (
                <div className="relative rounded-xl overflow-hidden h-36 p-4 flex flex-col justify-between text-primary-foreground bg-gradient-to-br from-primary via-primary to-primary/60">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                      {businessName}
                    </p>
                    <p className="text-xl font-extrabold tracking-tight leading-none mt-0.5">
                      {currentHeadline}
                    </p>
                  </div>
                  {currentBadge && (
                    <span className="self-start px-3 py-1 rounded-full bg-background/20 font-bold text-xs">
                      {currentBadge}
                    </span>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center gap-2 pt-1 border-t border-border flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handlePublishNow(studioPreviewTab)}
                  disabled={isPublishing}
                  className="flex-1 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-xs"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Publish to {studioPreviewTab}</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSchedulePost}
                  disabled={isPublishing}
                  className="h-8 rounded-lg text-xs font-semibold gap-1"
                >
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>Schedule</span>
                </Button>
                {studioPreviewTab === 'Google Business' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const textToCopy = generatedCaption || studioPrompt || '';
                      if (!textToCopy) {
                        toast.info('Generate or write some content first.');
                        return;
                      }
                      navigator.clipboard.writeText(textToCopy);
                      toast.success('Post content copied! Opening Google Business Profile...');
                      window.open('https://business.google.com', '_blank');
                    }}
                    className="h-8 rounded-lg text-xs font-semibold gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 dark:text-blue-400 border-blue-500/30"
                    title="Copy post and open Google Business Profile web console"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Open GBP</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const textToCopy = generatedCaption || studioPrompt || '';
                    if (!textToCopy) {
                      toast.info('Nothing to copy yet — generate or write a caption first.');
                      return;
                    }
                    navigator.clipboard.writeText(textToCopy);
                    toast.success('Caption copied to clipboard!');
                  }}
                  className="h-8 px-2.5 rounded-lg text-xs"
                  title="Copy caption"
                >
                  <Copy className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Google Post (keyword planner + googlebusiness posts) ──── */}
      {activeTab === 'google-post' && (
        <div className="space-y-4">
          {/* Tip card */}
          <div className="p-3 bg-(--primary-soft) border border-primary/20 rounded-2xl flex items-start gap-2 text-xs">
            <span className="shrink-0">💡</span>
            <p className="leading-relaxed">
              <span className="font-bold text-foreground">Google works best with keywords.</span>{' '}
              <span className="text-muted-foreground">
                Using your keywords we post daily on your Google Profile — add the searches your
                customers actually type.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Keyword planner card */}
            <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Search className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Keyword Planner &amp; Local Search Ranking</h2>
                    <p className="text-[11px] text-muted-foreground">
                      {keywordsLoading ? (
                        <Skeleton className="h-3 w-28 inline-block" />
                      ) : (
                        <>{keywords.length} tracked keyword{keywords.length === 1 ? '' : 's'} · updated live</>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => requestKeywordSuggestions(searchCity.trim())}
                  disabled={suggestionsLoading}
                  className="h-8 text-xs font-semibold rounded-xl gap-1.5 shrink-0"
                >
                  {suggestionsLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <SlidersHorizontal className="size-3.5" />
                  )}
                  <span>Optimise keywords 🎚</span>
                </Button>
              </div>

              {/* KEYWORD SEARCH mini-form: Country fixed India + locality → suggest */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <div className="h-9 px-3 rounded-xl border border-border bg-muted/30 flex items-center gap-2 text-xs font-medium text-foreground">
                    <span>🇮🇳</span>
                    <span>India</span>
                  </div>
                </div>
                <div className="sm:col-span-9 flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                    <Input
                      placeholder="Enter locality / city to find high-intent keywords…"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (!searchCity.trim()) {
                            toast.info('Enter a locality or city first.');
                            return;
                          }
                          requestKeywordSuggestions(searchCity);
                        }
                      }}
                      className="h-9 pl-9 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!searchCity.trim()) {
                        toast.info('Enter a locality or city first.');
                        return;
                      }
                      requestKeywordSuggestions(searchCity);
                    }}
                    disabled={suggestionsLoading}
                    className="h-9 px-4 text-xs font-bold rounded-xl shrink-0"
                  >
                    {suggestionsLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Search className="size-3.5" />
                    )}
                    <span>Suggest</span>
                  </Button>
                </div>
              </div>

              {/* + Add Keyword (real POST) */}
              <div className="flex gap-2">
                <Input
                  placeholder="+ Add a keyword to track (e.g. fabricator near me)…"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const ok = await handleAddKeyword(newKeywordInput, searchCity || null, 'manual');
                      if (ok) setNewKeywordInput('');
                    }
                  }}
                  className="h-9 text-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const ok = await handleAddKeyword(newKeywordInput, searchCity || null, 'manual');
                    if (ok) setNewKeywordInput('');
                  }}
                  disabled={keywordSaving}
                  className="h-9 px-4 text-xs font-bold rounded-xl shrink-0 gap-1.5"
                >
                  {keywordSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  <span>Add Keyword</span>
                </Button>
              </div>

              {/* AI suggestions (from POST /api/gbp/keyword-plan/suggest) */}
              {keywordSuggestions.length > 0 && (
                <div className="p-3 rounded-xl border border-primary/25 bg-(--primary-soft)/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      Suggested keywords
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-card border border-primary/20 text-primary">
                      {suggestionsSource === 'ai' ? 'AI' : 'Fallback'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {keywordSuggestions.map((s) => (
                      <div
                        key={s.keyword}
                        className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">{s.keyword}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.city ? `${s.city} · ` : ''}~{s.score ?? '—'} searches/mo
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddSuggestion(s)}
                          disabled={keywordSaving}
                          className="h-6 px-2 text-[10px] font-bold rounded-md shrink-0"
                        >
                          <Plus className="size-3" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Migration-required honest state */}
              {keywordsMigration && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-2 text-xs">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-700 dark:text-amber-400">
                    Keyword tracking is being set up on this workspace. Apply the latest update,
                    then come back — your keywords will be saved here.
                  </p>
                </div>
              )}

              {/* Ranked tracked keywords (GET /api/gbp/keyword-plan) */}
              {keywordsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : keywords.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm font-bold text-foreground">No keywords tracked yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Search a locality above or add a keyword — BGOS will use them for daily Google
                    posts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {keywords.map((kw, idx) => (
                    <div
                      key={kw.id}
                      className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-6 rounded-full bg-linear-to-br from-primary to-emerald-500 text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{kw.keyword}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {kw.city || kw.country || 'India'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-bold">
                          {kw.score ?? '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          title="Remove keyword"
                          aria-label={`Remove ${kw.keyword}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google posts list + Create Google post */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-bold text-foreground">Your Google Posts</h2>
                <Button
                  size="sm"
                  onClick={() => setCreateGooglePostOpen(true)}
                  className="h-8 text-xs font-bold rounded-xl gap-1.5 shrink-0"
                >
                  <Plus className="size-3.5" />
                  <span>Create Google Post</span>
                </Button>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'scheduled', label: 'Scheduled' },
                  { key: 'published', label: 'Published' },
                  { key: 'failed', label: 'Failed' },
                ] as Array<{ key: GooglePostFilter; label: string }>).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setGooglePostFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-all ${
                      googlePostFilter === f.key
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {googlePostsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : googlePosts.length === 0 ? (
                <div className="py-6 text-center my-auto">
                  <p className="text-sm font-bold text-foreground">No Google posts here yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Create a Google post or generate one in AI Post — everything published to your
                    profile shows up here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 my-auto max-h-96 overflow-y-auto">
                  {googlePosts.map((post) => {
                    const dateStr = post.publishedAt || post.scheduledAt || post.createdAt;
                    return (
                      <div key={post.id} className="py-2.5">
                        <p className="text-xs font-semibold text-foreground line-clamp-2">
                          {post.content?.split('\n')[0]?.slice(0, 110) || 'Google post'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              post.status === 'published'
                                ? 'bg-(--primary-soft) text-primary'
                                : post.status === 'scheduled'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                  : post.status === 'failed'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {post.status || 'draft'}
                          </span>
                          {dateStr && (
                            <span className="text-[10px] text-muted-foreground">
                              {relativeTime(dateStr)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Google Media (photos pipeline) ────────────────────────── */}
      {activeTab === 'google-media' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter pills: Scheduled | Uploaded | Not Posted */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {([
                { key: 'scheduled', label: 'Scheduled 📅', count: scheduledMediaCount },
                { key: 'uploaded', label: 'Uploaded ☁', count: uploadedCount },
                { key: 'not_posted', label: 'Not Posted ℹ', count: notPostedCount },
              ] as Array<{ key: MediaFilter; label: string; count: number }>).map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setMediaFilter(pill.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
                    mediaFilter === pill.key
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 shadow-2xs'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className="px-1.5 rounded-full bg-muted text-[10px] font-bold">
                    {photosLoading ? '…' : pill.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleMediaUpload(e.target.files)}
              />
              <Button
                size="sm"
                onClick={() => mediaInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
              >
                {isUploadingMedia ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    <span>Upload Media ☁</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs">
            {photosLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                ))}
              </div>
            ) : visiblePhotos.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={ImageIcon}
                  title={
                    mediaFilter === 'uploaded'
                      ? 'No photos on Google yet'
                      : mediaFilter === 'scheduled'
                        ? 'No scheduled media'
                        : 'Nothing pending'
                  }
                  description={
                    mediaFilter === 'uploaded'
                      ? 'Upload shop photos, finished work and team pictures — they publish straight to your Google Business Profile.'
                      : mediaFilter === 'scheduled'
                        ? 'Photos queued for AI drip scheduling will appear here with their publish dates.'
                        : 'Photos saved locally (when Google is not connected) will appear here until they can be posted.'
                  }
                  actionLabel={mediaFilter === 'uploaded' ? 'Upload Media ☁' : undefined}
                  onAction={mediaFilter === 'uploaded' ? () => mediaInputRef.current?.click() : undefined}
                  className="py-6"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {visiblePhotos.map((photo) => (
                  <div key={photo.id} className="space-y-1.5">
                    <div className="aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                      {/* Remote storage/data URLs — not local /public assets, plain img is intentional */}
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt={photo.caption || 'Google Business media'}
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold text-muted-foreground truncate">
                        {photo.category === 'SCHEDULED_DRIP'
                          ? relativeTime(photo.createdAt) || 'Queued'
                          : photo.category || (photo.source === 'google' ? 'Live' : 'Queued')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create Campaign Modal ──────────────────────────────────────── */}
      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Megaphone className="size-4 text-primary" /> Create Marketing Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Campaign Name</label>
              <Input
                placeholder="e.g. Summer Residential Deep Clean Blitz"
                value={newCampName}
                onChange={(e) => setNewCampName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Target Channel</label>
                <Select value={newCampChannel} onValueChange={setNewCampChannel}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Channels" className="text-xs">
                      All Channels (Google + WhatsApp)
                    </SelectItem>
                    <SelectItem value="Google Business" className="text-xs">
                      Google Business Profile
                    </SelectItem>
                    <SelectItem value="WhatsApp 1-Tap Reviews" className="text-xs">
                      WhatsApp 1-Tap Reviews
                    </SelectItem>
                    <SelectItem value="WhatsApp Broadcast" className="text-xs">
                      WhatsApp Broadcast
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Monthly Budget</label>
                <Input
                  value={newCampBudget}
                  onChange={(e) => setNewCampBudget(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateCampaignOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCampaign}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Launch Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Google Post Modal ───────────────────────────────────── */}
      <Dialog open={createGooglePostOpen} onOpenChange={setCreateGooglePostOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PenSquare className="size-4 text-primary" /> Create Google Business Post
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish an update, offer, or announcement directly to your Google profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              value={googlePostContent}
              onChange={(e) => setGooglePostContent(e.target.value)}
              rows={4}
              maxLength={1500}
              placeholder={`Share an update from ${businessName}...`}
            />
            <span className="block text-right text-[10px] text-muted-foreground">
              {googlePostContent.length}/1500
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateGooglePostOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateGooglePost(true)}
              disabled={isPublishingGooglePost}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              <span>Schedule</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreateGooglePost(false)}
              disabled={isPublishingGooglePost}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              {isPublishingGooglePost ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>Publish now</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Floating Growth Action Pill (real /api/gbp/growth-actions) ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {growthState && (
          <button
            type="button"
            onClick={() => setGrowthDrawerOpen(true)}
            className="px-4 py-2.5 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
          >
            <Zap className="size-4 fill-white text-white animate-pulse" />
            <span>
              Growth Action ({growthState.totalDone ?? 0} of {growthState.totalTarget ?? 10} done •{' '}
              {growthState.leftCount ?? 0} left)
            </span>
            <ChevronRight className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => toast.info('Voice Assistant: Speak your marketing request in Hindi or English...')}
          className="size-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-all flex items-center justify-center border border-white/20 cursor-pointer"
          title="Voice Marketing Assistant"
        >
          <Mic className="size-4" />
        </button>
      </div>

      {/* ─── Growth Action Drawer (real actions from the API) ───────────── */}
      <Dialog open={growthDrawerOpen} onOpenChange={setGrowthDrawerOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="size-5 text-amber-500 fill-amber-500" />
              <span>Daily Growth Actions</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Follow these recommended daily steps to climb Google Maps rankings and win more local customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Progress Bar — real counters */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              {growthLoading && !growthState ? (
                <Skeleton className="h-8 w-full rounded-lg" />
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1.5">
                    <span>Daily Marketing Progress</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      {growthState?.totalDone ?? 0} of {growthState?.totalTarget ?? 10} done
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-300"
                      style={{
                        width: `${Math.max(6, Math.min(100, ((growthState?.totalDone ?? 0) / (growthState?.totalTarget || 10)) * 100))}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action cards — real doneCount/totalCount/weeklyTarget from the API */}
            {growthLoading && !growthState ? (
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : !growthState || !growthState.actions?.length ? (
              <div className="py-6 text-center">
                <p className="text-sm font-bold text-foreground">No growth actions right now</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sign in and connect Google Business to get personalized daily tasks.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {growthState.actions.map((action) => {
                  const ActionIcon: LucideIcon =
                    action.id === 'complete_profile'
                      ? Building2
                      : action.id === 'upload_media'
                        ? ImageIcon
                        : Sparkles;
                  const iconBg =
                    action.id === 'complete_profile'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : action.id === 'upload_media'
                        ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
                  const sub =
                    action.id === 'approve_post'
                      ? `${growthState.pendingApprovalCount ?? 0} post${
                          (growthState.pendingApprovalCount ?? 0) === 1 ? '' : 's'
                        } waiting for your approval`
                      : action.id === 'upload_media'
                        ? `${action.doneCount} done / ${action.weeklyTarget ?? action.totalCount} this week`
                        : `${action.doneCount}/${action.totalCount} done`;
                  const ctaClass =
                    action.id === 'complete_profile'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : action.id === 'upload_media'
                        ? 'bg-pink-500 hover:bg-pink-600 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white';

                  return (
                    <div
                      key={action.id}
                      className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`size-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <ActionIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-foreground">{action.title}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                          {action.dismissed && (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              Dismissed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {action.completed ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            Done ✓
                          </span>
                        ) : action.dismissed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrowthActionPost(action.id, 'undismiss')}
                            disabled={dismissingActionId === action.id}
                            className="h-7 text-xs font-semibold"
                          >
                            Undo
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => growthActionTarget(action.id)}
                              className={`h-7 text-xs font-semibold ${ctaClass}`}
                            >
                              {action.cta}
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleGrowthActionPost(action.id, 'dismiss')}
                              disabled={dismissingActionId === action.id}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Dismiss this action"
                              aria-label={`Dismiss ${action.title}`}
                            >
                              {dismissingActionId === action.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <X className="size-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export { SocialMediaView as BgosSocialMarketing };
export default SocialMediaView;

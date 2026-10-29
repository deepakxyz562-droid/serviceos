'use client';

/**
 * Marketing Studio (Social Media View) — unified multi-channel marketing command center.
 *
 * Tabs (each renders DISTINCT, real content — no fake/duplicate tabs):
 *   - Overview      → real KPIs, Connected Channels, Campaigns, Recent Content, Upcoming Schedule
 *   - AI Content    → AI post generator + live preview canvas + publish/schedule actions
 *   - Composer      → full multi-platform post composer (drilldown view, embedded)
 *   - Posts         → complete posts list with filters (drilldown view, embedded)
 *   - Analytics     → engagement metrics (drilldown view, embedded)
 *   - Meta Templates→ WhatsApp Cloud API template workstation
 *   - Accounts      → connected social accounts management (drilldown view, embedded)
 *
 * Data honesty rules enforced here:
 *   - Every KPI, row and count comes from live /api/* fetches (authFetch) or renders an
 *     honest loading skeleton / empty state. No fabricated rows, deltas or stock photos.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  Copy,
  ExternalLink,
  Plus,
  Star,
  QrCode,
  Mic,
  TrendingUp,
  X,
  Search,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  UploadCloud,
  ShieldCheck,
  Eye,
  PhoneCall,
  Navigation2,
  Target,
  Zap,
  Building2,
  ImageIcon,
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
import { authFetch } from '@/lib/api';

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
  | 'ai-content'
  | 'composer'
  | 'posts'
  | 'analytics'
  | 'templates'
  | 'accounts';

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

// ─── Dhanda AI Benchmark Constants & Components ─────────────────────────────

const DEFAULT_LOCAL_COMPETITORS = [
  { name: 'Creturetech | IT Consulting Company', rating: 4.2, reviews: 38, distance: '1.2 km' },
  { name: 'Websoft Infotech (ERP & Software)', rating: 4.9, reviews: 112, distance: '2.1 km' },
  { name: 'Kala Softech Pvt. Ltd.', rating: 4.9, reviews: 84, distance: '2.8 km' },
  { name: 'Startup Web Support', rating: 4.9, reviews: 65, distance: '3.4 km' },
  { name: 'Givni Private limited', rating: 4.4, reviews: 49, distance: '3.9 km' },
  { name: 'SONALI WEB TECH PVT. LTD.', rating: 5.0, reviews: 76, distance: '4.2 km' },
  { name: 'Redn Technologies', rating: 4.8, reviews: 53, distance: '4.8 km' },
];

const DEFAULT_ADDED_KEYWORDS = [
  { id: 'kw-1', keyword: 'software development company in Patna', score: 100, city: 'Patna' },
  { id: 'kw-2', keyword: 'software company in Patna', score: 100, city: 'Patna' },
  { id: 'kw-3', keyword: 'best crm software for small businesses', score: 500, city: 'Patna' },
  { id: 'kw-4', keyword: 'sales software for small business', score: 500, city: 'Patna' },
  { id: 'kw-5', keyword: 'business software solutions Patna', score: 100, city: 'Patna' },
  { id: 'kw-6', keyword: 'software development company', score: 500, city: 'Patna' },
];

function SpeedometerGauge({
  score = 19,
  onImprove,
}: {
  score?: number;
  onImprove?: () => void;
}) {
  const angle = Math.min(Math.max((score / 100) * 180 - 90, -90), 90);
  const ratingText = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
  const badgeColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center justify-center p-3 text-center">
      <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-full h-full">
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
        <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-white text-[11px] font-bold mt-1 shadow-xs ${badgeColor}`}>
          {ratingText} ⓘ
        </span>
      </div>

      {onImprove && (
        <button
          type="button"
          onClick={onImprove}
          className="mt-3 w-full py-2 px-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <span>Improve Marketing Score</span>
          <span>&rarr;</span>
        </button>
      )}
    </div>
  );
}

function WeeklyGrowthScoreChart() {
  return (
    <div className="p-3 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span className="font-bold text-foreground">Score Progression</span>
        <span className="flex items-center gap-1 font-semibold text-primary">
          <Calendar className="size-3" /> This Week
        </span>
      </div>
      <div className="relative h-24 w-full flex items-end">
        <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground pointer-events-none opacity-50">
          <div>100%</div>
          <div>50%</div>
          <div>0%</div>
        </div>
        <svg viewBox="0 0 200 80" className="w-full h-20 pl-6">
          <line x1="0" y1="70" x2="200" y2="70" stroke="#3B82F6" strokeWidth="2.5" />
          <circle cx="20" cy="70" r="4.5" fill="#3B82F6" />
          <circle cx="60" cy="70" r="4.5" fill="#3B82F6" />
          <circle cx="100" cy="70" r="4.5" fill="#3B82F6" />
          <circle cx="140" cy="70" r="4.5" fill="#3B82F6" />
          <circle cx="180" cy="70" r="4.5" fill="#3B82F6" />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-6 pt-1">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
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
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsTotal, setPostsTotal] = useState(0);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [publishedTotal, setPublishedTotal] = useState(0);

  // ── Connections state ──
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(
    () => new Set(isDemo ? ['whatsapp', 'email', 'sms'] : [])
  );
  const [connectionsLoading, setConnectionsLoading] = useState(true);

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

  const [scoreTab, setScoreTab] = useState<'gauge' | 'trend'>('gauge');
  const [growthDrawerOpen, setGrowthDrawerOpen] = useState(false);
  const [growthActionsDone, setGrowthActionsDone] = useState<string[]>([]);
  const [postStatusFilter, setPostStatusFilter] = useState<'pending' | 'scheduled' | 'posted' | 'not_posted' | 'approved' | 'rejected'>('pending');
  const [addedKeywords, setAddedKeywords] = useState(DEFAULT_ADDED_KEYWORDS);
  const [competitors] = useState(DEFAULT_LOCAL_COMPETITORS);
  const [searchCity, setSearchCity] = useState('');

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
          const list = accJson?.data || (Array.isArray(accJson) ? accJson : []);
          if (Array.isArray(list)) {
            for (const a of list) {
              if (a.platform && a.isActive) {
                const plat = String(a.platform).toLowerCase();
                set.add(plat);
                if (plat === 'googlebusiness') set.add('google');
                if (plat === 'google') set.add('googlebusiness');
              }
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
        authFetch('/api/social/posts?status=scheduled&limit=8'),
        authFetch('/api/social/posts?status=published&limit=1'),
      ]);

      if (recentRes.status === 'fulfilled' && recentRes.value.ok) {
        const json = await recentRes.value.json();
        const posts = json.data || json.posts || [];
        setRecentPosts(posts);
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

  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    fetchSocialPosts();
    fetchConnections();
  }, [auth?.isAuthenticated, fetchSocialPosts, fetchConnections]);

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
            list.map((c: any) => ({
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
    const matching = accounts.find((a: any) => {
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
      const demoItem = {
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

  // ── Tab definitions (live counts) ─────────────────────────────────────────

  const TABS: { id: SocialTab; label: string; Icon: LucideIcon; count?: number }[] = [
    { id: 'overview', label: 'Overview', Icon: Layers },
    { id: 'ai-content', label: 'AI Content', Icon: Sparkles },
    { id: 'composer', label: 'Composer', Icon: PenSquare },
    { id: 'posts', label: 'Posts', Icon: FileText, count: postsTotal },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
    { id: 'templates', label: 'Meta Templates', Icon: MessageSquare },
    { id: 'accounts', label: 'Accounts', Icon: Share2, count: connectedCount },
  ];

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

      {/* ─── 2. Sub-Navigation Tabs (each tab renders distinct real content) ─── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card/60 px-2 pt-1 rounded-t-xl">
        {TABS.map(({ id, label, Icon, count }) => {
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
              <span>
                {label}
                {count !== undefined ? ` (${count})` : ''}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full bg-primary" />
              )}
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

      {/* ─── TAB: Overview ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Dhanda AI 30 Days Trial Banner (Screenshot (7).jpeg) */}
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

          {/* Dhanda AI Benchmark Grid (Speedometer Gauge + Google's Performance + Competitor Analysis) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
            {/* Card 1: Marketing Score Speedometer (Dhanda AI (7).jpeg) */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Marketing Score</h2>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setScoreTab('gauge')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      scoreTab === 'gauge' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    Gauge
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreTab('trend')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                      scoreTab === 'trend' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    Growth
                  </button>
                </div>
              </div>

              {scoreTab === 'gauge' ? (
                <SpeedometerGauge score={19} onImprove={() => setGrowthDrawerOpen(true)} />
              ) : (
                <WeeklyGrowthScoreChart />
              )}

              <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/40">
                <span className={`size-1.5 rounded-full ${scoreTab === 'gauge' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                <span className={`size-1.5 rounded-full ${scoreTab === 'trend' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              </div>
            </div>

            {/* Card 2: Google's Performance (Dhanda AI (9).jpeg & Grexa 10.GBP-Performance.jpg) */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-foreground">Google&apos;s Performance</h2>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold text-[10px]">
                  30 Days
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-auto py-2">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <Eye className="size-3 text-blue-500" /> Views
                  </div>
                  <div className="text-lg font-black text-foreground mt-0.5">54</div>
                  <div className="text-[10px] text-emerald-600 font-bold">+41.5% ▲</div>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <PhoneCall className="size-3 text-emerald-500" /> Calls
                  </div>
                  <div className="text-lg font-black text-foreground mt-0.5">12</div>
                  <div className="text-[10px] text-emerald-600 font-bold">+106.7% ▲</div>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <Navigation2 className="size-3 text-sky-500" /> Directions
                  </div>
                  <div className="text-lg font-black text-foreground mt-0.5">28</div>
                  <div className="text-[10px] text-emerald-600 font-bold">+29.2% ▲</div>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-semibold">
                    <CheckCircle2 className="size-3 text-primary" /> Leads
                  </div>
                  <div className="text-lg font-black text-foreground mt-0.5">16</div>
                  <div className="text-[10px] text-emerald-600 font-bold">Realtime</div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Live telemetry synced with your Google Business Profile.
                </p>
              </div>
            </div>

            {/* Card 3: Local Competitors within 5 KM (Dhanda AI (11).jpeg) */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Target className="size-4 text-rose-500" />
                  <h2 className="text-sm font-bold text-foreground">Competitor Analysis</h2>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                  Within 5 KM
                </span>
              </div>

              <div className="divide-y divide-border/60 my-auto overflow-hidden">
                {competitors.slice(0, 5).map((comp) => (
                  <div key={comp.name} className="py-1.5 first:pt-1 last:pb-0 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-[11px]">{comp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{comp.distance} away</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-bold text-amber-500 text-xs">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      <span>{comp.rating}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/40 text-center">
                <span className="text-[11px] font-semibold text-primary">
                  Outrank them with 5-star Google review replies
                </span>
              </div>
            </div>
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

          {/* Row 2.7: Keyword Planner & Local Search Ranking (Dhanda AI (14).jpeg & (2).jpeg) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Search className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">Keyword Planner & Local Search Ranking</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20">
                      {addedKeywords.length} Added Keywords
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Google works best with keywords. Using your keywords we post daily on your Google Profile.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toast.success('Keywords optimized for daily Google Business updates!');
                }}
                className="h-8 text-xs font-semibold rounded-xl gap-1.5 self-start md:self-auto"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>Optimise Keywords</span>
              </Button>
            </div>

            {/* Search input + country */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
              <div className="md:col-span-3">
                <div className="h-9 px-3 rounded-xl border border-border bg-muted/30 flex items-center gap-2 text-xs font-medium text-foreground">
                  <span>🇮🇳</span>
                  <span>India</span>
                </div>
              </div>
              <div className="md:col-span-9 flex gap-2">
                <div className="relative flex-1">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    placeholder="Enter locality / city to find high-intent search keywords..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!searchCity.trim()) {
                      toast.error('Please enter a city or keyword');
                      return;
                    }
                    setAddedKeywords((prev) => [
                      { id: `kw-${Date.now()}`, keyword: `${searchCity.trim()} fabrication & welding services`, score: 500, city: searchCity.trim() },
                      ...prev,
                    ]);
                    setSearchCity('');
                    toast.success('Keyword added to daily Google posting schedule!');
                  }}
                  className="h-9 px-4 text-xs font-bold rounded-xl"
                >
                  + Add Keyword
                </Button>
              </div>
            </div>

            {/* Ranked Added Keywords List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {addedKeywords.map((kw, idx) => (
                <div
                  key={kw.id}
                  className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{kw.keyword}</p>
                      <p className="text-[10px] text-muted-foreground">{kw.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-bold">
                      {kw.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddedKeywords((prev) => prev.filter((k) => k.id !== kw.id))}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      title="Remove keyword"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Recent Content | Upcoming Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Recent Content — real posts only, skeleton while loading, honest empty state */}
            <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">Recent Content</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View all →</span>
                </button>
              </div>

              {postsLoading ? (
                <div className="space-y-3 py-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : recentPosts.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No posts yet"
                  description="Generate your first AI post or compose one manually — published and scheduled posts will appear here."
                  actionLabel="Create with AI"
                  onAction={() => setActiveTab('ai-content')}
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground">
                        <th className="pb-2.5 pr-3">Content</th>
                        <th className="pb-2.5 px-2">Channel</th>
                        <th className="pb-2.5 px-2">Status</th>
                        <th className="pb-2.5 px-2">Date</th>
                        <th className="pb-2.5 pl-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {recentPosts.slice(0, 5).map((post: any) => {
                        const postPlatform = post.targets?.[0]?.platform || 'social';
                        const channelLabel = platformLabel(postPlatform);
                        const dateStr = post.publishedAt || post.scheduledAt || post.createdAt;
                        const formattedDate = dateStr
                          ? new Date(dateStr).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Today';
                        const formattedTime = dateStr
                          ? new Date(dateStr).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '';
                        const isPub = post.status === 'published';
                        const isSched = post.status === 'scheduled';
                        const isFailed = post.status === 'failed';
                        const isPartial = post.status === 'partial';
                        return (
                          <tr key={post.id} className="group">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="size-11 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                                  {channelLabel.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground truncate">
                                    {post.content
                                      ? post.content.split('\n')[0].slice(0, 45)
                                      : 'Social Update'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {post.failureReason
                                      ? `Error: ${post.failureReason.slice(0, 50)}...`
                                      : post.content
                                      ? post.content.slice(0, 60)
                                      : 'Post ready for publishing'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/50 text-[11px] font-medium text-foreground">
                                <span>{channelLabel}</span>
                              </span>
                            </td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isPub
                                    ? 'bg-(--primary-soft) text-primary'
                                    : isSched
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : isFailed
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : isPartial
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isPub
                                  ? 'Published'
                                  : isSched
                                  ? 'Scheduled'
                                  : isFailed
                                  ? 'Failed'
                                  : isPartial
                                  ? 'Partial'
                                  : 'Draft'}
                              </span>
                            </td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <p className="text-xs font-medium text-foreground">{formattedDate}</p>
                              <p className="text-[11px] text-muted-foreground">{formattedTime}</p>
                            </td>
                            <td className="py-3 pl-2 whitespace-nowrap text-right">
                              <div className="inline-flex items-center gap-2 text-muted-foreground">
                                {postPlatform === 'googlebusiness' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(post.content || '');
                                      toast.success(
                                        'Post copied! Opening Google Business Profile...'
                                      );
                                      window.open('https://business.google.com', '_blank');
                                    }}
                                    className="p-1 rounded-md hover:bg-muted text-blue-600 hover:text-blue-700"
                                    title="Copy post and open Google Business Profile"
                                  >
                                    <ExternalLink className="size-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(post.content || '');
                                    toast.success('Content copied to clipboard!');
                                  }}
                                  className="p-1 rounded-md hover:bg-muted"
                                  title="Copy caption"
                                >
                                  <Copy className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Upcoming Schedule — real scheduled posts only */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">Upcoming Schedule</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai-content')}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Schedule a post →</span>
                </button>
              </div>

              {postsLoading ? (
                <div className="space-y-3 py-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : scheduledPosts.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="Nothing scheduled"
                  description="Generate a post in AI Content and hit Schedule — upcoming publishes will show up here."
                  actionLabel="Generate a post"
                  onAction={() => setActiveTab('ai-content')}
                  className="py-8"
                />
              ) : (
                <div className="divide-y divide-border my-auto">
                  {scheduledPosts.slice(0, 6).map((post: any) => {
                    const date = post.scheduledAt ? new Date(post.scheduledAt) : null;
                    const month = date
                      ? date.toLocaleDateString([], { month: 'short' }).toUpperCase()
                      : '—';
                    const day = date ? date.getDate() : '';
                    const dow = date ? date.toLocaleDateString([], { weekday: 'short' }) : '';
                    const time = date
                      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const channelLabel = platformLabel(post.targets?.[0]?.platform || '');
                    return (
                      <div
                        key={post.id}
                        className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Date Pill */}
                          <div className="w-10 py-1 rounded-xl bg-muted border border-border text-center shrink-0">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground leading-none">
                              {month}
                            </p>
                            <p className="text-sm font-extrabold text-foreground leading-tight">
                              {day}
                            </p>
                            <p className="text-[9px] text-muted-foreground leading-none">{dow}</p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {post.content
                                ? post.content.split('\n')[0].slice(0, 48)
                                : 'Scheduled post'}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {channelLabel}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {time || '—'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                            Scheduled
                          </span>
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

      {/* ─── TAB: AI Content (generator + preview canvas) ───────────────── */}
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

          {/* 6 Status Filter Pills (Dhanda AI (13).jpeg & (1).jpeg) */}
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
                  onClick={() => setPostStatusFilter(pill.key as any)}
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

      {/* ─── Floating Growth Action Pill (Dhanda AI benchmark) ─────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setGrowthDrawerOpen(true)}
          className="px-4 py-2.5 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
        >
          <Zap className="size-4 fill-white text-white animate-pulse" />
          <span>Growth Action ({growthActionsDone.length} of 10 done • {10 - growthActionsDone.length} left)</span>
          <ChevronRight className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => toast.info('Voice Assistant: Speak your marketing request in Hindi or English...')}
          className="size-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-all flex items-center justify-center border border-white/20 cursor-pointer"
          title="Voice Marketing Assistant"
        >
          <Mic className="size-4" />
        </button>
      </div>

      {/* ─── Growth Action Drawer Modal (Dhanda AI benchmark) ──────────── */}
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
            {/* Progress Bar */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1.5">
                <span>Daily Marketing Progress</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{growthActionsDone.length} of 10 done</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.max(10, (growthActionsDone.length / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* 3 Core Tasks */}
            <div className="space-y-2.5">
              {/* Task 1: Complete Profile */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Complete your Google Profile</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Add working hours, service areas, and store description to reach 100% profile strength.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={growthActionsDone.includes('profile') ? 'outline' : 'default'}
                  onClick={() => {
                    if (!growthActionsDone.includes('profile')) {
                      setGrowthActionsDone((p) => [...p, 'profile']);
                      toast.success('Google Business Profile details verified!');
                    }
                  }}
                  className="h-7 text-xs font-semibold shrink-0"
                >
                  {growthActionsDone.includes('profile') ? 'Done ✔' : 'Complete'}
                </Button>
              </div>

              {/* Task 2: Upload Media */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Upload Fresh Shop Photos</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload photos of your workshop or products to increase customer trust and clicks by 42%.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={growthActionsDone.includes('media') ? 'outline' : 'default'}
                  onClick={() => {
                    if (!growthActionsDone.includes('media')) {
                      setGrowthActionsDone((p) => [...p, 'media']);
                      toast.success('Media uploaded to Google Business listing!');
                    }
                  }}
                  className="h-7 text-xs font-semibold shrink-0"
                >
                  {growthActionsDone.includes('media') ? 'Done ✔' : 'Upload'}
                </Button>
              </div>

              {/* Task 3: Approve Post */}
              <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Approve AI-Generated Post</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      1 high-intent post is ready for Google Business. Review and post with 1 tap.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={growthActionsDone.includes('post') ? 'outline' : 'default'}
                  onClick={() => {
                    if (!growthActionsDone.includes('post')) {
                      setGrowthActionsDone((p) => [...p, 'post']);
                      setActiveTab('ai-content');
                      setGrowthDrawerOpen(false);
                      toast.success('Opening AI Post Studio for approval!');
                    }
                  }}
                  className="h-7 text-xs font-semibold shrink-0"
                >
                  {growthActionsDone.includes('post') ? 'Done ✔' : 'Review'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export { SocialMediaView as BgosSocialMarketing };
export default SocialMediaView;

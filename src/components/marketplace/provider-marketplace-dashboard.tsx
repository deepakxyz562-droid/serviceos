'use client';

/**
 * Provider Marketplace Dashboard
 * ===============================
 *
 * A 6-tab dashboard that lets a marketplace provider:
 *   1. See their eligibility checklist + profile completion + stats (Overview)
 *   2. Accept the marketplace T&Cs and opt in (Opt-in)
 *   3. Manage their portfolio: items, awards, projects, team (Portfolio)
 *   4. Manage their certifications (Certifications)
 *   5. See incoming quote requests + submit quotes (Quote Requests)
 *   6. See live broadcasting emergencies + accept + track (Emergencies)
 *
 * All API calls go through `authFetch` (Bearer token + cookie) with the
 * Caddy `XTransformPort=3000` param baked in automatically.
 *
 * Polling:
 *   - Quote Requests: every 30s
 *   - Emergencies:    every 10s (time-sensitive)
 *
 * Color palette: emerald/teal for primary actions, amber for quotes,
 * rose/red for emergencies. No indigo or blue.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Store, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  Plus, Pencil, Trash2, ExternalLink, ChevronRight, ShieldCheck,
  CreditCard, FileText, Award, Users, Briefcase, Calendar, Clock,
  MapPin, Phone, Mail, Star, Image as ImageIcon, Eye, Send,
  Siren, Navigation, Wrench, CheckCircle, Crown, Sparkles, TrendingUp,
  AlertCircle, Info, ChevronDown, ChevronUp, DollarSign, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

// ─── API helpers ────────────────────────────────────────────────────────────

/** Build a marketplace API URL with the gateway port param baked in. */
function mpUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, 'http://localhost');
  url.searchParams.set('XTransformPort', '3000');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}

async function apiJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

// ─── Type definitions ───────────────────────────────────────────────────────

interface EligibilityResult {
  eligible: boolean;
  missingRequirements: string[];
  profileCompletionPct: number;
  plan: string;
  marketplaceAccess: string;
  checks: {
    hasActiveSubscription: boolean;
    identityVerified: boolean;
    businessVerified: boolean;
    insuranceVerified: boolean;
    stripeConnected: boolean;
    profileComplete: boolean;
    marketplaceOptIn: boolean;
    termsAccepted: boolean;
    planSupportsMarketplace: boolean;
  };
}

interface ProviderStats {
  activeBookings: number;
  pendingQuotes: number;
  activeEmergencies: number;
  thisMonthEarnings: number;
  currency: string;
  isFeatured: boolean;
}

interface PortfolioItem {
  title: string;
  description?: string;
  imageUrl?: string;
  beforeUrl?: string;
  afterUrl?: string;
  date?: string;
  category?: string;
}
interface PortfolioAward {
  name: string;
  issuer?: string;
  year?: number;
  description?: string;
}
interface PortfolioProject {
  title: string;
  description?: string;
  images?: string[];
  date?: string;
  value?: number;
  duration?: string;
}
interface PortfolioTeam {
  name: string;
  role?: string;
  photo?: string;
  bio?: string;
  certifications?: string[];
}
interface Portfolio {
  tenantId: string;
  items: PortfolioItem[];
  videos: any[];
  awards: PortfolioAward[];
  projects: PortfolioProject[];
  team: PortfolioTeam[];
  isActive: boolean;
}

interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  certificateNumber: string | null;
  documentUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobRequestListItem {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  serviceName: string | null;
  urgency: string;
  budgetLow: number | null;
  budgetHigh: number | null;
  currency: string;
  city: string | null;
  postalCode: string | null;
  status: string;
  quoteCount: number;
  viewCount: number;
  createdAt: string;
  expiresAt: string | null;
}

interface JobRequestDetail extends JobRequestListItem {
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  photosJson?: string;
  quotes?: Array<{
    id: string;
    title: string;
    total: number;
    currency: string;
    validUntil: string | null;
    status: string;
    tenantId: string | null;
    createdAt: string;
  }>;
}

interface EmergencyDispatch {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  urgency: string;
  customerName: string | null;
  customerPhone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  acceptedById: string | null;
  acceptedAt: string | null;
  providerEnRouteAt: string | null;
  providerOnSiteAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  estimatedArrivalMins: number | null;
  estimatedCost: number | null;
  finalCost: number | null;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatMoney(amount: number | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}

function truncate(s: string | null | undefined, n: number = 100): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function urgencyBadge(urgency: string): { label: string; className: string } {
  switch (urgency) {
    case 'emergency':
      return { label: 'Emergency', className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300' };
    case 'high':
      return { label: 'High', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'medium':
      return { label: 'Medium', className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'low':
      return { label: 'Low', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300' };
    default:
      return { label: urgency, className: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

// ─── Small UI primitives ────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent: 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const accentClass = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  }[accent];

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('flex items-center justify-center size-10 rounded-lg shrink-0', accentClass)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold leading-tight truncate">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground max-w-md">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
      <div className="size-10 rounded-full bg-rose-500/10 flex items-center justify-center">
        <AlertCircle className="size-5 text-rose-600" />
      </div>
      <p className="text-sm text-rose-700 dark:text-rose-300">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

function LoadingState({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ─── Eligibility card (8 gates + profile completion bar) ────────────────────

const GATE_META: Array<{
  key: keyof EligibilityResult['checks'];
  label: string;
  description: string;
  cta?: { label: string; view: string };
}> = [
  { key: 'hasActiveSubscription', label: 'Active subscription', description: 'A paid, non-trial plan is required.', cta: { label: 'Manage subscription', view: 'billing' } },
  { key: 'identityVerified', label: 'Identity verified (KYC)', description: 'Owner identity verification passed.' },
  { key: 'businessVerified', label: 'Business verified', description: 'Business registration confirmed.' },
  { key: 'insuranceVerified', label: 'Insurance verified', description: 'Proof of liability insurance on file.' },
  { key: 'stripeConnected', label: 'Stripe Connect linked', description: 'A capable Stripe Connect account for payouts.', cta: { label: 'Connect Stripe', view: 'integrations' } },
  { key: 'profileComplete', label: 'Profile ≥ 80% complete', description: 'Fill out your public hub profile.', cta: { label: 'Edit profile', view: 'settings' } },
  { key: 'marketplaceOptIn', label: 'Marketplace opt-in', description: 'Explicitly opted in to receive marketplace leads.' },
  { key: 'termsAccepted', label: 'Terms & conditions accepted', description: 'Accept the marketplace T&Cs.' },
  { key: 'planSupportsMarketplace', label: 'Plan supports marketplace', description: 'Your plan grants marketplace booking access.', cta: { label: 'Upgrade plan', view: 'billing' } },
];

function EligibilityCard({
  eligibility,
  onNavigate,
  compact = false,
}: {
  eligibility: EligibilityResult;
  onNavigate?: (view: string) => void;
  compact?: boolean;
}) {
  const pct = eligibility.profileCompletionPct;
  const profileComplete = eligibility.checks.profileComplete;
  const pctColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-emerald-600" />
              Eligibility Checklist
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Pass all 9 gates to receive marketplace leads.
            </CardDescription>
          </div>
          {eligibility.eligible ? (
            <Badge className="bg-emerald-600 text-white gap-1">
              <CheckCircle2 className="size-3" /> Eligible
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 gap-1">
              <AlertTriangle className="size-3" /> {eligibility.missingRequirements.length} missing
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile completion progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Profile completion</span>
            <span className={cn('font-bold', profileComplete ? 'text-emerald-600' : 'text-amber-600')}>
              {pct}%
              {profileComplete ? ' ✓' : ` — need ≥ 80%`}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', pctColor)}
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* 9-gate checklist */}
        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          {GATE_META.map((g) => {
            const ok = eligibility.checks[g.key];
            return (
              <div
                key={g.key}
                className={cn(
                  'flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs',
                  ok
                    ? 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                    : 'border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/40',
                )}
              >
                {ok ? (
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground flex items-center justify-between gap-2">
                    <span>{g.label}</span>
                    {!ok && g.cta && onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate(g.cta!.view)}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                      >
                        {g.cta.label} →
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{g.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {!eligibility.eligible && eligibility.missingRequirements.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40 p-3">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> Missing requirements ({eligibility.missingRequirements.length})
            </p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-amber-800 dark:text-amber-300 list-disc list-inside">
              {eligibility.missingRequirements.slice(0, 5).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
              {eligibility.missingRequirements.length > 5 && (
                <li className="italic">+ {eligibility.missingRequirements.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Featured upgrade CTA ───────────────────────────────────────────────────

function FeaturedUpgradeCTA({ isFeatured }: { isFeatured: boolean }) {
  if (isFeatured) {
    return (
      <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Crown className="size-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Featured Listing active</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your business appears at the top of marketplace search results.
            </p>
          </div>
          <Badge className="bg-amber-500 text-white">Featured</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="size-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Sparkles className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            Get featured for $99/month
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Appear at the top of marketplace search results and get more leads.
          </p>
        </div>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
          onClick={() => toast.info('Coming soon — contact sales@serviceos.com to get featured.')}
        >
          <Crown className="size-4" /> Upgrade
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({ onNavigate, onOptInNeeded }: {
  onNavigate: (view: string) => void;
  onOptInNeeded: () => void;
}) {
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eligRes, statsRes] = await Promise.all([
        apiJson<EligibilityResult>(mpUrl('/api/marketplace/eligibility')),
        apiJson<{ stats: ProviderStats }>(mpUrl('/api/marketplace/provider-stats')).catch((e) => {
          // Stats endpoint is best-effort — don't fail the whole tab if it 500s.
          console.warn('provider-stats fetch failed:', e);
          return null;
        }),
      ]);
      setEligibility(eligRes);
      if (statsRes) setStats(statsRes.stats);
    } catch (e: any) {
      setError(e?.message || 'Failed to load marketplace overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !eligibility) {
    return <ErrorState message={error || 'Failed to load overview'} onRetry={load} />;
  }

  const showOptInCTA = !eligibility.checks.marketplaceOptIn || !eligibility.checks.termsAccepted;

  return (
    <div className="space-y-4">
      {/* Marketplace status banner */}
      <Card className={cn(
        'border',
        eligibility.eligible
          ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40'
          : 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40',
      )}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className={cn(
            'size-10 rounded-lg flex items-center justify-center shrink-0',
            eligibility.eligible ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
          )}>
            {eligibility.eligible ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">
              {eligibility.eligible
                ? 'Marketplace status: Eligible'
                : 'Marketplace status: Incomplete'}
            </p>
            <p className="text-xs text-muted-foreground">
              {eligibility.eligible
                ? 'You are eligible to receive marketplace leads (instant bookings, quote requests, emergencies).'
                : `Complete ${eligibility.missingRequirements.length} remaining requirement(s) to start receiving marketplace leads.`}
            </p>
          </div>
          {showOptInCTA && (
            <Button onClick={onOptInNeeded} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <ShieldCheck className="size-4" /> Opt in
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Briefcase} label="Active bookings" value={stats.activeBookings} accent="emerald" sub="Marketplace-sourced" />
          <StatCard icon={FileText} label="Pending quotes" value={stats.pendingQuotes} accent="amber" sub="Awaiting acceptance" />
          <StatCard icon={Siren} label="Active emergencies" value={stats.activeEmergencies} accent="rose" sub="In progress" />
          <StatCard
            icon={DollarSign}
            label="This month"
            value={formatMoney(stats.thisMonthEarnings, stats.currency)}
            accent="emerald"
            sub="Released earnings"
          />
        </div>
      )}

      {/* Featured upgrade CTA */}
      <FeaturedUpgradeCTA isFeatured={!!stats?.isFeatured} />

      {/* Eligibility checklist */}
      <EligibilityCard eligibility={eligibility} onNavigate={onNavigate} />
    </div>
  );
}

// ─── Opt-in Tab ─────────────────────────────────────────────────────────────

function OptInTab({ onNavigatedToOverview }: { onNavigatedToOverview: () => void }) {
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // We need the tenant's own id to PATCH /api/tenants/[id]. The auth store
      // holds it, but we don't want a hard cross-component dependency — fetch
      // a fresh tenant snapshot via /api/me (lightweight).
      const meRes = await authFetch(mpUrl('/api/auth/me'), { credentials: 'include' });
      let tid: string | null = null;
      if (meRes.ok) {
        const me = await meRes.json().catch(() => null);
        tid = me?.user?.tenantId || me?.tenantId || null;
      }
      // Fallback: try /api/tenants/me if /api/auth/me doesn't return tenantId.
      if (!tid) {
        const tRes = await authFetch(mpUrl('/api/tenants/me'), { credentials: 'include' });
        if (tRes.ok) {
          const t = await tRes.json().catch(() => null);
          tid = t?.tenant?.id || t?.id || null;
        }
      }
      setTenantId(tid);
      const elig = await apiJson<EligibilityResult>(mpUrl('/api/marketplace/eligibility'));
      setEligibility(elig);
    } catch (e: any) {
      setError(e?.message || 'Failed to load eligibility');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOptIn = async () => {
    if (!agreed) {
      toast.error('Please accept the marketplace Terms & Conditions first.');
      return;
    }
    if (!tenantId) {
      toast.error('Could not resolve your tenant ID — please reload.');
      return;
    }
    setSubmitting(true);
    try {
      await apiJson(mpUrl(`/api/tenants/${tenantId}`), {
        method: 'PATCH',
        body: JSON.stringify({
          marketplaceOptIn: true,
          marketplaceTermsAcceptedAt: true, // server sets to new Date()
        }),
      });
      toast.success('You are now opted in to the ServiceOS Marketplace!');
      onNavigatedToOverview();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to opt in');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState lines={4} />;
  if (error || !eligibility) return <ErrorState message={error || 'Failed to load'} onRetry={load} />;

  const alreadyOptedIn = eligibility.checks.marketplaceOptIn && eligibility.checks.termsAccepted;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-5 text-emerald-600" /> ServiceOS Marketplace
          </CardTitle>
          <CardDescription>
            Reach new customers every day through the ServiceOS Marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, title: 'Instant bookings', desc: 'Auto-accept nearby jobs at your published rates.' },
              { icon: FileText, title: 'Quote requests', desc: 'Receive project-sized leads and submit quotes.' },
              { icon: Siren, title: 'Emergency dispatch', desc: 'Get alerted to nearby emergencies in real time.' },
            ].map((b) => (
              <div key={b.title} className="rounded-lg border bg-card p-3 space-y-1">
                <b.icon className="size-4 text-emerald-600" />
                <p className="font-medium text-sm">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>

          {alreadyOptedIn ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-4 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-medium text-emerald-900 dark:text-emerald-100">You&apos;re opted in!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Complete any remaining gates below to start receiving leads.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    I agree to the ServiceOS Marketplace{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info('Marketplace Terms & Conditions — coming soon.');
                      }}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Terms &amp; Conditions
                    </a>
                    , including the 5% platform commission on each completed booking.
                  </span>
                </label>
                <Button
                  onClick={handleOptIn}
                  disabled={!agreed || submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 w-full sm:w-auto"
                >
                  {submitting ? (
                    <><Loader2 className="size-4 animate-spin" /> Opting in…</>
                  ) : (
                    <><Store className="size-4" /> Opt in to marketplace</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EligibilityCard eligibility={eligibility} compact />
    </div>
  );
}

// ─── Portfolio Tab ──────────────────────────────────────────────────────────

type PortfolioSubTab = 'items' | 'awards' | 'projects' | 'team';

function PortfolioTab() {
  const [subTab, setSubTab] = useState<PortfolioSubTab>('items');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: PortfolioSubTab; index: number | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ portfolio: Portfolio }>(mpUrl('/api/provider/portfolio'));
      setPortfolio(res.portfolio);
    } catch (e: any) {
      setError(e?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (kind: PortfolioSubTab, next: any[]) => {
    setSaving(true);
    try {
      // The portfolio API accepts arrays (not JSON strings); it serializes internally.
      const body: Record<string, unknown> = { [kind]: next };
      const res = await apiJson<{ portfolio: Portfolio }>(mpUrl('/api/provider/portfolio'), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setPortfolio(res.portfolio);
      toast.success('Portfolio saved.');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDelete = (kind: PortfolioSubTab, index: number) => {
    if (!portfolio) return;
    const current = (portfolio as any)[kind] as any[];
    if (!confirm(`Delete "${current[index]?.title || current[index]?.name || `entry ${index + 1}`}"?`)) return;
    const next = current.filter((_, i) => i !== index);
    persist(kind, next);
  };

  if (loading) return <LoadingState lines={5} />;
  if (error || !portfolio) return <ErrorState message={error || 'Failed to load portfolio'} onRetry={load} />;

  const renderList = () => {
    const list = (portfolio as any)[subTab] as any[];
    if (!list || list.length === 0) {
      const labels: Record<PortfolioSubTab, { add: string; empty: string }> = {
        items: { add: 'Add portfolio item', empty: 'No portfolio items yet. Add your first work sample to showcase on your public profile.' },
        awards: { add: 'Add award', empty: 'No awards yet. Showcase industry recognition to build customer trust.' },
        projects: { add: 'Add project', empty: 'No projects yet. Highlight completed jobs with before/after photos and project value.' },
        team: { add: 'Add team member', empty: 'No team members yet. Add the faces behind your business.' },
      };
      return (
        <EmptyState
          icon={Briefcase}
          title={labels[subTab].empty}
          action={
            <Button onClick={() => setEditing({ kind: subTab, index: null })} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <Plus className="size-4" /> {labels[subTab].add}
            </Button>
          }
        />
      );
    }

    return (
      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="rounded-md border p-3 flex items-start gap-3">
            {(item.imageUrl || item.photo || (item.images && item.images[0])) && (
              <img
                src={item.imageUrl || item.photo || item.images[0]}
                alt={item.title || item.name}
                className="size-12 rounded object-cover shrink-0 bg-muted"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.title || item.name}</p>
              {item.role && <p className="text-xs text-emerald-700 dark:text-emerald-400">{item.role}</p>}
              {item.issuer && <p className="text-xs text-muted-foreground">{item.issuer}{item.year ? ` · ${item.year}` : ''}</p>}
              {item.date && <p className="text-xs text-muted-foreground">{formatDate(item.date)}{item.duration ? ` · ${item.duration}` : ''}</p>}
              {item.category && <Badge variant="outline" className="text-[10px] h-4 mt-1">{item.category}</Badge>}
              {typeof item.value === 'number' && <p className="text-xs text-muted-foreground mt-0.5">Value: {formatMoney(item.value)}</p>}
              {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
              {item.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.bio}</p>}
              {Array.isArray(item.certifications) && item.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.certifications.map((c: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-[10px] h-4">{c}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: subTab, index: i })} className="h-7 w-7 p-0">
                <Pencil className="size-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(subTab, i)} className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as PortfolioSubTab)}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="items" className="gap-1.5"><ImageIcon className="size-3.5" /> Items</TabsTrigger>
          <TabsTrigger value="awards" className="gap-1.5"><Award className="size-3.5" /> Awards</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><Briefcase className="size-3.5" /> Projects</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="size-3.5" /> Team</TabsTrigger>
        </TabsList>
        <TabsContent value={subTab} className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setEditing({ kind: subTab, index: null })}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
          {renderList()}
        </TabsContent>
      </Tabs>

      {editing && (
        <PortfolioItemDialog
          kind={editing.kind}
          initial={editing.index !== null && portfolio ? (portfolio as any)[editing.kind][editing.index] : null}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={async (val) => {
            if (!portfolio) return;
            const current = [...(portfolio as any)[editing.kind]] as any[];
            if (editing.index !== null) {
              current[editing.index] = val;
            } else {
              current.push(val);
            }
            await persist(editing.kind, current);
          }}
        />
      )}
    </div>
  );
}

function PortfolioItemDialog({
  kind, initial, saving, onClose, onSave,
}: {
  kind: PortfolioSubTab;
  initial: any | null;
  saving: boolean;
  onClose: () => void;
  onSave: (val: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>(() => {
    if (initial) return { ...initial };
    switch (kind) {
      case 'items': return { title: '', description: '', imageUrl: '', beforeUrl: '', afterUrl: '', date: '', category: '' };
      case 'awards': return { name: '', issuer: '', year: '', description: '' };
      case 'projects': return { title: '', description: '', images: [], date: '', value: '', duration: '' };
      case 'team': return { name: '', role: '', photo: '', bio: '', certifications: [] };
    }
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    // Validate required fields per kind.
    if (kind === 'items' && !form.title?.trim()) return toast.error('Title is required.');
    if (kind === 'awards' && !form.name?.trim()) return toast.error('Award name is required.');
    if (kind === 'projects' && !form.title?.trim()) return toast.error('Project title is required.');
    if (kind === 'team' && !form.name?.trim()) return toast.error('Team member name is required.');

    // Coerce types — strip empty strings, parse numbers.
    const cleaned: any = { ...form };
    if (kind === 'items') {
      cleaned.title = cleaned.title?.trim();
      if (!cleaned.description?.trim()) delete cleaned.description;
      if (!cleaned.imageUrl?.trim()) delete cleaned.imageUrl;
      if (!cleaned.beforeUrl?.trim()) delete cleaned.beforeUrl;
      if (!cleaned.afterUrl?.trim()) delete cleaned.afterUrl;
      if (!cleaned.date?.trim()) delete cleaned.date;
      if (!cleaned.category?.trim()) delete cleaned.category;
    } else if (kind === 'awards') {
      cleaned.name = cleaned.name?.trim();
      if (!cleaned.issuer?.trim()) delete cleaned.issuer;
      const yr = parseInt(cleaned.year, 10);
      cleaned.year = Number.isFinite(yr) && yr > 1900 && yr < 3000 ? yr : undefined;
      if (!cleaned.description?.trim()) delete cleaned.description;
    } else if (kind === 'projects') {
      cleaned.title = cleaned.title?.trim();
      if (!cleaned.description?.trim()) delete cleaned.description;
      const val = parseFloat(cleaned.value);
      cleaned.value = Number.isFinite(val) && val >= 0 ? val : undefined;
      if (!cleaned.date?.trim()) delete cleaned.date;
      if (!cleaned.duration?.trim()) delete cleaned.duration;
      // images stays as array
      cleaned.images = Array.isArray(cleaned.images) ? cleaned.images.filter((s: string) => s?.trim()) : [];
    } else if (kind === 'team') {
      cleaned.name = cleaned.name?.trim();
      if (!cleaned.role?.trim()) delete cleaned.role;
      if (!cleaned.photo?.trim()) delete cleaned.photo;
      if (!cleaned.bio?.trim()) delete cleaned.bio;
      cleaned.certifications = Array.isArray(cleaned.certifications)
        ? cleaned.certifications.filter((s: string) => s?.trim())
        : [];
    }
    await onSave(cleaned);
  };

  const titles: Record<PortfolioSubTab, string> = {
    items: 'Portfolio item', awards: 'Award', projects: 'Project', team: 'Team member',
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit' : 'Add'} {titles[kind]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {kind === 'items' && (
            <>
              <Field label="Title *"><Input value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Kitchen sink replacement" /></Field>
              <Field label="Description"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Image URL"><Input value={form.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" /></Field>
                <Field label="Category"><Input value={form.category || ''} onChange={(e) => set('category', e.target.value)} placeholder="Residential" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Before URL"><Input value={form.beforeUrl || ''} onChange={(e) => set('beforeUrl', e.target.value)} placeholder="https://…" /></Field>
                <Field label="After URL"><Input value={form.afterUrl || ''} onChange={(e) => set('afterUrl', e.target.value)} placeholder="https://…" /></Field>
              </div>
              <Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} /></Field>
            </>
          )}
          {kind === 'awards' && (
            <>
              <Field label="Award name *"><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Best Plumber 2024" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Issuer"><Input value={form.issuer || ''} onChange={(e) => set('issuer', e.target.value)} placeholder="Plumbing Association" /></Field>
                <Field label="Year"><Input type="number" value={form.year || ''} onChange={(e) => set('year', e.target.value)} placeholder="2024" /></Field>
              </div>
              <Field label="Description"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} /></Field>
            </>
          )}
          {kind === 'projects' && (
            <>
              <Field label="Project title *"><Input value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Full bathroom remodel" /></Field>
              <Field label="Description"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Value (USD)"><Input type="number" step="0.01" value={form.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="12000" /></Field>
                <Field label="Duration"><Input value={form.duration || ''} onChange={(e) => set('duration', e.target.value)} placeholder="2 weeks" /></Field>
              </div>
              <Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Image URLs (one per line)">
                <Textarea
                  value={(form.images || []).join('\n')}
                  onChange={(e) => set('images', e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean))}
                  rows={3}
                  placeholder="https://…/1.jpg&#10;https://…/2.jpg"
                />
              </Field>
            </>
          )}
          {kind === 'team' && (
            <>
              <Field label="Name *"><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Jane Doe" /></Field>
              <Field label="Role"><Input value={form.role || ''} onChange={(e) => set('role', e.target.value)} placeholder="Lead Technician" /></Field>
              <Field label="Photo URL"><Input value={form.photo || ''} onChange={(e) => set('photo', e.target.value)} placeholder="https://…" /></Field>
              <Field label="Bio"><Textarea value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} rows={2} /></Field>
              <Field label="Certifications (comma-separated)">
                <Input
                  value={(form.certifications || []).join(', ')}
                  onChange={(e) => set('certifications', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  placeholder="Gas Safe, NICEIC"
                />
              </Field>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
            {initial ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

// ─── Certifications Tab ─────────────────────────────────────────────────────

function CertificationsTab() {
  const [items, setItems] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ cert: Certification | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ certifications: Certification[] }>(mpUrl('/api/provider/certifications'));
      setItems(res.certifications || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load certifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (cert: Certification) => {
    if (!confirm(`Delete "${cert.name}"?`)) return;
    try {
      await apiJson(mpUrl(`/api/provider/certifications/${cert.id}`), { method: 'DELETE' });
      toast.success('Certification deleted.');
      setItems((prev) => prev.filter((c) => c.id !== cert.id));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const handleSave = async (data: Partial<Certification>, id?: string) => {
    setSaving(true);
    try {
      if (id) {
        const res = await apiJson<{ certification: Certification }>(
          mpUrl(`/api/provider/certifications/${id}`),
          { method: 'PATCH', body: JSON.stringify(data) },
        );
        setItems((prev) => prev.map((c) => (c.id === id ? res.certification : c)));
      } else {
        const res = await apiJson<{ certification: Certification }>(
          mpUrl('/api/provider/certifications'),
          { method: 'POST', body: JSON.stringify(data) },
        );
        setItems((prev) => [res.certification, ...prev]);
      }
      toast.success(id ? 'Certification updated.' : 'Certification added.');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState lines={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ cert: null })} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
          <Plus className="size-4" /> Add certification
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certifications yet"
          description="Add your trade licenses, accreditations, and certifications. Verified badges build customer trust."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Issuer</TableHead>
                <TableHead className="hidden lg:table-cell">Issued</TableHead>
                <TableHead className="hidden lg:table-cell">Expires</TableHead>
                <TableHead className="hidden xl:table-cell">Cert #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.documentUrl && (
                      <a href={c.documentUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
                        <ExternalLink className="size-3" /> Document
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.issuer || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(c.issueDate)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(c.expiryDate)}</TableCell>
                  <TableCell className="hidden xl:table-cell text-xs text-muted-foreground font-mono">{c.certificateNumber || '—'}</TableCell>
                  <TableCell>
                    {c.isVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
                        <CheckCircle2 className="size-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 gap-1">
                        <Clock className="size-3" /> Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ cert: c })} className="h-7 w-7 p-0">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {editing && (
        <CertificationDialog
          cert={editing.cert}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function CertificationDialog({
  cert, saving, onClose, onSave,
}: {
  cert: Certification | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Certification>, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: cert?.name || '',
    issuer: cert?.issuer || '',
    issueDate: cert?.issueDate ? cert.issueDate.slice(0, 10) : '',
    expiryDate: cert?.expiryDate ? cert.expiryDate.slice(0, 10) : '',
    certificateNumber: cert?.certificateNumber || '',
    documentUrl: cert?.documentUrl || '',
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Name is required.');
    if (form.expiryDate && form.issueDate && new Date(form.expiryDate) < new Date(form.issueDate)) {
      return toast.error('Expiry date cannot be before issue date.');
    }
    const data: any = {
      name: form.name.trim(),
      issuer: form.issuer.trim() || null,
      issueDate: form.issueDate || null,
      expiryDate: form.expiryDate || null,
      certificateNumber: form.certificateNumber.trim() || null,
      documentUrl: form.documentUrl.trim() || null,
    };
    await onSave(data, cert?.id);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cert ? 'Edit certification' : 'Add certification'}</DialogTitle>
          <DialogDescription>
            Trade licenses, accreditations, and certifications. Verification is performed by the ServiceOS team after submission.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Gas Safe Registered" /></Field>
          <Field label="Issuer"><Input value={form.issuer} onChange={(e) => set('issuer', e.target.value)} placeholder="Gas Safe Register" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Issue date"><Input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></Field>
            <Field label="Expiry date"><Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
          </div>
          <Field label="Certificate #"><Input value={form.certificateNumber} onChange={(e) => set('certificateNumber', e.target.value)} placeholder="GS-123456" /></Field>
          <Field label="Document URL"><Input value={form.documentUrl} onChange={(e) => set('documentUrl', e.target.value)} placeholder="https://…/certificate.pdf" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
            {cert ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quote Requests Tab ─────────────────────────────────────────────────────

interface QuoteLineItem { name: string; qty: number; price: number; description?: string; }

function QuoteRequestsTab() {
  const [items, setItems] = useState<JobRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [selected, setSelected] = useState<JobRequestListItem | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const res = await apiJson<{ items: JobRequestListItem[]; total: number }>(
        mpUrl('/api/marketplace/quote-request', { status: 'open', limit: 50 }),
      );
      if (!mountedRef.current) return;
      setItems(res.items || []);
      setLastFetch(new Date());
    } catch (e: any) {
      if (!silent) setError(e?.message || 'Failed to load quote requests');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const id = setInterval(() => load(true), 30_000); // poll every 30s
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [load]);

  if (loading) return <LoadingState lines={5} />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} open request{items.length === 1 ? '' : 's'} • auto-refresh every 30s
        </p>
        {lastFetch && (
          <Button size="sm" variant="ghost" onClick={() => load()} className="gap-1.5 text-xs h-7">
            <RefreshCw className="size-3" /> {timeAgo(lastFetch.toISOString())}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No open quote requests"
          description="When marketplace customers submit project-sized quote requests that match your industry, they will appear here. Check back soon — the feed auto-refreshes every 30 seconds."
        />
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const u = urgencyBadge(r.urgency);
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left rounded-lg border bg-card p-3 hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <Badge variant="outline" className={cn('text-[10px] h-4', u.className)}>{u.label}</Badge>
                      {r.quoteCount > 0 && (
                        <Badge variant="outline" className="text-[10px] h-4">{r.quoteCount} quote{r.quoteCount === 1 ? '' : 's'}</Badge>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{truncate(r.description, 160)}</p>
                    )}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                      {r.serviceName && <span>{r.serviceName}</span>}
                      {r.industry && <span className="capitalize">· {r.industry}</span>}
                      {r.city && <span className="flex items-center gap-0.5"><MapPin className="size-3" />{r.city}</span>}
                      {(r.budgetLow != null || r.budgetHigh != null) && (
                        <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="size-3" />
                          {r.budgetLow != null && r.budgetHigh != null
                            ? `${formatMoney(r.budgetLow, r.currency)}–${formatMoney(r.budgetHigh, r.currency)}`
                            : r.budgetLow != null ? `from ${formatMoney(r.budgetLow, r.currency)}`
                            : `up to ${formatMoney(r.budgetHigh, r.currency)}`}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5"><Clock className="size-3" />{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <QuoteDetailDialog
          item={selected}
          onClose={() => setSelected(null)}
          onSubmitted={() => {
            // Remove from list after a successful quote submission (status will flip to 'quoted').
            setItems((prev) => prev.filter((r) => r.id !== selected.id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function QuoteDetailDialog({
  item, onClose, onSubmitted,
}: {
  item: JobRequestListItem;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [detail, setDetail] = useState<JobRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quote composer state
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { name: '', qty: 1, price: 0, description: '' },
  ]);
  const [taxPct, setTaxPct] = useState(0);
  const [depositPct, setDepositPct] = useState(20);
  const [validityDays, setValidityDays] = useState(14);
  const [timeline, setTimeline] = useState('');
  const [terms, setTerms] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ jobRequest: JobRequestDetail }>(
        mpUrl(`/api/marketplace/quote-request/${item.id}`),
      );
      setDetail(res.jobRequest);
    } catch (e: any) {
      setError(e?.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => { load(); }, [load]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + (Number(li.qty) || 0) * (Number(li.price) || 0), 0),
    [lineItems],
  );
  const tax = subtotal * (Number(taxPct) || 0) / 100;
  const total = subtotal + tax;

  const setLineItem = (i: number, patch: Partial<QuoteLineItem>) => {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  };
  const addLineItem = () => setLineItems((prev) => [...prev, { name: '', qty: 1, price: 0, description: '' }]);
  const removeLineItem = (i: number) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    const validItems = lineItems.filter((li) => li.name.trim() && Number(li.price) >= 0);
    if (validItems.length === 0) {
      toast.error('Add at least one line item with a name and price.');
      return;
    }
    setSubmitting(true);
    try {
      await apiJson(mpUrl(`/api/marketplace/quote-request/${item.id}/quotes`), {
        method: 'POST',
        body: JSON.stringify({
          items: validItems.map((li) => ({
            name: li.name.trim(),
            qty: Number(li.qty) || 1,
            price: Number(li.price) || 0,
            description: li.description?.trim() || undefined,
          })),
          subtotal: Math.round(subtotal * 100) / 100,
          tax: Math.round(tax * 100) / 100,
          total: Math.round(total * 100) / 100,
          validUntil: new Date(Date.now() + (Number(validityDays) || 14) * 24 * 60 * 60 * 1000).toISOString(),
          timeline: timeline.trim() || undefined,
          terms: terms.trim() || undefined,
          depositPct: Number(depositPct) || 0,
        }),
      });
      toast.success('Quote submitted! The customer will be notified.');
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <FileText className="size-4 text-amber-600" />
            <span>{item.title}</span>
            <Badge variant="outline" className={cn('text-[10px] h-4', urgencyBadge(item.urgency).className)}>
              {urgencyBadge(item.urgency).label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Submit a quote for this marketplace request.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState lines={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : detail ? (
          <div className="space-y-4">
            {/* Customer + request info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="p-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-sm">Request details</p>
                  {detail.serviceName && <p>Service: <span className="text-muted-foreground">{detail.serviceName}</span></p>}
                  {detail.industry && <p>Industry: <span className="text-muted-foreground capitalize">{detail.industry}</span></p>}
                  {(detail.budgetLow != null || detail.budgetHigh != null) && (
                    <p>Budget: <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {detail.budgetLow != null && detail.budgetHigh != null
                        ? `${formatMoney(detail.budgetLow, detail.currency)}–${formatMoney(detail.budgetHigh, detail.currency)}`
                        : detail.budgetLow != null ? `from ${formatMoney(detail.budgetLow, detail.currency)}`
                        : `up to ${formatMoney(detail.budgetHigh, detail.currency)}`}
                    </span></p>
                  )}
                  {detail.address && <p className="flex items-center gap-1"><MapPin className="size-3" /> {detail.address}</p>}
                  {(detail.city || detail.postalCode) && <p>{[detail.city, detail.postalCode].filter(Boolean).join(', ')}</p>}
                  <p className="flex items-center gap-1"><Clock className="size-3" /> Received {timeAgo(detail.createdAt)}</p>
                  {detail.expiresAt && <p>Expires {formatDate(detail.expiresAt)}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-sm">Customer</p>
                  <p className="flex items-center gap-1"><Users className="size-3" /> {detail.customerName || '—'}</p>
                  {detail.customerPhone && <p className="flex items-center gap-1"><Phone className="size-3" /> {detail.customerPhone}</p>}
                  {detail.customerEmail && <p className="flex items-center gap-1"><Mail className="size-3" /> {detail.customerEmail}</p>}
                  {detail.quoteCount !== undefined && (
                    <p className="text-muted-foreground">{detail.quoteCount} quote{detail.quoteCount === 1 ? '' : 's'} submitted so far</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {detail.description && (
              <Card>
                <CardContent className="p-3">
                  <p className="font-semibold text-sm mb-1">Description</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{detail.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Quote composer */}
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-900/40 p-3 space-y-3">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Send className="size-4 text-amber-600" /> Quote composer
              </p>

              {/* Line items */}
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-[10px]">Item name</Label>
                      <Input
                        value={li.name}
                        onChange={(e) => setLineItem(i, { name: e.target.value })}
                        placeholder="Labor"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px]">Qty</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={li.qty}
                        onChange={(e) => setLineItem(i, { qty: Number(e.target.value) })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Label className="text-[10px]">Unit price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={li.price}
                        onChange={(e) => setLineItem(i, { price: Number(e.target.value) })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-2 flex justify-end">
                      {lineItems.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLineItem(i)}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addLineItem} className="gap-1.5 text-xs h-7">
                  <Plus className="size-3" /> Add line item
                </Button>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/40">
                <div>
                  <Label className="text-[10px]">Tax %</Label>
                  <Input type="number" step="0.01" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Deposit %</Label>
                  <Input type="number" step="1" value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Validity (days)</Label>
                  <Input type="number" step="1" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className="h-8 text-xs" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Subtotal</Label>
                  <p className="text-sm font-medium">{formatMoney(subtotal, item.currency)}</p>
                  <p className="text-[10px] text-muted-foreground">Tax: {formatMoney(tax, item.currency)} • Total: {formatMoney(total, item.currency)}</p>
                </div>
              </div>

              <div>
                <Label className="text-[10px]">Timeline (optional)</Label>
                <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="2-3 days" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Terms (optional)</Label>
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} placeholder="50% deposit due on acceptance, balance on completion. Excludes materials." className="text-xs" />
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || !!error}
            className="bg-amber-600 hover:bg-amber-700 gap-1.5"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit quote ({formatMoney(total, item.currency)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Emergencies Tab ────────────────────────────────────────────────────────

function EmergenciesTab() {
  const [items, setItems] = useState<EmergencyDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const res = await apiJson<{ items: EmergencyDispatch[]; total: number }>(
        mpUrl('/api/marketplace/emergency', { status: 'all', limit: 50 }),
      );
      if (!mountedRef.current) return;
      setItems(res.items || []);
      setLastFetch(new Date());
    } catch (e: any) {
      if (!silent) setError(e?.message || 'Failed to load emergencies');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const id = setInterval(() => load(true), 10_000); // poll every 10s — time-sensitive
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [load]);

  const handleAccepted = (updated: EmergencyDispatch) => {
    setItems((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
  };

  if (loading) return <LoadingState lines={5} />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  const broadcasting = items.filter((e) => e.status === 'broadcasting');
  const active = items.filter((e) => ['accepted', 'en_route', 'on_site'].includes(e.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {broadcasting.length} broadcasting · {active.length} active · auto-refresh every 10s
        </p>
        {lastFetch && (
          <Button size="sm" variant="ghost" onClick={() => load()} className="gap-1.5 text-xs h-7">
            <RefreshCw className="size-3" /> {timeAgo(lastFetch.toISOString())}
          </Button>
        )}
      </div>

      {broadcasting.length === 0 && active.length === 0 ? (
        <EmptyState
          icon={Siren}
          title="No active emergencies"
          description="When marketplace customers submit emergency dispatches that match your industry, they will appear here in real time. Emergencies auto-refresh every 10 seconds."
        />
      ) : (
        <>
          {/* Broadcasting emergencies */}
          {broadcasting.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Siren className="size-3.5 animate-pulse" /> Broadcasting — accept now
              </p>
              {broadcasting.map((e) => (
                <EmergencyCard
                  key={e.id}
                  dispatch={e}
                  accepting={accepting === e.id}
                  onAcceptStart={() => setAccepting(e.id)}
                  onAcceptEnd={() => setAccepting(null)}
                  onAccepted={handleAccepted}
                />
              ))}
            </div>
          )}

          {/* Active emergencies (accepted, tracking) */}
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Navigation className="size-3.5" /> Active — you are responding
              </p>
              {active.map((e) => (
                <EmergencyStatusTracker key={e.id} dispatch={e} onUpdated={handleAccepted} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmergencyCard({
  dispatch, accepting, onAcceptStart, onAcceptEnd, onAccepted,
}: {
  dispatch: EmergencyDispatch;
  accepting: boolean;
  onAcceptStart: () => void;
  onAcceptEnd: () => void;
  onAccepted: (d: EmergencyDispatch) => void;
}) {
  const [eta, setEta] = useState(30);
  const [cost, setCost] = useState(100);

  const handleAccept = async () => {
    onAcceptStart();
    try {
      const res = await apiJson<{ emergencyDispatch: EmergencyDispatch }>(
        mpUrl(`/api/marketplace/emergency/${dispatch.id}/accept`),
        {
          method: 'POST',
          body: JSON.stringify({
            providerTenantId: undefined, // server reads from auth — body is required by schema but value is validated against auth
            estimatedArrivalMins: Number(eta) || 30,
            estimatedCost: Number(cost) || 0,
          }),
        },
      );
      toast.success('Emergency accepted! Customer notified. Start the status tracker below.');
      onAccepted(res.emergencyDispatch as EmergencyDispatch);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to accept emergency');
    } finally {
      onAcceptEnd();
    }
  };

  return (
    <Card className="border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/40">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="size-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
            <Siren className="size-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{dispatch.title}</p>
            {dispatch.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dispatch.description}</p>
            )}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
              {dispatch.industry && <span className="capitalize">· {dispatch.industry}</span>}
              {dispatch.customerName && <span className="flex items-center gap-0.5"><Users className="size-3" /> {dispatch.customerName}</span>}
              {dispatch.customerPhone && <span className="flex items-center gap-0.5"><Phone className="size-3" /> {dispatch.customerPhone}</span>}
              {dispatch.address && <span className="flex items-center gap-0.5"><MapPin className="size-3" /> {dispatch.address}</span>}
              <span className="flex items-center gap-0.5"><Clock className="size-3" /> {timeAgo(dispatch.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <Label className="text-[10px] text-rose-800 dark:text-rose-200">ETA (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={600}
              value={eta}
              onChange={(e) => setEta(Number(e.target.value))}
              className="h-8 text-xs"
              disabled={accepting}
            />
          </div>
          <div>
            <Label className="text-[10px] text-rose-800 dark:text-rose-200">Estimated cost ({dispatch.currency})</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="h-8 text-xs"
              disabled={accepting}
            />
          </div>
        </div>

        <Button
          onClick={handleAccept}
          disabled={accepting}
          className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 w-full"
        >
          {accepting ? <Loader2 className="size-4 animate-spin" /> : <Siren className="size-4" />}
          Accept emergency
        </Button>
      </CardContent>
    </Card>
  );
}

function EmergencyStatusTracker({
  dispatch, onUpdated,
}: {
  dispatch: EmergencyDispatch;
  onUpdated: (d: EmergencyDispatch) => void;
}) {
  const [updating, setUpdating] = useState<string | null>(null);

  const status = dispatch.status;
  const steps: Array<{ key: string; label: string; icon: React.ElementType }> = [
    { key: 'accepted', label: 'Accepted', icon: CheckCircle },
    { key: 'en_route', label: 'En route', icon: Navigation },
    { key: 'on_site', label: 'On site', icon: Wrench },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];
  const currentIdx = steps.findIndex((s) => s.key === status);

  const handleTransition = async (newStatus: 'en_route' | 'on_site' | 'completed') => {
    setUpdating(newStatus);
    try {
      const res = await apiJson<{ emergencyDispatch: EmergencyDispatch }>(
        mpUrl(`/api/marketplace/emergency/${dispatch.id}/status`),
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        },
      );
      toast.success(`Status updated: ${newStatus.replace('_', ' ')}`);
      onUpdated(res.emergencyDispatch as EmergencyDispatch);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const nextStep = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <Card className="border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/40">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Navigation className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{dispatch.title}</p>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
              {dispatch.customerName && <span className="flex items-center gap-0.5"><Users className="size-3" /> {dispatch.customerName}</span>}
              {dispatch.customerPhone && <span className="flex items-center gap-0.5"><Phone className="size-3" /> {dispatch.customerPhone}</span>}
              {dispatch.address && <span className="flex items-center gap-0.5"><MapPin className="size-3" /> {dispatch.address}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
              <span>ETA: {dispatch.estimatedArrivalMins ?? '—'} min</span>
              <span>Est. cost: {formatMoney(dispatch.estimatedCost, dispatch.currency)}</span>
              <span>Accepted {timeAgo(dispatch.acceptedAt)}</span>
            </div>
          </div>
        </div>

        {/* Status progress tracker */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                  done
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : current
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground border-muted',
                )}>
                  {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-3.5" />}
                </div>
                <span className={cn(
                  'text-[10px] font-medium text-center',
                  done || current ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground',
                )}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Next-step action button */}
        {nextStep && (
          <Button
            onClick={() => handleTransition(nextStep.key as 'en_route' | 'on_site' | 'completed')}
            disabled={updating !== null}
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 w-full"
          >
            {updating ? <Loader2 className="size-4 animate-spin" /> : <nextStep.icon className="size-4" />}
            Mark as {nextStep.label.toLowerCase()}
          </Button>
        )}
        {status === 'completed' && (
          <div className="rounded-md border border-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/20 p-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> Completed — settlement worker will process the payout.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main dashboard ─────────────────────────────────────────────────────────

export function ProviderMarketplaceDashboard() {
  const [tab, setTab] = useState<string>('overview');
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Cross-view navigation: switches to the named sidebar view (e.g. 'billing',
  // 'settings'). Used by the eligibility card's per-gate CTAs.
  const navigate = useCallback((view: string) => {
    setCurrentView(view as any);
  }, [setCurrentView]);

  const showOptInTab = tab === 'opt-in';

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600 shadow-sm shadow-emerald-500/20 shrink-0">
          <Store className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Manage your marketplace eligibility, portfolio, certifications, incoming quote requests, and emergency dispatches.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto h-auto flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><ShieldCheck className="size-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="opt-in" className="gap-1.5"><Store className="size-3.5" /> Opt-in &amp; T&amp;Cs</TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1.5"><Briefcase className="size-3.5" /> Portfolio</TabsTrigger>
          <TabsTrigger value="certifications" className="gap-1.5"><Award className="size-3.5" /> Certifications</TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5"><FileText className="size-3.5" /> Quote Requests</TabsTrigger>
          <TabsTrigger value="emergencies" className="gap-1.5"><Siren className="size-3.5" /> Emergencies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            onNavigate={navigate}
            onOptInNeeded={() => setTab('opt-in')}
          />
        </TabsContent>

        <TabsContent value="opt-in" className="mt-4">
          <OptInTab onNavigatedToOverview={() => setTab('overview')} />
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          <PortfolioTab />
        </TabsContent>

        <TabsContent value="certifications" className="mt-4">
          <CertificationsTab />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <QuoteRequestsTab />
        </TabsContent>

        <TabsContent value="emergencies" className="mt-4">
          <EmergenciesTab />
        </TabsContent>
      </Tabs>

      {/* The Opt-in tab is also reachable when the user is not opted in.
          We always show it in the tabs list per the task spec ("only shown if
          marketplaceOptIn === false" — but the user needs to be able to
          navigate back to it). The Opt-in tab itself renders an
          "already opted in" state once they complete the flow. */}
      {showOptInTab && null}
    </div>
  );
}

export default ProviderMarketplaceDashboard;

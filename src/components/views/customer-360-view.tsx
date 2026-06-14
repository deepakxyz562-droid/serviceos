'use client';

import { useState, useMemo } from 'react';
import {
  User, Search, Phone, Mail, MapPin, MessageSquare, Calendar, DollarSign,
  Wrench, Activity, Clock, Star, Tag, Plus, Send, FileText, Zap,
  ChevronRight, X, CheckCircle2, AlertCircle,
  ArrowUpRight, Receipt, MessageCircle, FileStack,
  Bot, Sparkles, Users, StickyNote,
  TrendingUp, TrendingDown, ArrowUpDown, Upload, Image, File,
  PhoneCall, Heart, Workflow,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';
import {
  useCustomers,
  useCustomer360,
  useBookings,
} from '@/hooks/queries/use-supabase-queries';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return '';
  }
}

function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(date: Date | string): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

function isThisWeek(date: Date | string): boolean {
  const d = new Date(date);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

/** Get a tag-based left border color for customer cards */
function getTagBorderColor(tags: string[]): string {
  if (tags.includes('VIP')) return 'border-l-amber-500';
  if (tags.includes('High-Value')) return 'border-l-teal-500';
  return 'border-l-emerald-500';
}

/** Compute a health score 0-100 based on activity, spending, engagement */
function computeHealthScore(stats: { totalRevenue: number; completedJobs: number; avgRating: number; outstandingBalance: number; totalBookings: number }): number {
  let score = 0;
  // Revenue contribution (0-30)
  score += Math.min(30, (stats.totalRevenue / 5000) * 30);
  // Completed jobs contribution (0-25)
  score += Math.min(25, stats.completedJobs * 5);
  // Rating contribution (0-25)
  score += stats.avgRating > 0 ? (stats.avgRating / 5) * 25 : 0;
  // Engagement via bookings (0-20)
  score += Math.min(20, stats.totalBookings * 4);
  // Penalty for outstanding balance
  if (stats.outstandingBalance > 0) {
    score -= Math.min(15, (stats.outstandingBalance / 3000) * 15);
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Return color class based on health score */
function healthScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function healthScoreStroke(score: number): string {
  if (score >= 70) return 'stroke-emerald-500';
  if (score >= 40) return 'stroke-amber-500';
  return 'stroke-red-500';
}

// ─── Status Color Maps ──────────────────────────────────────────────────────

const jobStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  assigned: { label: 'Assigned', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
};

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted border-border', icon: FileText },
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', icon: Clock },
  paid: { label: 'Paid', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'text-red-700', bg: 'bg-red-100 border-red-200', icon: AlertCircle },
};

const bookingStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' },
  confirmed: { label: 'Confirmed', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
  no_show: { label: 'No Show', color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

const tagColors: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-700 border-amber-200',
  'Repeat Customer': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'High-Value': 'bg-teal-100 text-teal-700 border-teal-200',
  'At-Risk': 'bg-red-100 text-red-700 border-red-200',
  premium: 'bg-amber-100 text-amber-700 border-amber-200',
  repeat: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'New Lead': 'bg-sky-100 text-sky-700 border-sky-200',
  Commercial: 'bg-violet-100 text-violet-700 border-violet-200',
};

const timelineEventTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  booking: { icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  job_update: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  campaign: { icon: Send, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  note: { icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  call: { icon: Phone, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  form_submission: { icon: FileText, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  lead: { icon: ArrowUpRight, color: 'text-sky-600', bg: 'bg-sky-500/10' },
  job_created: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  job_completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  invoice_paid: { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  invoice_created: { icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  review: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  whatsapp_sent: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  lead_converted: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
};

// ─── Demo trend data for KPI cards ──────────────────────────────────────────
const kpiTrends: Record<string, { direction: 'up' | 'down'; value: string }> = {
  bookings: { direction: 'up', value: '+12%' },
  revenue: { direction: 'up', value: '+8%' },
  completed: { direction: 'up', value: '+5%' },
  rating: { direction: 'down', value: '-0.2' },
  outstanding: { direction: 'down', value: '-3%' },
};

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="bg-card border-border">
          <CardContent className="p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card (enhanced with trend + colored border) ─────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'text-emerald-400',
  borderColor = 'border-l-emerald-500',
  trendKey,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
  borderColor?: string;
  trendKey?: string;
}) {
  const trend = trendKey ? kpiTrends[trendKey] : undefined;
  return (
    <Card className={cn(
      'bg-card border-border border-l-4 transition-all duration-200 hover:shadow-md',
      borderColor
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <Icon className={cn('size-4', accent)} />
        </div>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-extrabold text-foreground">{value}</p>
          {trend && (
            <span className={cn(
              'text-[11px] font-semibold flex items-center gap-0.5 mb-0.5',
              trend.direction === 'up' ? 'text-emerald-500' : 'text-red-500'
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Health Score Gauge ──────────────────────────────────────────────────────

function HealthScoreGauge({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-16">
        <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" className="stroke-muted" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={radius} fill="none"
            className={healthScoreStroke(score)}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-sm font-extrabold', healthScoreColor(score))}>{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Heart className={cn('size-3', healthScoreColor(score))} />
        <span className="text-[10px] font-medium text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );
}

// ─── Timeline Event Group ────────────────────────────────────────────────────

function TimelineGroup({
  label,
  events,
}: {
  label: string;
  events: any[];
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</h4>
      <div className="space-y-1">
        {events.map((event, i) => {
          const config = timelineEventTypeConfig[event.eventType || event.type] ||
            timelineEventTypeConfig.message;
          const Icon = config.icon;
          return (
            <div
              key={event.id || i}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all duration-200 group"
            >
              <div className={cn('size-9 rounded-full flex items-center justify-center shrink-0', config.bg)}>
                <Icon className={cn('size-4', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.title || event.description || 'Event'}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {event.createdAt ? timeAgo(event.createdAt) : ''}
                  </span>
                </div>
                {event.description && event.title && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
                )}
                {event.actorName && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">by {event.actorName}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chat Bubble (enhanced) ──────────────────────────────────────────────────

function ChatBubble({
  message,
  isCustomer,
  showAvatar = false,
}: {
  message: any;
  isCustomer: boolean;
  showAvatar?: boolean;
}) {
  return (
    <div className={cn('flex gap-2', isCustomer ? 'justify-start' : 'justify-end')}>
      {isCustomer && showAvatar && (
        <div className="size-7 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0 mt-1">
          <User className="size-3.5 text-emerald-400" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isCustomer
            ? 'bg-muted text-foreground rounded-bl-md rounded-tl-xl'
            : 'bg-primary text-primary-foreground rounded-br-md rounded-tr-xl'
        )}
      >
        <p>{message.body || message.lastMessageBody || message.content || ''}</p>
        <p className={cn('text-[10px] mt-1', isCustomer ? 'text-muted-foreground' : 'text-primary-foreground/70')}>
          {message.createdAt ? formatDateTime(message.createdAt) : ''}
        </p>
      </div>
      {!isCustomer && showAvatar && (
        <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Bot className="size-3.5 text-primary" />
        </div>
      )}
    </div>
  );
}

// ─── Sort type ───────────────────────────────────────────────────────────────

type SortOption = 'name' | 'recent' | 'value';

// ─── Main Component ─────────────────────────────────────────────────────────

export function Customer360View() {
  const { auth } = useAppStore();
  const tenantId = auth?.tenant?.id;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Fetch customer list
  const { data: customers = [], isLoading: customersLoading } = useCustomers(tenantId);

  // Fetch 360 data for selected customer
  const { data: customer360, isLoading: customer360Loading } = useCustomer360(selectedCustomerId || '');

  // Fetch bookings for selected customer
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(selectedCustomerId || undefined);

  // Filtered + sorted customer list
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    let filtered = customers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = customers.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    // Sort
    return [...filtered].sort((a: any, b: any) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      // value: approximate by totalRevenue if available
      return ((b.totalRevenue || 0) as number) - ((a.totalRevenue || 0) as number);
    });
  }, [customers, searchQuery, sortBy]);

  // Extract data
  const customer = customer360?.customer;
  const jobs: any[] = customer360?.jobs || [];
  const invoices: any[] = customer360?.invoices || [];
  const conversations: any[] = customer360?.conversations || [];
  const timelineEvents: any[] = customer360?.timeline || [];
  const bookings: any[] = bookingsData?.bookings || (Array.isArray(bookingsData) ? bookingsData : []);

  // Computed stats
  const stats = useMemo(() => {
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const pendingInvoices = invoices.filter(
      i => i.status === 'pending' || i.status === 'overdue'
    );
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const outstandingBalance = pendingInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const avgRating =
      completedJobs.length > 0
        ? completedJobs.filter(j => j.customerRating).reduce((s, j) => s + (j.customerRating || 0), 0) /
          Math.max(completedJobs.filter(j => j.customerRating).length, 1)
        : 0;

    return {
      totalBookings: bookings.length,
      totalRevenue,
      completedJobs: completedJobs.length,
      avgRating: Math.round(avgRating * 10) / 10,
      outstandingBalance,
      totalJobs: jobs.length,
    };
  }, [jobs, invoices, bookings]);

  // Health score
  const healthScore = useMemo(() => computeHealthScore(stats), [stats]);

  // Grouped timeline
  const groupedTimeline = useMemo(() => {
    const groups: { label: string; events: any[] }[] = [];
    const today: any[] = [];
    const yesterday: any[] = [];
    const thisWeek: any[] = [];
    const earlier: any[] = [];

    timelineEvents.forEach(event => {
      if (!event.createdAt) {
        earlier.push(event);
        return;
      }
      if (isToday(event.createdAt)) today.push(event);
      else if (isYesterday(event.createdAt)) yesterday.push(event);
      else if (isThisWeek(event.createdAt)) thisWeek.push(event);
      else earlier.push(event);
    });

    if (today.length > 0) groups.push({ label: 'Today', events: today });
    if (yesterday.length > 0) groups.push({ label: 'Yesterday', events: yesterday });
    if (thisWeek.length > 0) groups.push({ label: 'This Week', events: thisWeek });
    if (earlier.length > 0) groups.push({ label: 'Earlier', events: earlier });

    return groups;
  }, [timelineEvents]);

  // Parse tags from customer data
  const customerTags = useMemo(() => {
    if (!customer) return [];
    const raw = (customer as any).tags;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : raw ? [raw] : [];
      } catch {
        return raw ? [raw] : [];
      }
    }
    return [];
  }, [customer]);

  // Parse tags for list items
  function parseTags(raw: any): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : raw ? [raw] : [];
      } catch {
        return raw ? [raw] : [];
      }
    }
    return [];
  }

  // Find last activity date from timeline
  const lastActiveTime = useMemo(() => {
    if (timelineEvents.length === 0) return '';
    const sorted = [...timelineEvents].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return sorted[0]?.createdAt ? timeAgo(sorted[0].createdAt) : '';
  }, [timelineEvents]);

  // ─── No customer selected — show list ─────────────────────────────────────
  if (!selectedCustomerId) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Hero Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600/10 via-background to-teal-600/5 px-6 pt-8 pb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center size-12 rounded-xl bg-emerald-600/15 shadow-sm">
                <Users className="size-6 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Customer 360&deg;</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Everything about a customer on a single screen</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-card border-border text-muted-foreground">
                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="px-6 pb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
            {(['name', 'recent', 'value'] as SortOption[]).map(option => (
              <Button
                key={option}
                size="sm"
                variant={sortBy === option ? 'default' : 'ghost'}
                className={cn(
                  'h-7 text-xs px-2.5 rounded-md transition-all duration-200',
                  sortBy === option
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setSortBy(option)}
              >
                {option === 'name' && 'Name'}
                {option === 'recent' && 'Recent'}
                {option === 'value' && 'Value'}
              </Button>
            ))}
          </div>
        </div>

        {/* Customer Grid */}
        <div className="flex-1 min-h-0 px-6 pb-6">
          {customersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Skeleton className="size-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              {/* Stacked icon illustration */}
              <div className="relative mb-6">
                <div className="size-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Users className="size-10 text-muted-foreground/60" />
                </div>
                <div className="absolute -bottom-1 -right-1 size-8 rounded-lg bg-muted flex items-center justify-center">
                  <Search className="size-4 text-muted-foreground/80" />
                </div>
                <div className="absolute -top-1 -left-1 size-6 rounded-md bg-muted/80 flex items-center justify-center">
                  <Plus className="size-3 text-muted-foreground/80" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">No customers found</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Customers will appear here once they are added'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCustomers.map((c: any) => {
                  const tags = parseTags((c as any).tags);
                  const borderClass = getTagBorderColor(tags);
                  const primaryTag = tags[0];
                  return (
                    <Card
                      key={c.id}
                      className={cn(
                        'bg-card border-border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-emerald-600/50 border-l-4',
                        borderClass
                      )}
                      onClick={() => setSelectedCustomerId(c.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12 border-2 border-border">
                            <AvatarFallback className="bg-emerald-600/20 text-emerald-400 font-bold">
                              {getInitials(c.name || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                            {c.email && (
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="size-2.5" />
                              Customer since {formatDate(c.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                        {primaryTag && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1.5 py-0',
                                tagColors[primaryTag] || 'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              <Tag className="size-2 mr-1" />
                              {primaryTag}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  // ─── Customer Selected — show 360 view ─────────────────────────────────────
  const c = customer;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar with back */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-accent gap-1.5 transition-all duration-200"
          onClick={() => setSelectedCustomerId(null)}
        >
          <ChevronRight className="size-4 rotate-180" />
          Back
        </Button>
        <div className="flex-1" />
        <h1 className="text-sm font-semibold text-muted-foreground">
          Customer 360&deg;
        </h1>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* ─── Left Sidebar — Profile Panel ─────────────────────────────────── */}
        <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-border shrink-0">
          <ScrollArea className="h-full max-h-[calc(100vh-8rem)]">
            {customer360Loading ? (
              <ProfileSkeleton />
            ) : c ? (
              <div className="space-y-0">
                {/* Profile Header with gradient */}
                <div className="relative bg-gradient-to-br from-emerald-600/15 via-emerald-600/5 to-transparent p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="size-16 border-2 border-emerald-600/30 shadow-md">
                      <AvatarFallback className="bg-emerald-600/20 text-emerald-400 text-xl font-bold">
                        {getInitials(c.name || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground truncate">{c.name}</h2>
                        {lastActiveTime && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-card border-border text-muted-foreground shrink-0">
                            <Clock className="size-2.5 mr-0.5" />
                            {lastActiveTime}
                          </Badge>
                        )}
                      </div>
                      {c.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                          <Mail className="size-3 shrink-0" /> {c.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Phone className="size-3 shrink-0" /> {c.phone}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {customerTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {customerTags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md',
                            tagColors[tag] || 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          <Tag className="size-2.5 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-6">
                  {/* Health Score */}
                  <div className="flex items-center justify-between">
                    <HealthScoreGauge score={healthScore} />
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">Customer Health</p>
                      <p className={cn('text-sm font-bold', healthScoreColor(healthScore))}>
                        {healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Fair' : 'Needs Attention'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-2.5">
                    {c.whatsappId && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <MessageSquare className="size-4 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground truncate">{c.whatsappId}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{c.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 text-sm">
                      <Calendar className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        Customer since{' '}
                        <span className="text-foreground font-medium">{formatDate(c.createdAt)}</span>
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Quick Actions — icon row with prominent WhatsApp */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Quick Actions
                    </p>
                    <div className="flex items-center gap-2">
                      {/* WhatsApp — prominent */}
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-2 flex-1 transition-all duration-200 shadow-sm"
                        onClick={() =>
                          toast.info('WhatsApp integration coming soon', {
                            description: c.whatsappId || c.phone,
                          })
                        }
                      >
                        <MessageSquare className="size-3.5" /> WhatsApp
                      </Button>
                      {/* Icon-only round buttons */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-9 rounded-full border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
                        onClick={() => toast.info('Calling...', { description: c.phone })}
                      >
                        <PhoneCall className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-9 rounded-full border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
                        onClick={() =>
                          toast.info('Booking creation coming soon', {
                            description: `Create booking for ${c.name}`,
                          })
                        }
                      >
                        <Calendar className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-9 rounded-full border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
                        onClick={() =>
                          toast.info('Invoice creation coming soon', {
                            description: `Create invoice for ${c.name}`,
                          })
                        }
                      >
                        <Receipt className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Mini Stats — card containers with colored top borders */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-emerald-500 shadow-sm">
                      <p className="text-lg font-extrabold text-emerald-500">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">Revenue</p>
                    </div>
                    <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-sky-500 shadow-sm">
                      <p className="text-lg font-extrabold text-foreground">{stats.totalJobs}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Total Jobs</p>
                    </div>
                    <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-amber-500 shadow-sm">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg font-extrabold text-amber-500">
                          {stats.avgRating > 0 ? stats.avgRating : '\u2014'}
                        </span>
                        {stats.avgRating > 0 && <StarRating rating={stats.avgRating} />}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium">Avg Rating</p>
                    </div>
                    <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-red-500 shadow-sm">
                      <p className="text-lg font-extrabold text-foreground">{stats.completedJobs}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
                    </div>
                  </div>

                  {/* Outstanding Balance — enhanced with pulsing dot */}
                  {stats.outstandingBalance > 0 && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex size-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
                          </span>
                          <span className="text-xs text-destructive font-semibold">Outstanding Balance</span>
                        </div>
                        <span className="text-sm font-extrabold text-destructive">
                          {formatCurrency(stats.outstandingBalance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <AlertCircle className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Could not load customer details</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ─── Main Content Area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* KPI Cards Row */}
          <div className="p-4 border-b border-border shrink-0">
            {customer360Loading ? (
              <KpiSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard
                  label="Total Bookings"
                  value={stats.totalBookings}
                  icon={Calendar}
                  accent="text-sky-400"
                  borderColor="border-l-sky-500"
                  trendKey="bookings"
                />
                <KpiCard
                  label="Total Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  icon={DollarSign}
                  accent="text-emerald-400"
                  borderColor="border-l-emerald-500"
                  trendKey="revenue"
                />
                <KpiCard
                  label="Completed Jobs"
                  value={stats.completedJobs}
                  icon={CheckCircle2}
                  accent="text-emerald-400"
                  borderColor="border-l-emerald-500"
                  trendKey="completed"
                />
                <KpiCard
                  label="Avg Rating"
                  value={stats.avgRating > 0 ? `${stats.avgRating} / 5` : '\u2014'}
                  icon={Star}
                  accent="text-amber-400"
                  borderColor="border-l-amber-500"
                  trendKey="rating"
                />
                <KpiCard
                  label="Outstanding"
                  value={formatCurrency(stats.outstandingBalance)}
                  icon={AlertCircle}
                  accent={stats.outstandingBalance > 0 ? 'text-red-400' : 'text-muted-foreground'}
                  borderColor="border-l-red-500"
                  trendKey="outstanding"
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b border-border px-4 shrink-0">
                <TabsList className="bg-transparent h-11 gap-0.5 p-0 overflow-x-auto">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <Activity className="size-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="conversations"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <MessageCircle className="size-3.5" /> Conversations
                    {conversations.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-emerald-600 text-foreground flex items-center justify-center">
                        {conversations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="bookings"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <Calendar className="size-3.5" /> Bookings
                  </TabsTrigger>
                  <TabsTrigger
                    value="jobs"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <Wrench className="size-3.5" /> Jobs
                    {jobs.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-muted text-muted-foreground flex items-center justify-center">
                        {jobs.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="invoices"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <Receipt className="size-3.5" /> Invoices
                    {invoices.length > 0 && (
                      <Badge className="size-4 rounded-full p-0 text-[9px] bg-muted text-muted-foreground flex items-center justify-center">
                        {invoices.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <FileStack className="size-3.5" /> Documents
                  </TabsTrigger>
                  <TabsTrigger
                    value="automation"
                    className="data-[state=active]:bg-accent data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground rounded-md px-3 h-9 text-xs gap-1.5 transition-all duration-200"
                  >
                    <Zap className="size-3.5" /> Automation
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0">
                {/* ─── Overview Tab ─────────────────────────────────────────── */}
                <TabsContent value="overview" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {/* Last 30 Days Summary Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
                          <p className="text-lg font-extrabold text-foreground mt-1">
                            {timelineEvents.filter(e => {
                              if (!e.createdAt) return false;
                              const diff = Date.now() - new Date(e.createdAt).getTime();
                              return diff < 30 * 24 * 60 * 60 * 1000;
                            }).length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Events</p>
                        </div>
                        <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
                          <p className="text-lg font-extrabold text-foreground mt-1">
                            {jobs.filter(j => {
                              if (!j.createdAt) return false;
                              const diff = Date.now() - new Date(j.createdAt).getTime();
                              return diff < 30 * 24 * 60 * 60 * 1000;
                            }).length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">New Jobs</p>
                        </div>
                        <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
                          <p className="text-lg font-extrabold text-emerald-500 mt-1">
                            {formatCurrency(invoices.filter(i => {
                              if (!i.paidAt) return false;
                              const diff = Date.now() - new Date(i.paidAt).getTime();
                              return diff < 30 * 24 * 60 * 60 * 1000 && i.status === 'paid';
                            }).reduce((s, i) => s + (i.total || 0), 0))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Revenue</p>
                        </div>
                        <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Last 30 Days</p>
                          <p className="text-lg font-extrabold text-foreground mt-1">
                            {conversations.filter(c => {
                              if (!c.lastMessageAt) return false;
                              const diff = Date.now() - new Date(c.lastMessageAt).getTime();
                              return diff < 30 * 24 * 60 * 60 * 1000;
                            }).length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Conversations</p>
                        </div>
                      </div>

                      {/* Timeline */}
                      {customer360Loading ? (
                        <TimelineSkeleton />
                      ) : groupedTimeline.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Clock className="size-10 text-muted-foreground mb-3" />
                          <h3 className="text-base font-semibold text-foreground">
                            No activity yet
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Activity timeline will populate as the customer interacts
                          </p>
                        </div>
                      ) : (
                        groupedTimeline.map(group => (
                          <TimelineGroup
                            key={group.label}
                            label={group.label}
                            events={group.events}
                          />
                        ))
                      )}

                      {/* Recent Jobs Quick View */}
                      {jobs.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Recent Jobs
                          </h4>
                          <div className="space-y-2">
                            {jobs.slice(0, 3).map(job => {
                              const statusCfg = jobStatusConfig[job.status] || jobStatusConfig.pending;
                              return (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                      <Wrench className="size-3.5 text-amber-500" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {job.title || job.service || 'Service'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {job.assigneeName || 'Unassigned'} &middot;{' '}
                                        {formatDate(job.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] shrink-0 rounded-md',
                                      statusCfg.bg,
                                      statusCfg.color
                                    )}
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Conversations Tab ────────────────────────────────────── */}
                <TabsContent value="conversations" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {customer360Loading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <Skeleton className="size-8 rounded-full" />
                              <Skeleton className="h-12 w-64 rounded-xl" />
                            </div>
                          ))}
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <MessageCircle className="size-10 text-muted-foreground mb-3" />
                          <h3 className="text-base font-semibold text-foreground">
                            No conversations
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Conversations from WhatsApp, SMS, and Email will appear here
                          </p>
                        </div>
                      ) : (
                        conversations.map((conv: any) => (
                          <Card
                            key={conv.id}
                            className="bg-card border-border rounded-xl overflow-hidden"
                          >
                            {/* Conversation header */}
                            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border bg-muted/30">
                              <div className="flex items-center gap-2">
                                <div className="size-7 rounded-full bg-emerald-600/20 flex items-center justify-center">
                                  <User className="size-3.5 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {conv.customerName || conv.customerPhone || 'Conversation'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] rounded-md',
                                    conv.channel === 'whatsapp'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-700'
                                      : 'bg-muted text-muted-foreground border-border'
                                  )}
                                >
                                  {conv.channel || 'chat'}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] rounded-md',
                                    conv.status === 'active'
                                      ? 'bg-sky-500/10 text-sky-400 border-sky-800'
                                      : 'bg-muted text-muted-foreground border-border'
                                  )}
                                >
                                  {conv.status}
                                </Badge>
                              </div>
                            </div>
                            {/* Chat area */}
                            <CardContent className="p-4 space-y-2.5 bg-background">
                              {conv.lastMessageBody && (
                                <ChatBubble
                                  message={conv}
                                  isCustomer={conv.lastDirection !== 'outbound'}
                                  showAvatar
                                />
                              )}
                              {conv.messagesJson && (() => {
                                try {
                                  const msgs = JSON.parse(conv.messagesJson);
                                  if (Array.isArray(msgs) && msgs.length > 0) {
                                    return msgs.slice(-5).map((msg: any, idx: number) => (
                                      <ChatBubble
                                        key={idx}
                                        message={msg}
                                        isCustomer={msg.senderType === 'customer'}
                                        showAvatar
                                      />
                                    ));
                                  }
                                } catch { /* ignore parse errors */ }
                                return null;
                              })()}
                              <p className="text-[10px] text-muted-foreground text-right pt-1">
                                {conv.lastMessageAt
                                  ? formatDateTime(conv.lastMessageAt)
                                  : ''}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Bookings Tab ─────────────────────────────────────────── */}
                <TabsContent value="bookings" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {bookingsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                          ))}
                        </div>
                      ) : bookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Calendar className="size-10 text-muted-foreground mb-3" />
                          <h3 className="text-base font-semibold text-foreground">
                            No bookings
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Bookings for this customer will appear here
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Upcoming — grouped by date */}
                          {bookings.filter(
                            (b: any) =>
                              b.status === 'confirmed' || b.status === 'pending'
                          ).length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="size-3.5" /> Upcoming
                              </h4>
                              {(() => {
                                const upcoming = bookings.filter(
                                  (b: any) => b.status === 'confirmed' || b.status === 'pending'
                                );
                                // Group by date
                                const dateGroups: Record<string, any[]> = {};
                                upcoming.forEach((b: any) => {
                                  const dateKey = b.scheduledAt
                                    ? new Date(b.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                    : 'No date set';
                                  if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
                                  dateGroups[dateKey].push(b);
                                });
                                return Object.entries(dateGroups).map(([dateLabel, dateBookings]) => (
                                  <div key={dateLabel} className="space-y-2">
                                    <div className="flex items-center gap-2 pl-1">
                                      <div className="size-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-xs font-semibold text-foreground">{dateLabel}</span>
                                    </div>
                                    {dateBookings.map((booking: any) => {
                                      const statusCfg =
                                        bookingStatusConfig[booking.status] ||
                                        bookingStatusConfig.pending;
                                      return (
                                        <div
                                          key={booking.id}
                                          className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200 ml-3"
                                        >
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                              {booking.title || 'Booking'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {booking.scheduledAt
                                                ? formatDateTime(booking.scheduledAt)
                                                : 'No time set'}
                                              {booking.employee?.name &&
                                                ` \u00B7 ${booking.employee.name}`}
                                            </p>
                                          </div>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              'text-[10px] shrink-0 rounded-md',
                                              statusCfg.bg,
                                              statusCfg.color
                                            )}
                                          >
                                            {statusCfg.label}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ));
                              })()}
                            </div>
                          )}

                          {/* Completed */}
                          {bookings.filter((b: any) => b.status === 'completed').length >
                            0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="size-3.5" /> Completed
                              </h4>
                              {bookings
                                .filter((b: any) => b.status === 'completed')
                                .map((booking: any) => (
                                  <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {booking.title || 'Booking'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {booking.scheduledAt
                                          ? formatDate(booking.scheduledAt)
                                          : ''}
                                      </p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 rounded-md bg-emerald-500/10 text-emerald-400 border-emerald-700"
                                    >
                                      Completed
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Cancelled */}
                          {bookings.filter((b: any) => b.status === 'cancelled').length >
                            0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <X className="size-3.5" /> Cancelled
                              </h4>
                              {bookings
                                .filter((b: any) => b.status === 'cancelled')
                                .map((booking: any) => (
                                  <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-3 bg-card rounded-xl border border-border opacity-60 transition-all duration-200"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-muted-foreground line-through truncate">
                                        {booking.title || 'Booking'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {booking.scheduledAt
                                          ? formatDate(booking.scheduledAt)
                                          : ''}
                                      </p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 rounded-md bg-red-500/10 text-red-400 border-red-700"
                                    >
                                      Cancelled
                                    </Badge>
                                  </div>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Jobs Tab ─────────────────────────────────────────────── */}
                <TabsContent value="jobs" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-4">
                      {customer360Loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))
                      ) : jobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Wrench className="size-10 text-muted-foreground mb-3" />
                          <h3 className="text-base font-semibold text-foreground">
                            No jobs yet
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Jobs assigned to this customer will appear here
                          </p>
                        </div>
                      ) : (
                        jobs.map(job => {
                          const statusCfg =
                            jobStatusConfig[job.status] || jobStatusConfig.pending;
                          // Compute a fake progress for in_progress jobs
                          const progressPct = job.status === 'completed' ? 100
                            : job.status === 'in_progress' ? (job.progress ?? 55)
                            : job.status === 'cancelled' ? 0
                            : 0;
                          return (
                            <div
                              key={job.id}
                              className="p-4 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={cn(
                                      'size-10 rounded-full flex items-center justify-center shrink-0',
                                      job.status === 'completed'
                                        ? 'bg-emerald-500/10'
                                        : job.status === 'in_progress'
                                          ? 'bg-amber-500/10'
                                          : job.status === 'cancelled'
                                            ? 'bg-red-500/10'
                                            : 'bg-muted/50'
                                    )}
                                  >
                                    <Wrench
                                      className={cn(
                                        'size-4',
                                        job.status === 'completed'
                                          ? 'text-emerald-500'
                                          : job.status === 'in_progress'
                                            ? 'text-amber-500'
                                            : job.status === 'cancelled'
                                              ? 'text-red-500'
                                              : 'text-muted-foreground'
                                      )}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {job.title || job.service || 'Service'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {job.assigneeName || 'Unassigned'} &middot;{' '}
                                      {formatDate(job.createdAt)}
                                    </p>
                                    {job.address && (
                                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                        <MapPin className="size-2.5" /> {job.address}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {job.scheduledAt && (
                                    <span className="text-[11px] text-muted-foreground hidden sm:block">
                                      {formatDate(job.scheduledAt)}
                                    </span>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] rounded-md',
                                      statusCfg.bg,
                                      statusCfg.color
                                    )}
                                  >
                                    {statusCfg.label}
                                  </Badge>
                                </div>
                              </div>
                              {/* Mini progress bar for in-progress jobs */}
                              {job.status === 'in_progress' && (
                                <div className="mt-3 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">Progress</span>
                                    <span className="text-[10px] font-semibold text-amber-500">{progressPct}%</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Invoices Tab ─────────────────────────────────────────── */}
                <TabsContent value="invoices" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {customer360Loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))
                      ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Receipt className="size-10 text-muted-foreground mb-3" />
                          <h3 className="text-base font-semibold text-foreground">
                            No invoices
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Invoices for this customer will appear here
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Paid */}
                          {invoices.filter((i: any) => i.status === 'paid').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="size-3.5 text-emerald-500" /> Paid
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'paid')
                                .map((inv: any) => {
                                  const cfg = invoiceStatusConfig.paid;
                                  const StatusIcon = cfg.icon;
                                  return (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                          <StatusIcon className="size-3.5 text-emerald-500" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-foreground">
                                            {inv.number || inv.invoiceNumber || 'Invoice'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDate(inv.createdAt)}
                                            {inv.paidAt ? ` \u00B7 Paid ${formatDate(inv.paidAt)}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-bold text-emerald-400">
                                          {formatCurrency(inv.total)}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] rounded-md bg-emerald-500/10 text-emerald-400 border-emerald-700"
                                        >
                                          Paid
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* Pending */}
                          {invoices.filter((i: any) => i.status === 'pending').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="size-3.5 text-amber-500" /> Pending
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'pending')
                                .map((inv: any) => {
                                  const cfg = invoiceStatusConfig.pending;
                                  const StatusIcon = cfg.icon;
                                  return (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between p-3 bg-card rounded-xl border border-amber-700/30 hover:shadow-sm transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                          <StatusIcon className="size-3.5 text-amber-500" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-foreground">
                                            {inv.number || inv.invoiceNumber || 'Invoice'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDate(inv.createdAt)}
                                            {inv.dueDate ? ` \u00B7 Due ${formatDate(inv.dueDate)}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-bold text-amber-400">
                                          {formatCurrency(inv.total)}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] rounded-md bg-amber-500/10 text-amber-400 border-amber-700"
                                        >
                                          Pending
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* Overdue */}
                          {invoices.filter((i: any) => i.status === 'overdue').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="size-3.5 text-red-500" /> Overdue
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'overdue')
                                .map((inv: any) => {
                                  const cfg = invoiceStatusConfig.overdue;
                                  const StatusIcon = cfg.icon;
                                  return (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between p-3 bg-destructive/10 rounded-xl border border-destructive/30 hover:shadow-sm transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                          <StatusIcon className="size-3.5 text-red-500" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-foreground">
                                            {inv.number || inv.invoiceNumber || 'Invoice'}
                                          </p>
                                          <p className="text-xs text-red-400">
                                            Due {inv.dueDate ? formatDate(inv.dueDate) : 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-bold text-red-400">
                                          {formatCurrency(inv.total)}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] rounded-md bg-red-500/10 text-red-400 border-red-700"
                                        >
                                          Overdue
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* Draft */}
                          {invoices.filter((i: any) => i.status === 'draft').length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <FileText className="size-3.5 text-muted-foreground" /> Draft
                              </h4>
                              {invoices
                                .filter((i: any) => i.status === 'draft')
                                .map((inv: any) => {
                                  const cfg = invoiceStatusConfig.draft;
                                  const StatusIcon = cfg.icon;
                                  return (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between p-3 bg-card rounded-xl border border-border opacity-70 transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                          <StatusIcon className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-muted-foreground">
                                            {inv.number || inv.invoiceNumber || 'Invoice'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDate(inv.createdAt)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-bold text-muted-foreground">
                                          {formatCurrency(inv.total)}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] rounded-md bg-muted text-muted-foreground border-border"
                                        >
                                          Draft
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Documents Tab ────────────────────────────────────────── */}
                <TabsContent value="documents" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {/* Upload button area */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">Documents</h3>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-1.5 transition-all duration-200"
                          onClick={() => toast.info('Document upload coming soon')}
                        >
                          <Upload className="size-3.5" /> Upload
                        </Button>
                      </div>

                      {/* File type categories placeholder */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-card rounded-xl border border-border p-4 text-center hover:shadow-sm transition-all duration-200 cursor-pointer group">
                          <div className="size-12 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                            <FileText className="size-6 text-sky-500" />
                          </div>
                          <p className="text-xs font-medium text-foreground">Contracts</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">PDF, DOC</p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 text-center hover:shadow-sm transition-all duration-200 cursor-pointer group">
                          <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                            <Receipt className="size-6 text-emerald-500" />
                          </div>
                          <p className="text-xs font-medium text-foreground">Invoices</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">PDF</p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 text-center hover:shadow-sm transition-all duration-200 cursor-pointer group">
                          <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200">
                            <Image className="size-6 text-amber-500" />
                          </div>
                          <p className="text-xs font-medium text-foreground">Photos</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG</p>
                        </div>
                      </div>

                      {/* Empty state with illustration */}
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="relative mb-4">
                          <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <FileStack className="size-8 text-muted-foreground/60" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 size-7 rounded-lg bg-muted flex items-center justify-center">
                            <Upload className="size-3.5 text-muted-foreground/80" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Upload and manage documents for this customer. Contracts, proposals, and other files will appear here.
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ─── Automation Tab ───────────────────────────────────────── */}
                <TabsContent value="automation" className="h-full m-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-16rem)]">
                    <div className="p-5 space-y-6">
                      {/* Visual Flow Diagram Placeholder */}
                      <Card className="bg-card border-border rounded-xl overflow-hidden">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-foreground flex items-center gap-2">
                            <Workflow className="size-4 text-emerald-500" />
                            Automation Flow
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center gap-3 py-6 overflow-x-auto">
                            {/* Visual flow nodes */}
                            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                              <div className="size-12 rounded-xl bg-sky-500/10 border-2 border-sky-500/30 flex items-center justify-center">
                                <MessageSquare className="size-5 text-sky-500" />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground text-center">Trigger</span>
                              <span className="text-[9px] text-muted-foreground">New Message</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <ChevronRight className="size-5" />
                            </div>
                            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                              <div className="size-12 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                                <Bot className="size-5 text-amber-500" />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground text-center">Process</span>
                              <span className="text-[9px] text-muted-foreground">Classify</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <ChevronRight className="size-5" />
                            </div>
                            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                              <div className="size-12 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                                <Send className="size-5 text-emerald-500" />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground text-center">Action</span>
                              <span className="text-[9px] text-muted-foreground">Auto-Reply</span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <ChevronRight className="size-5" />
                            </div>
                            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                              <div className="size-12 rounded-xl bg-violet-500/10 border-2 border-violet-500/30 flex items-center justify-center">
                                <Zap className="size-5 text-violet-500" />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground text-center">Result</span>
                              <span className="text-[9px] text-muted-foreground">Notify Team</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Automation Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-card border-border rounded-xl hover:shadow-sm transition-all duration-200">
                          <CardContent className="p-3 text-center">
                            <Bot className="size-5 text-emerald-400 mx-auto mb-1" />
                            <p className="text-lg font-extrabold text-foreground">
                              {timelineEvents.filter(
                                (e: any) =>
                                  e.actorType === 'system' || e.actorType === 'bot'
                              ).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">Triggers Fired</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-card border-border rounded-xl hover:shadow-sm transition-all duration-200">
                          <CardContent className="p-3 text-center">
                            <Send className="size-5 text-sky-400 mx-auto mb-1" />
                            <p className="text-lg font-extrabold text-foreground">
                              {timelineEvents.filter(
                                (e: any) =>
                                  e.eventType === 'message' ||
                                  e.eventType === 'whatsapp_sent'
                              ).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">Messages Sent</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-card border-border rounded-xl hover:shadow-sm transition-all duration-200">
                          <CardContent className="p-3 text-center">
                            <Zap className="size-5 text-amber-400 mx-auto mb-1" />
                            <p className="text-lg font-extrabold text-foreground">
                              {timelineEvents.filter((e: any) =>
                                e.eventType?.includes('lead') ||
                                e.eventType?.includes('booking') ||
                                e.eventType?.includes('invoice')
                              ).length}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">Workflows Run</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Automation History */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Workflow History
                        </h4>
                        {timelineEvents
                          .filter(
                            (e: any) =>
                              e.actorType === 'system' ||
                              e.actorType === 'bot' ||
                              e.eventType === 'whatsapp_sent' ||
                              e.eventType === 'campaign' ||
                              e.eventType === 'lead_converted'
                          )
                          .length === 0 ? (
                          <div className="text-center py-8">
                            <Zap className="size-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No automation events yet
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Automated workflows will be recorded here
                            </p>
                          </div>
                        ) : (
                          timelineEvents
                            .filter(
                              (e: any) =>
                                e.actorType === 'system' ||
                                e.actorType === 'bot' ||
                                e.eventType === 'whatsapp_sent' ||
                                e.eventType === 'campaign' ||
                                e.eventType === 'lead_converted'
                            )
                            .map((event: any, i: number) => {
                              const config =
                                timelineEventTypeConfig[event.eventType] ||
                                timelineEventTypeConfig.message;
                              const Icon = config.icon;
                              return (
                                <div
                                  key={event.id || i}
                                  className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200"
                                >
                                  <div
                                    className={cn(
                                      'size-8 rounded-full flex items-center justify-center shrink-0',
                                      config.bg
                                    )}
                                  >
                                    <Icon className={cn('size-3.5', config.color)} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                      {event.title}
                                    </p>
                                    {event.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {event.description}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {event.createdAt ? formatDateTime(event.createdAt) : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

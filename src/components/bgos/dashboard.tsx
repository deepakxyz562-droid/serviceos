'use client';

import React, { useState, useMemo } from 'react';
import {
  Send,
  Calendar,
  Phone,
  MessageSquare,
  Star,
  Users,
  Search,
  FileInput,
  Sparkles,
  Check,
  Clock,
  ChevronDown,
  ArrowRight,
  Bot,
  BookOpen,
  Settings,
  Target,
  FileText,
  Radio,
  Flame,
  Globe,
  MoreVertical,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mini Bar Visualizer component for KPI cards
function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-7">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-t transition-all duration-300"
          style={{
            height: `${Math.max(18, (v / max) * 100)}%`,
            backgroundColor: color,
            opacity: 0.35 + (i / values.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

// ── P4: honest KPI trend helpers ────────────────────────────────────────────
// Every growth rate and sparkline on this dashboard is computed from real
// timestamped rows the component already fetched. When the fetched data
// cannot support a delta (e.g. no timestamps, or no comparable prior
// period), the KPI renders a neutral subtitle with NO trend chip — never a
// made-up percentage — and the sparkline is omitted entirely.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Real period-over-period % delta from timestamps (current window vs the
 * preceding window). Returns null when there is no prior-period sample to
 * compare against — callers must render a neutral subtitle in that case.
 */
function computePeriodDelta(dates: Date[], windowDays = 30): number | null {
  const now = Date.now();
  const current = dates.filter((t) => now - t.getTime() <= windowDays * DAY_MS).length;
  const prior = dates.filter((t) => {
    const ago = now - t.getTime();
    return ago > windowDays * DAY_MS && ago <= 2 * windowDays * DAY_MS;
  }).length;
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

/**
 * Real per-day buckets for the last `buckets` days (index `buckets-1` =
 * today). Built from fetched row timestamps only.
 */
function computeDailyBuckets(dates: Date[], buckets = 8): number[] {
  const now = Date.now();
  const out: number[] = new Array(buckets).fill(0);
  dates.forEach((t) => {
    const daysAgo = Math.floor((now - t.getTime()) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < buckets) {
      out[buckets - 1 - daysAgo] += 1;
    }
  });
  return out;
}

/** Extract valid dates from fetched rows using one or more candidate keys. */
function extractDates(rows: any[], keys: string[]): Date[] {
  const out: Date[] = [];
  (rows || []).forEach((row) => {
    if (!row) return;
    for (const key of keys) {
      if (row[key]) {
        const d = new Date(row[key]);
        if (!isNaN(d.getTime())) {
          out.push(d);
          return;
        }
      }
    }
  });
  return out;
}

/**
 * Trend chip for a KPI card. Real delta → coloured ±N% with a matching
 * trend icon + "vs last 30 days" caption. No real delta → neutral caption
 * only (no icon, no percentage).
 */
function KpiTrend({ delta, fallbackLabel }: { delta: number | null; fallbackLabel: string }) {
  if (delta === null || !Number.isFinite(delta)) {
    return <span className="text-[9px] text-slate-400">{fallbackLabel}</span>;
  }
  const up = delta >= 0;
  return (
    <>
      <span
        className={`text-[11px] font-bold flex items-center gap-0.5 ${
          up ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        {up ? `+${delta}%` : `${delta}%`}
      </span>
      <span className="text-[9px] text-slate-400">vs last 30 days</span>
    </>
  );
}

export interface DashboardTask {
  id: string;
  title: string;
  subtitle: string;
  due: string;
  isUrgent: boolean;
  completed: boolean;
}

export interface DashboardActivity {
  id: string;
  type: 'leads' | 'appointments' | 'calls' | 'messages' | 'forms';
  title: string;
  subtitle: string;
  time: string;
  badge: string;
  badgeColor: string;
  icon: any;
  iconColor: string;
}

export const INITIAL_TASKS: DashboardTask[] = [
  {
    id: 'task_1',
    title: 'Call back Priya Singh',
    subtitle: 'Discuss deep cleaning quote',
    due: 'Today, 11:00 AM',
    isUrgent: true,
    completed: false,
  },
  {
    id: 'task_2',
    title: 'Follow up with Rahul Kumar',
    subtitle: 'Send service details',
    due: 'Today, 2:00 PM',
    isUrgent: true,
    completed: false,
  },
  {
    id: 'task_3',
    title: 'Send proposal to Sneha Patel',
    subtitle: 'Office cleaning',
    due: 'Tomorrow',
    isUrgent: false,
    completed: false,
  },
  {
    id: 'task_4',
    title: 'Review Google reviews',
    subtitle: '3 new reviews to respond',
    due: 'Tomorrow',
    isUrgent: false,
    completed: false,
  },
  {
    id: 'task_5',
    title: 'Check campaign performance',
    subtitle: 'Diwali Offer',
    due: 'Tomorrow',
    isUrgent: false,
    completed: false,
  },
];

export const INITIAL_ACTIVITIES: DashboardActivity[] = [
  {
    id: 'act_1',
    type: 'leads',
    title: 'New lead from Website',
    subtitle: 'Anita Desai',
    time: '2 min ago',
    badge: 'Lead',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    icon: Target,
    iconColor: 'bg-teal-50 text-teal-600 dark:bg-teal-950/80',
  },
  {
    id: 'act_2',
    type: 'appointments',
    title: 'Appointment booked',
    subtitle: 'Rahul Kumar',
    time: '12 min ago',
    badge: 'Booking',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    icon: Calendar,
    iconColor: 'bg-blue-100 text-blue-600 dark:bg-blue-950/80',
  },
  {
    id: 'act_3',
    type: 'calls',
    title: 'New call received',
    subtitle: '+1 520 555 0187',
    time: '18 min ago',
    badge: 'Call',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    icon: Phone,
    iconColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80',
  },
  {
    id: 'act_4',
    type: 'forms',
    title: 'New form submission',
    subtitle: 'Service Request Form',
    time: '25 min ago',
    badge: 'Form',
    badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
    icon: FileText,
    iconColor: 'bg-teal-50 text-teal-600 dark:bg-teal-950/80',
  },
  {
    id: 'act_5',
    type: 'messages',
    title: 'Google review received',
    subtitle: '"Great service and very professional!"',
    time: '1 hour ago',
    badge: 'Review',
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    icon: Star,
    iconColor: 'bg-amber-100 text-amber-600 dark:bg-amber-950/80',
  },
];

export interface BgosDashboardProps {
  initialTasks?: DashboardTask[];
  initialActivities?: DashboardActivity[];
  isDemo?: boolean;
}

export function BgosDashboard({ initialTasks, initialActivities, isDemo: isDemoProp }: BgosDashboardProps = {}) {
  const { setCurrentView, auth } = useAppStore();
  const isDemo = Boolean(isDemoProp || (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo') === 'true' || window.location.search.includes('isDemo=true'))));

  // Dynamic user name and business identity
  const firstName = useMemo(() => {
    const raw = auth?.user?.name || auth?.user?.firstName || 'Business Owner';
    return raw.trim().split(' ')[0] || 'Partner';
  }, [auth?.user?.name, auth?.user?.firstName]);

  const businessName = useMemo(() => {
    return auth?.tenant?.name || auth?.workspace?.name || 'Service Enterprise';
  }, [auth?.tenant?.name, auth?.workspace?.name]);

  const businessLocation = useMemo(() => {
    return (auth?.tenant as any)?.address || (auth?.tenant as any)?.city || 'Headquarters';
  }, [auth?.tenant]);

  const businessInitials = useMemo(() => {
    return businessName
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SE';
  }, [businessName]);

  // ── P4: KPI state — every delta/sparkline is computed from real fetched
  // rows. null = "no real series yet" → render neutral, never fake data.
  const [leadCount, setLeadCount] = useState<number>(0);
  const [leadGrowthRate, setLeadGrowthRate] = useState<number | null>(null);
  const [leadSparkline, setLeadSparkline] = useState<number[] | null>(isDemo ? [3, 5, 4, 7, 6, 8, 9, 12] : null);
  const [appointmentCount, setAppointmentCount] = useState<number>(0);
  const [appointmentGrowthRate, setAppointmentGrowthRate] = useState<number | null>(null);
  const [appointmentSparkline, setAppointmentSparkline] = useState<number[] | null>(null);
  const [callCount, setCallCount] = useState<number>(0);
  const [callGrowthRate, setCallGrowthRate] = useState<number | null>(null);
  const [callSparkline, setCallSparkline] = useState<number[] | null>(null);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [messageGrowthRate, setMessageGrowthRate] = useState<number | null>(null);
  const [messageSparkline, setMessageSparkline] = useState<number[] | null>(null);
  const [reviewStats, setReviewStats] = useState<{ rating: string; count: number }>({
    rating: '0.0',
    count: 0,
  });
const DEMO_SOURCE_BREAKDOWN = [
  { name: 'Website', pct: '38%', color: 'bg-teal-500', stroke: '#14B8A6', count: 38 },
  { name: 'Google Business', pct: '28%', color: 'bg-blue-500', stroke: '#3B82F6', count: 28 },
  { name: 'Social Media', pct: '18%', color: 'bg-purple-500', stroke: '#A855F7', count: 18 },
  { name: 'Referral', pct: '16%', color: 'bg-amber-500', stroke: '#F59E0B', count: 16 },
];

  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [sourceBreakdown, setSourceBreakdown] = useState<Array<{ name: string; pct: string; color: string; stroke: string; count: number }>>(
    isDemo ? DEMO_SOURCE_BREAKDOWN : []
  );

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/leads?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const total = data.pagination?.total ?? (Array.isArray(data.leads) ? data.leads.length : 0);
        setLeadCount(total);

        if (Array.isArray(data.leads)) {
          // P4: real period-over-period growth + last-8-days sparkline from
          // the fetched leads' createdAt timestamps (no fabricated numbers).
          const datedLeads = extractDates(data.leads, ['createdAt']);
          if (datedLeads.length > 0) {
            setLeadGrowthRate(computePeriodDelta(datedLeads));
            setLeadSparkline(computeDailyBuckets(datedLeads));
          } else {
            setLeadGrowthRate(null);
            setLeadSparkline(null);
          }
        }

        if (Array.isArray(data.leads) && data.leads.length > 0) {
          const counts: Record<string, number> = {};
          data.leads.forEach((l: any) => {
            const src = l.source ? String(l.source).replace(/_/g, ' ') : 'Website';
            const cap = src.charAt(0).toUpperCase() + src.slice(1);
            counts[cap] = (counts[cap] || 0) + 1;
          });
          const palette = [
            { color: 'bg-chart-3', stroke: 'var(--chart-3)' },
            { color: 'bg-chart-1', stroke: 'var(--chart-1)' },
            { color: 'bg-[#F97316]', stroke: '#F97316' },
            { color: 'bg-[#10B981]', stroke: '#10B981' },
            { color: 'bg-[#EC4899]', stroke: '#EC4899' },
            { color: 'bg-[#64748B]', stroke: '#64748B' },
          ];
          const breakdown = Object.entries(counts).map(([name, count], idx) => ({
            name,
            count,
            pct: `${Math.round((count / data.leads.length) * 100)}%`,
            color: palette[idx % palette.length].color,
            stroke: palette[idx % palette.length].stroke,
          }));
          setSourceBreakdown(breakdown);

          if (!initialActivities) {
            const liveActivities: DashboardActivity[] = data.leads.slice(0, 5).map((l: any, idx: number) => ({
              id: `act_lead_${l.id || idx}`,
              type: 'leads',
              title: `New lead from ${l.source ? String(l.source).replace(/_/g, ' ') : 'Website'}`,
              subtitle: l.name || l.email || l.phone || 'Anonymous Prospect',
              time: l.createdAt ? new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              badge: 'Lead',
              badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
              icon: Target,
              iconColor: 'bg-teal-50 text-teal-600 dark:bg-teal-950/80',
            }));
            setActivities(liveActivities);
          }

          if (!initialTasks) {
            const liveTasks: DashboardTask[] = data.leads.slice(0, 4).map((l: any, idx: number) => ({
              id: `task_lead_${l.id || idx}`,
              title: `Follow up with ${l.name || 'new lead'}`,
              subtitle: l.requirements || l.service || `Inquiry via ${l.source || 'Website'}`,
              due: idx === 0 ? 'Today, urgent' : 'Today',
              isUrgent: idx === 0,
              completed: false,
            }));
            setTasks(liveTasks);
          }
        }
      })
      .catch(() => {});

    fetch('/api/bookings?limit=50&sortBy=createdAt&sortOrder=desc')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const total = data.pagination?.total ?? (Array.isArray(data.bookings) ? data.bookings.length : 0);
        setAppointmentCount(total);
        if (Array.isArray(data.bookings)) {
          // P4: fetch ordered by createdAt desc so the growth delta and daily
          // buckets reflect the most RECENT booking activity. The Upcoming
          // panel filters future-scheduled rows client-side (see `upcoming`).
          setUpcomingAppointments(data.bookings);
          const datedBookings = extractDates(data.bookings, ['createdAt', 'scheduledAt']);
          if (datedBookings.length > 0) {
            setAppointmentGrowthRate(computePeriodDelta(datedBookings));
            setAppointmentSparkline(computeDailyBuckets(datedBookings));
          }
        }
      })
      .catch(() => {});

    fetch('/api/reviews?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const total = data.pagination?.total ?? (Array.isArray(data.reviews) ? data.reviews.length : 0);
        if (total === 0) {
          setReviewStats({ rating: '0.0', count: 0 });
        } else if (data.reviews?.length) {
          const avg =
            data.reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) /
            data.reviews.length;
          setReviewStats({ rating: avg.toFixed(1), count: total });
        }
      })
      .catch(() => {});

    fetch('/api/vapi/calls?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const calls = Array.isArray(data.calls) ? data.calls : [];
        const count = calls.length > 0 ? calls.length : (data.stats?.todayCount ?? data.stats?.total ?? 0);
        setCallCount(count);
        // P4: real delta + last-8-days sparkline from call timestamps.
        const datedCalls = extractDates(calls, ['createdAt']);
        if (datedCalls.length > 0) {
          setCallGrowthRate(computePeriodDelta(datedCalls));
          setCallSparkline(computeDailyBuckets(datedCalls));
        }
      })
      .catch(() => {});

    fetch('/api/omnichannel/conversations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        if (Array.isArray(data)) {
          setMessageCount(data.length);
          // P4: real delta + last-8-days sparkline from conversation activity
          // timestamps (lastMessageTime, falling back to createdAt).
          const datedConversations = extractDates(data, ['lastMessageTime', 'createdAt']);
          if (datedConversations.length > 0) {
            setMessageGrowthRate(computePeriodDelta(datedConversations));
            setMessageSparkline(computeDailyBuckets(datedConversations));
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // ── P4: Business Growth panel — drawn from the REAL last-8-days lead and
  // booking buckets already computed for the KPI cards. No fake revenue line:
  // there is no real revenue series in this component, so none is drawn.
  const growthChart = useMemo(() => {
    const hasLeads = Array.isArray(leadSparkline);
    const hasAppts = Array.isArray(appointmentSparkline);
    if (!hasLeads && !hasAppts) return null;
    const n = 8;
    const leads = leadSparkline ?? new Array(n).fill(0);
    const appts = appointmentSparkline ?? new Array(n).fill(0);
    const rawMax = Math.max(1, ...leads, ...appts);
    // Nice round axis max so the y labels stay honest and readable.
    const step = rawMax <= 5 ? 1 : rawMax <= 10 ? 2 : rawMax <= 25 ? 5 : Math.ceil(rawMax / 5 / 5) * 5;
    const axisMax = Math.ceil(rawMax / step) * step;
    const x0 = 40;
    const x1 = 490;
    const yBase = 165;
    const h = 135;
    const pts = (vals: number[]) =>
      vals.map((v, i) => ({
        x: x0 + ((x1 - x0) * i) / (n - 1),
        y: yBase - (v / axisMax) * h,
      }));
    const toPath = (p: { x: number; y: number }[]) =>
      p.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const toArea = (p: { x: number; y: number }[]) => `${toPath(p)} L ${x1},${yBase} L ${x0},${yBase} Z`;
    // Real x-axis labels: dates for the 8 daily buckets (index 7 = today).
    const labelIdx = [0, 2, 5, 7];
    const labels = labelIdx.map((i) => ({
      x: x0 + ((x1 - x0) * i) / (n - 1),
      text: new Date(Date.now() - (n - 1 - i) * DAY_MS).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
    return {
      leads: pts(leads),
      appts: pts(appts),
      toPath,
      toArea,
      axisMax,
      labels,
    };
  }, [leadSparkline, appointmentSparkline]);

  // ── P4: Leads-by-source donut segments computed from the REAL source
  // breakdown (replaces the hardcoded 32/24/18/14/8/4 ring).
  const donutSegments = useMemo(() => {
    const total = sourceBreakdown.reduce((s, b) => s + b.count, 0);
    if (total <= 0) return [];
    const C = 2 * Math.PI * 38;
    let offset = 0;
    return sourceBreakdown.map((b) => {
      const frac = b.count / total;
      const seg = {
        stroke: b.stroke,
        dasharray: `${(frac * C).toFixed(2)} ${C.toFixed(2)}`,
        dashoffset: (-offset).toFixed(2),
      };
      offset += frac * C;
      return seg;
    });
  }, [sourceBreakdown]);

  // ── P4: Upcoming panel — truly upcoming only. Rows come sorted by
  // createdAt desc (recent-activity series), so filter to future-scheduled
  // bookings (including today) and sort by scheduled time ascending.
  const upcoming = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return upcomingAppointments
      .filter((b) => {
        const t = b?.scheduledAt ? new Date(b.scheduledAt).getTime() : NaN;
        return Number.isFinite(t) && t >= todayStart.getTime();
      })
      .sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
      .slice(0, 4);
  }, [upcomingAppointments]);

  // Recent Activity Filter
  const [activityFilter, setActivityFilter] = useState<'all' | 'leads' | 'appointments' | 'calls' | 'messages' | 'forms'>('all');

  // Tasks & Follow-ups state
  const [tasks, setTasks] = useState<DashboardTask[]>(initialTasks ?? (isDemo ? INITIAL_TASKS : []));
  const [activities, setActivities] = useState<DashboardActivity[]>(initialActivities ?? (isDemo ? INITIAL_ACTIVITIES : []));

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'all') return true;
    return act.type === activityFilter;
  });

  return (
    <div className="flex-1 w-full min-h-screen bg-background dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP HEADER BANNER & BUSINESS IDENTIFIER
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Greeting */}
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-gradient-to-tr from-[#00A884] to-[#007F73] text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <Send className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {timeGreeting}, {firstName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
        </div>

        {/* Right Business Selector */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCurrentView('settings')}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-teal-300 transition-colors"
          >
            <div className="size-8 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-xs font-bold text-teal-700">
              {businessInitials}
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {businessName}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">{businessLocation}</div>
            </div>
            <ChevronDown className="size-4 text-slate-400 ml-1" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. TOP 5 EXECUTIVE GROWTH KPI CARDS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: New Leads */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-xs">
              <Target className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {leadCount}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">New Leads</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <KpiTrend delta={leadGrowthRate} fallbackLabel={leadCount > 0 ? 'total captured' : 'no leads yet'} />
            {leadSparkline && (
              <div className="mt-1">
                <MiniBarChart values={leadSparkline} color="var(--chart-1)" />
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Appointments */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <Calendar className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {appointmentCount}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Appointments</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <KpiTrend delta={appointmentGrowthRate} fallbackLabel={appointmentCount > 0 ? 'total booked' : 'none yet'} />
            {appointmentSparkline && (
              <div className="mt-1">
                <MiniBarChart values={appointmentSparkline} color="var(--chart-3)" />
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Phone Calls */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Phone className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {callCount}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Phone Calls</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <KpiTrend delta={callGrowthRate} fallbackLabel={callCount > 0 ? 'total handled' : 'no calls yet'} />
            {callSparkline && (
              <div className="mt-1">
                <MiniBarChart values={callSparkline} color="#10B981" />
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Messages */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {messageCount}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Messages</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <KpiTrend delta={messageGrowthRate} fallbackLabel={messageCount > 0 ? 'conversations' : 'no messages yet'} />
            {messageSparkline && (
              <div className="mt-1">
                <MiniBarChart values={messageSparkline} color="#F97316" />
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Google Rating — P4: no real trend data exists for ratings,
            so the old fabricated "+12%" chip was removed entirely. */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Star className="size-5 fill-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
                {reviewStats.rating}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Google Rating</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-0.5 text-amber-500 my-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="size-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[9px] text-slate-400">{reviewStats.count} reviews</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. MID-ROW: BUSINESS GROWTH (SPLINE) | LEADS BY SOURCE | UPCOMING APPOINTMENTS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Business Growth — REAL last-7-days lead & booking activity (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Business Growth
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              New leads &amp; bookings per day · last 7 days
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="size-2 rounded-full bg-chart-1" /> Leads
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="size-2 rounded-full bg-chart-3" /> Appointments
            </div>
          </div>

          {/* SVG chart canvas — only rendered when a real series exists */}
          {growthChart ? (
            <div className="relative w-full h-48">
              <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines + y labels from the real axis scale */}
                {[0, growthChart.axisMax / 2, growthChart.axisMax].map((v, i) => {
                  const y = 165 - (v / growthChart.axisMax) * 135;
                  return (
                    <g key={i}>
                      <line x1="30" y1={y} x2="490" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.6" />
                      <text x="22" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                        {Number.isInteger(v) ? v : v.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Leads area + line (real buckets) */}
                <path d={growthChart.toArea(growthChart.leads)} fill="url(#purpleGrad)" />
                <path
                  d={growthChart.toPath(growthChart.leads)}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth="2.5"
                />

                {/* Appointments line (real buckets) */}
                <path
                  d={growthChart.toPath(growthChart.appts)}
                  fill="none"
                  stroke="var(--chart-3)"
                  strokeWidth="2"
                />

                {/* Data dots for the real leads series */}
                {growthChart.leads.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="var(--chart-1)" stroke="#fff" strokeWidth="1.5" />
                ))}

                {/* X axis labels — real dates */}
                {growthChart.labels.map((l) => (
                  <text key={l.text} x={l.x} y="175" textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">
                    {l.text}
                  </text>
                ))}
              </svg>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
              <TrendingUp className="size-5 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No trend data yet</div>
              <div className="text-[10px] text-slate-400 max-w-[240px]">
                Daily leads and bookings for the last 7 days will chart here as they come in.
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Leads by Source (Donut Chart) (3.5 Cols) */}
        <div className="lg:col-span-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Leads by Source
          </h2>

          <div className="flex items-center justify-between gap-3 my-auto">
            {/* SVG Donut — P4: segments computed from the REAL source breakdown */}
            <div className="relative size-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F5F9" strokeWidth="16" />
                {/* Real segments (empty until leads with sources are fetched) */}
                {donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke={seg.stroke}
                    strokeWidth="16"
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.dashoffset}
                  />
                ))}
              </svg>
              {/* Donut Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">
                  {leadCount}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Total Leads</span>
              </div>
            </div>

            {/* Source Legend List — real data only; honest empty state (the old
                hardcoded 32/24/18/14/8/4 fallback was removed) */}
            <div className="space-y-1.5 text-xs flex-1">
              {sourceBreakdown.length > 0 ? (
                sourceBreakdown.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={cn('size-2 rounded-full flex-shrink-0', s.color)} />
                      <span className="truncate text-[11px] font-medium">{s.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 ml-1">
                      {s.pct}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 leading-snug">
                  No lead sources yet — source breakdown appears as leads come in.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Upcoming Appointments (3.5 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Upcoming Appointments
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('scheduling')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 p-0 h-auto flex items-center gap-1"
            >
              View All <ArrowRight className="size-3.5" />
            </Button>
          </div>

          <div className="space-y-2.5">
            {upcoming.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center space-y-1.5">
                <Calendar className="size-6 text-slate-300 dark:text-slate-700 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No upcoming appointments</div>
                <div className="text-[10px] text-slate-400">Customer bookings scheduled via Web & WhatsApp appear here.</div>
              </div>
            ) : (
              upcoming.map((apt, idx) => {
                const clientName = apt.customer?.name || apt.customerName || apt.clientName || 'Client';
                const serviceName = apt.service?.name || apt.title || apt.serviceName || 'Service Appointment';
                const timeStr = apt.scheduledAt
                  ? new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Scheduled';
                const isConfirmed = String(apt.status).toLowerCase() === 'confirmed';

                return (
                  <div
                    key={apt.id || idx}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 w-16 flex-shrink-0">
                        {timeStr}
                      </span>
                      <Avatar className="size-7 border border-slate-200 dark:border-slate-700">
                        <AvatarFallback className="text-[10px] font-bold bg-teal-100 text-teal-700">
                          {clientName.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {serviceName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{clientName}</div>
                      </div>
                    </div>

                    <Badge
                      className={cn(
                        'text-[10px] font-bold border-none px-2 py-0.5',
                        isConfirmed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      )}
                    >
                      {apt.status || 'Confirmed'}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. BOTTOM ROW: RECENT ACTIVITY | YOUR AI ASSISTANT | TASKS & FOLLOW-UPS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: Recent Activity Feed (4.5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent Activity
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All' },
              { id: 'leads', label: 'Leads' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'calls', label: 'Calls' },
              { id: 'messages', label: 'Messages' },
              { id: 'forms', label: 'Forms' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActivityFilter(pill.id as any)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                  activityFilter === pill.id
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Activity Rows */}
          <div className="space-y-2.5">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 space-y-1.5">
                <Clock className="size-5 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">No activity in this view</div>
                <div className="text-[11px] text-slate-400">Inbound leads, calls, reviews, and bookings will appear here in real time.</div>
              </div>
            ) : (
              filteredActivities.map((act) => {
                const IconComp = act.icon;
                return (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('size-8 rounded-xl flex items-center justify-center flex-shrink-0', act.iconColor)}>
                        <IconComp className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {act.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{act.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400">{act.time}</span>
                      <Badge className={cn('text-[10px] font-bold border-none px-2 py-0.5', act.badgeColor)}>
                        {act.badge}
                      </Badge>
                      <button type="button" className="text-slate-400 hover:text-slate-600">
                        <MoreVertical className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Your AI Assistant Cockpit (3.5 Cols) */}
        <div className="lg:col-span-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Your AI Assistant
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success('Initiating AI Assistant Test Call');
                  setCurrentView('aiReceptionist');
                }}
                className="h-6 text-[11px] font-bold px-2 rounded-lg border-teal-200 text-teal-600 hover:bg-teal-50"
              >
                Test AI
              </Button>
            </div>
          </div>

          {/* AI Mascot & Bio */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#00A884] to-[#007F73] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="size-7" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
              Handling conversations across Website, WhatsApp, Instagram, Phone and more.
            </p>
          </div>

          {/* 3 AI Performance Stats */}
          <div className="grid grid-cols-3 gap-2 text-center py-1">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-base font-black text-slate-900 dark:text-slate-100">{messageCount}</div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">Messages handled</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-base font-black text-slate-900 dark:text-slate-100">{appointmentCount}</div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">Appointments booked</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-base font-black text-slate-900 dark:text-slate-100">{leadCount}</div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">Leads captured</div>
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Actions
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('agentStudio')}
                className="h-8 text-[10px] font-bold px-1 rounded-xl flex items-center gap-1 truncate"
              >
                <BookOpen className="size-3 text-teal-600 flex-shrink-0" />
                <span className="truncate">Train Knowledge</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('omnichannel')}
                className="h-8 text-[10px] font-bold px-1 rounded-xl flex items-center gap-1 truncate"
              >
                <MessageSquare className="size-3 text-blue-600 flex-shrink-0" />
                <span className="truncate">View Conversations</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentView('integrations')}
                className="h-8 text-[10px] font-bold px-1 rounded-xl flex items-center gap-1 truncate"
              >
                <Settings className="size-3 text-slate-600 flex-shrink-0" />
                <span className="truncate">Configure Channels</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Column 3: Tasks & Follow-ups Checklist (4 Cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tasks & Follow-ups
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('leads')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 p-0 h-auto flex items-center gap-1"
            >
              View All <ArrowRight className="size-3.5" />
            </Button>
          </div>

          {/* Task Checklist */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 space-y-1.5">
                <Check className="size-5 text-teal-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</div>
                <div className="text-[10px] text-slate-400">No pending follow-ups or urgent tasks.</div>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'size-4 rounded-md mt-0.5 flex items-center justify-center border transition-colors flex-shrink-0',
                        task.completed
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      )}
                    >
                      {task.completed && <Check className="size-3" />}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'text-xs font-bold truncate transition-all',
                          task.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-slate-100'
                        )}
                      >
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{task.subtitle}</div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'text-[10px] font-bold flex items-center gap-1 flex-shrink-0',
                      task.isUrgent ? 'text-rose-600' : 'text-slate-400'
                    )}
                  >
                    {task.isUrgent && <Clock className="size-3" />}
                    {task.due}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          5. FOOTER QUICK ACTION LAUNCHERS STRIP (6 CARDS)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
        {/* Action 1: Create Campaign */}
        <button
          type="button"
          onClick={() => setCurrentView('socialMedia')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-teal-300 hover:shadow-xs transition-all text-left flex items-start justify-between group"
        >
          <div className="space-y-1 min-w-0">
            <div className="size-8 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 flex items-center justify-center mb-1">
              <Send className="size-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors truncate">
              Create Campaign
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-2">
              Send promotions via Email, SMS or WhatsApp
            </div>
          </div>
          <ArrowRight className="size-3 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all mt-1" />
        </button>

        {/* Action 2: Find New Leads */}
        <button
          type="button"
          onClick={() => setCurrentView('leads')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all text-left flex items-start justify-between group"
        >
          <div className="space-y-1 min-w-0">
            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 flex items-center justify-center mb-1">
              <Search className="size-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
              Find New Leads
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-2">
              Discover local businesses & prospects
            </div>
          </div>
          <ArrowRight className="size-3 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all mt-1" />
        </button>

        {/* Action 3: Build a Form */}
        <button
          type="button"
          onClick={() => setCurrentView('formBuilder')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-teal-300 hover:shadow-xs transition-all text-left flex items-start justify-between group"
        >
          <div className="space-y-1 min-w-0">
            <div className="size-8 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 flex items-center justify-center mb-1">
              <FileText className="size-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors truncate">
              Build a Form
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-2">
              Create a lead or booking form
            </div>
          </div>
          <ArrowRight className="size-3 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all mt-1" />
        </button>

        {/* Action 4: Create Funnel */}
        <button
          type="button"
          onClick={() => setCurrentView('formBuilder')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all text-left flex items-start justify-between group"
        >
          <div className="space-y-1 min-w-0">
            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 flex items-center justify-center mb-1">
              <FileInput className="size-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
              Create Funnel
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-2">
              Turn visitors into paying customers
            </div>
          </div>
          <ArrowRight className="size-3 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all mt-1" />
        </button>

        {/* Action 5: Design a Post */}
        <button
          type="button"
          onClick={() => setCurrentView('socialMedia')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-teal-300 hover:shadow-xs transition-all text-left flex items-start justify-between group"
        >
          <div className="space-y-1 min-w-0">
            <div className="size-8 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 flex items-center justify-center mb-1">
              <Sparkles className="size-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors truncate">
              Design a Post
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-2">
              AI-powered social media content
            </div>
          </div>
          <ArrowRight className="size-3 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all mt-1" />
        </button>

        {/* Action 6: Test Phone Agent */}
        <button
          type="button"
          onClick={() => setCurrentView('aiReceptionist')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all text-left flex items-start justify-between group"
        >
          <div className="space-y-1 min-w-0">
            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 flex items-center justify-center mb-1">
              <Headphones className="size-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors truncate">
              Test Phone Agent
            </div>
            <div className="text-[10px] text-slate-400 line-clamp-2">
              Make a test call to your AI receptionist
            </div>
          </div>
          <ArrowRight className="size-3 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
        </button>
      </div>
    </div>
  );
}

export const DashboardView = BgosDashboard;

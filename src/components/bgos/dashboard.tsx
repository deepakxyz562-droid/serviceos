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

export function BgosDashboard() {
  const { setCurrentView, auth } = useAppStore();

  // Dynamic user name and business identity
  const firstName = useMemo(() => {
    const raw = auth?.user?.name || auth?.user?.firstName || 'Deepak';
    return raw.trim().split(' ')[0];
  }, [auth?.user?.name, auth?.user?.firstName]);

  const businessName = useMemo(() => {
    return auth?.tenant?.name || auth?.workspace?.name || 'Cinderella Cleaners';
  }, [auth?.tenant?.name, auth?.workspace?.name]);

  const businessInitials = useMemo(() => {
    return businessName
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CC';
  }, [businessName]);

  const [leadCount, setLeadCount] = useState<number>(124);
  const [reviewStats, setReviewStats] = useState<{ rating: string; count: number }>({
    rating: '4.8',
    count: 326,
  });

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/leads?limit=10')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const total = data.pagination?.total ?? (Array.isArray(data.leads) ? data.leads.length : undefined);
        if (typeof total === 'number') {
          setLeadCount(total);
        }
      })
      .catch(() => {});

    fetch('/api/reviews?limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const total = data.pagination?.total ?? (Array.isArray(data.reviews) ? data.reviews.length : undefined);
        if (typeof total === 'number') {
          if (total === 0) {
            setReviewStats({ rating: '0.0', count: 0 });
          } else if (data.reviews?.length) {
            const avg =
              data.reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) /
              data.reviews.length;
            setReviewStats({ rating: avg.toFixed(1), count: total });
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

  // Growth timeframe state
  const [growthTimeframe, setGrowthTimeframe] = useState<'30d' | '7d' | '90d'>('30d');

  // Recent Activity Filter
  const [activityFilter, setActivityFilter] = useState<'all' | 'leads' | 'appointments' | 'calls' | 'messages' | 'forms'>('all');

  // Tasks & Follow-ups state
  const [tasks, setTasks] = useState([
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
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // Recent Activity items
  const activities = [
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
              <div className="text-[10px] text-slate-500 leading-tight">Tucson, Arizona</div>
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
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +28%
            </span>
            <span className="text-[9px] text-slate-400">vs last 30 days</span>
            <div className="mt-1">
              <MiniBarChart values={[3, 5, 4, 7, 6, 8, 9, 11]} color="var(--chart-1)" />
            </div>
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
                86
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Appointments</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +18%
            </span>
            <span className="text-[9px] text-slate-400">vs last 30 days</span>
            <div className="mt-1">
              <MiniBarChart values={[2, 4, 3, 5, 6, 5, 7, 8]} color="var(--chart-3)" />
            </div>
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
                312
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Phone Calls</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +32%
            </span>
            <span className="text-[9px] text-slate-400">vs last 30 days</span>
            <div className="mt-1">
              <MiniBarChart values={[5, 7, 6, 8, 9, 10, 8, 12]} color="#10B981" />
            </div>
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
                1,248
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">Messages</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +24%
            </span>
            <span className="text-[9px] text-slate-400">vs last 30 days</span>
            <div className="mt-1">
              <MiniBarChart values={[8, 11, 10, 14, 12, 16, 18, 20]} color="#F97316" />
            </div>
          </div>
        </div>

        {/* Card 5: Google Rating */}
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
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="size-3" /> +12%
            </span>
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
        {/* Column 1: Business Growth Multi-Line Spline (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Business Growth
              </h2>
            </div>
            <select
              value={growthTimeframe}
              onChange={(e) => setGrowthTimeframe(e.target.value as any)}
              className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="30d">Last 30 days</option>
              <option value="7d">Last 7 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="size-2 rounded-full bg-chart-1" /> Leads
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="size-2 rounded-full bg-chart-3" /> Appointments
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
              <span className="size-2 rounded-full bg-[#10B981]" /> Revenue (Est.)
            </div>
          </div>

          {/* SVG Multi-Line Chart Canvas */}
          <div className="relative w-full h-48">
            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="30" y1="20" x2="490" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.6" />
              <line x1="30" y1="60" x2="490" y2="60" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.6" />
              <line x1="30" y1="100" x2="490" y2="100" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.6" />
              <line x1="30" y1="140" x2="490" y2="140" stroke="#E2E8F0" strokeDasharray="3 3" opacity="0.6" />

              {/* Y Axis Labels */}
              <text x="15" y="24" className="text-[10px] fill-slate-400 font-mono">200</text>
              <text x="15" y="64" className="text-[10px] fill-slate-400 font-mono">150</text>
              <text x="15" y="104" className="text-[10px] fill-slate-400 font-mono">100</text>
              <text x="20" y="144" className="text-[10px] fill-slate-400 font-mono">50</text>
              <text x="25" y="165" className="text-[10px] fill-slate-400 font-mono">0</text>

              {/* Spline Area 1: Leads (Purple) */}
              <path
                d="M 40,130 C 90,120 120,95 170,105 C 220,115 250,70 300,60 C 350,50 380,80 430,65 C 460,55 480,45 490,40 L 490,165 L 40,165 Z"
                fill="url(#purpleGrad)"
              />
              <path
                d="M 40,130 C 90,120 120,95 170,105 C 220,115 250,70 300,60 C 350,50 380,80 430,65 C 460,55 480,45 490,40"
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth="2.5"
              />

              {/* Spline Area 2: Appointments (Blue) */}
              <path
                d="M 40,145 C 90,135 120,120 170,115 C 220,110 250,130 300,120 C 350,110 380,115 430,95 C 460,85 480,75 490,70 L 490,165 L 40,165 Z"
                fill="url(#blueGrad)"
              />
              <path
                d="M 40,145 C 90,135 120,120 170,115 C 220,110 250,130 300,120 C 350,110 380,115 430,95 C 460,85 480,75 490,70"
                fill="none"
                stroke="var(--chart-3)"
                strokeWidth="2"
              />

              {/* Spline Area 3: Revenue (Emerald) */}
              <path
                d="M 40,155 C 90,150 120,140 170,130 C 220,120 250,145 300,135 C 350,125 380,130 430,110 C 460,100 480,95 490,88"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />

              {/* Data Dots for Leads */}
              {[
                { cx: 40, cy: 130 },
                { cx: 170, cy: 105 },
                { cx: 300, cy: 60 },
                { cx: 430, cy: 65 },
                { cx: 490, cy: 40 },
              ].map((p, idx) => (
                <circle key={idx} cx={p.cx} cy={p.cy} r="3.5" fill="var(--chart-1)" stroke="#fff" strokeWidth="1.5" />
              ))}

              {/* X Axis Date Labels */}
              <text x="40" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Sep 10</text>
              <text x="115" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Sep 15</text>
              <text x="190" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Sep 20</text>
              <text x="265" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Sep 25</text>
              <text x="340" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Sep 30</text>
              <text x="415" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Oct 5</text>
              <text x="480" y="175" className="text-[10px] fill-slate-400 font-mono" textAnchor="middle">Oct 10</text>
            </svg>
          </div>
        </div>

        {/* Column 2: Leads by Source (Donut Chart) (3.5 Cols) */}
        <div className="lg:col-span-3 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Leads by Source
          </h2>

          <div className="flex items-center justify-between gap-3 my-auto">
            {/* SVG Donut */}
            <div className="relative size-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F5F9" strokeWidth="16" />
                {/* Website 32% (Blue) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="var(--chart-3)"
                  strokeWidth="16"
                  strokeDasharray="76.4 238.7"
                  strokeDashoffset="0"
                />
                {/* Google Business 24% (Purple) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="var(--chart-1)"
                  strokeWidth="16"
                  strokeDasharray="57.3 238.7"
                  strokeDashoffset="-76.4"
                />
                {/* Social Media 18% (Orange) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F97316"
                  strokeWidth="16"
                  strokeDasharray="43 238.7"
                  strokeDashoffset="-133.7"
                />
                {/* WhatsApp 14% (Emerald) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="16"
                  strokeDasharray="33.4 238.7"
                  strokeDashoffset="-176.7"
                />
                {/* Referral 8% (Pink) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#EC4899"
                  strokeWidth="16"
                  strokeDasharray="19.1 238.7"
                  strokeDashoffset="-210.1"
                />
                {/* Other 4% (Slate) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#64748B"
                  strokeWidth="16"
                  strokeDasharray="9.5 238.7"
                  strokeDashoffset="-229.2"
                />
              </svg>
              {/* Donut Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">
                  428
                </span>
                <span className="text-[9px] text-slate-400 font-medium">Total Leads</span>
              </div>
            </div>

            {/* Source Legend List */}
            <div className="space-y-1.5 text-xs flex-1">
              {[
                { name: 'Website', pct: '32%', color: 'bg-chart-3' },
                { name: 'Google Business', pct: '24%', color: 'bg-chart-1' },
                { name: 'Social Media', pct: '18%', color: 'bg-[#F97316]' },
                { name: 'WhatsApp', pct: '14%', color: 'bg-[#10B981]' },
                { name: 'Referral', pct: '8%', color: 'bg-[#EC4899]' },
                { name: 'Other', pct: '4%', color: 'bg-[#64748B]' },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={cn('size-2 rounded-full flex-shrink-0', s.color)} />
                    <span className="truncate text-[11px] font-medium">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 ml-1">
                    {s.pct}
                  </span>
                </div>
              ))}
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
            {[
              {
                time: '10:00 AM',
                service: 'Home Cleaning',
                client: 'Priya Singh',
                status: 'Confirmed',
                badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
              },
              {
                time: '12:30 PM',
                service: 'Office Deep Clean',
                client: 'Rahul Kumar',
                status: 'Confirmed',
                badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
              },
              {
                time: '2:00 PM',
                service: 'Move In/Out Cleaning',
                client: 'Sneha Patel',
                status: 'Pending',
                badgeStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
              },
              {
                time: '4:30 PM',
                service: 'Regular Home Cleaning',
                client: 'Amit Sharma',
                status: 'Confirmed',
                badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
              },
            ].map((apt, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 w-16 flex-shrink-0">
                    {apt.time}
                  </span>
                  <Avatar className="size-7 border border-slate-200 dark:border-slate-700">
                    <AvatarFallback className="text-[10px] font-bold bg-teal-100 text-teal-700">
                      {apt.client.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {apt.service}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{apt.client}</div>
                  </div>
                </div>

                <Badge className={cn('text-[10px] font-bold border-none px-2 py-0.5', apt.badgeStyle)}>
                  {apt.status}
                </Badge>
              </div>
            ))}
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
            {filteredActivities.map((act) => {
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
            })}
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
              <div className="text-base font-black text-slate-900 dark:text-slate-100">1,248</div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">Messages handled</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-base font-black text-slate-900 dark:text-slate-100">86</div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">Appointments booked</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="text-base font-black text-slate-900 dark:text-slate-100">124</div>
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
            {tasks.map((task) => (
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
            ))}
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

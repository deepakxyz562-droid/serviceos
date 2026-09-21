'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  Link2,
  MapPin,
  MessageSquare,
  Monitor,
  Receipt,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Truck,
  User,
  UserSearch,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/brand/brand-mark';

const oldWay = [
  { n: '01', icon: User, title: 'Open Customer Tab', sub: 'Search or create contact record' },
  { n: '02', icon: FileText, title: 'Create Job & Fill Form', sub: 'Type address, equipment notes' },
  { n: '03', icon: Calendar, title: 'Open Calendar', sub: 'Check 8 technicians for availability' },
  { n: '04', icon: Users, title: 'Assign Technician', sub: 'Check certifications & phone numbers' },
  { n: '05', icon: FileText, title: 'Generate Quote', sub: 'Calculate materials & upload PDF' },
  { n: '06', icon: MessageSquare, title: 'Send Confirmation', sub: 'Switch to email or SMS app' },
  { n: '07', icon: Receipt, title: 'Chase Invoice & Payment', sub: 'Export to accounting software' },
];

const steps = [
  'Understanding your request...',
  'Finding Sarah in your CRM...',
  'Checking technician availability...',
  'Matching skills & location (Gas Safe)...',
  'Creating £350 quote...',
  'Preparing WhatsApp confirmation...',
];

const sidebar = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Jobs', icon: ClipboardList },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Customers', icon: Users },
  { label: 'Quotes', icon: FileText },
  { label: 'Invoices', icon: Receipt },
  { label: 'Messages', icon: MessageSquare },
  { label: 'Dispatch', icon: Truck },
  { label: 'Reports', icon: TrendingUp },
  { label: 'Settings', icon: Settings },
];

const suggestions = [
  { label: 'Schedule a new job', icon: CalendarDays },
  { label: 'Create a quote', icon: FileText },
  { label: 'Follow up with leads', icon: UserSearch },
  { label: 'Find an available technician', icon: Wrench },
  { label: 'Collect overdue payment', icon: CreditCard },
];

const metrics = [
  { icon: Monitor, top: '7', head: 'screens → 1 command', sub: '(less clicking, more doing)' },
  { icon: Clock, top: 'Multiple screens →', head: 'Automated workflow', sub: '(no more manual handoffs)' },
  { icon: Link2, top: 'Copy/paste →', head: 'Connected data', sub: '(no more double entry)' },
  { icon: Gauge, top: 'Admin work →', head: 'Business execution', sub: '(more jobs, happier customers)' },
];

const defaultPrompt =
  'Sarah needs an emergency boiler repair tomorrow. Schedule Mike, create a £350 quote, and confirm with her on WhatsApp.';

export function FlowHero({ onGetStarted }: { onGetStarted?: () => void }) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const run = useCallback(() => {
    clear();
    setRunning(true);
    setDone(0);
    timers.current = steps.map((_, i) =>
      setTimeout(() => {
        setDone(i + 1);
        if (i === steps.length - 1) setRunning(false);
      }, 550 * (i + 1))
    );
  }, []);

  useEffect(() => {
    const id = setTimeout(run, 700);
    return () => {
      clearTimeout(id);
      clear();
    };
  }, [run]);

  const complete = done >= steps.length;

  return (
    <section id="top" className="relative overflow-hidden bg-slate-50/60 dark:bg-slate-950 pt-28 pb-20 lg:pt-36 border-b border-border">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-[84rem] px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main Pitch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center space-y-5"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400 shadow-xs">
            <Sparkles className="size-3.5" /> The Workflow Revolution
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.08] text-slate-900 dark:text-white sm:text-5xl lg:text-6xl tracking-tight">
            Stop managing software.{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent block">
              Tell Fieseros what needs to happen.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
            Your team shouldn&apos;t spend the day jumping between customers, jobs, calendars, quotes,
            invoices and messages. Fieseros AI turns one simple instruction into an entire connected
            workflow across HVAC, plumbing, electrical, roofing, and cleaning trades.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={onGetStarted}
              className="h-13 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-xl transition-all hover:scale-105 cursor-pointer"
            >
              Start Free Trial →
            </button>
            <a
              href="#problem"
              className="h-13 px-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              See How It Works
            </a>
          </div>
        </motion.div>

        {/* 3-Column Interactive Command Theatre */}
        <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr_1.25fr]">
          {/* Column 1 — The Old Way */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-4 shadow-xl space-y-2"
          >
            <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                <Clock className="size-4 text-muted-foreground" /> The old way
              </span>
              <span className="text-xs text-muted-foreground font-mono">~14 min per job</span>
            </div>
            <ol className="space-y-1.5 pt-1">
              {oldWay.map((s) => (
                <li
                  key={s.n}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/70 px-3 py-2 transition-colors hover:border-teal-500/30"
                >
                  <span className="w-5 text-[11px] font-bold text-muted-foreground/70">{s.n}</span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-200 dark:bg-slate-800 text-muted-foreground">
                    <s.icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-slate-900 dark:text-white">{s.title}</span>
                    <span className="block truncate text-[10.5px] text-muted-foreground">{s.sub}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-rose-700 dark:text-rose-400">
              <Clock className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-[11.5px] font-medium">
                12+ wasted administrative hours every week.
              </p>
            </div>
          </motion.div>

          {/* Column 2 — Ask Fieseros AI */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-teal-400">
                <Sparkles className="size-4" /> Ask Fieseros AI
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-3 text-[13px] leading-relaxed text-slate-900 dark:text-white outline-none transition-colors focus:border-teal-500/50"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={run}
                  className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 cursor-pointer shadow-md"
                >
                  {running ? 'Running...' : 'Run Command'}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div className="relative rounded-3xl border border-teal-500/30 bg-white dark:bg-slate-900 p-5 shadow-xl">
              <span className="absolute -top-3.5 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-teal-600 text-white shadow-md">
                <Sparkles className="size-3.5" />
              </span>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 py-2">
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full transition-colors text-[10px]',
                        i < done ? 'bg-teal-600 text-white' : 'border-2 border-slate-300 dark:border-slate-700'
                      )}
                    >
                      {i < done && <Check className="size-3" />}
                    </span>
                    <span
                      className={cn(
                        'text-[12.5px] transition-colors',
                        i < done ? 'text-slate-900 dark:text-white font-medium' : 'text-muted-foreground/60'
                      )}
                    >
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
              <AnimatePresence>
                {complete && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-3 py-2.5 text-emerald-800 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[12.5px] font-bold">Workflow complete in 0.4s!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Column 3 — Live Mini-Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            <div className="grid grid-cols-[8.5rem_1fr]">
              <aside className="bg-slate-900 dark:bg-slate-950 p-3 border-r border-slate-800">
                <div className="mb-4 flex items-center gap-1.5 px-1">
                  <div className="size-5 rounded bg-teal-500 flex items-center justify-center text-slate-950 font-black text-[10px]">
                    F
                  </div>
                  <span className="text-[12.5px] font-bold text-white">Fieseros</span>
                </div>
                <ul className="space-y-0.5">
                  {sidebar.map((s, i) => (
                    <li key={s.label}>
                      <span
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] transition-colors',
                          i === 1
                            ? 'bg-teal-600/30 text-teal-300 font-semibold'
                            : 'text-slate-400 hover:bg-slate-800'
                        )}
                      >
                        <s.icon className="size-3.5" /> {s.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50 p-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Search className="size-3.5" /> Search jobs...
                  </div>
                  <Bell className="size-4 text-muted-foreground" />
                </div>

                <AnimatePresence>
                  {complete && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-xs text-emerald-900 dark:text-emerald-200"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] leading-tight">
                        <strong className="block font-bold">Job Created Successfully</strong>
                        Emergency boiler repair has been scheduled.
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Job Card */}
                <div className="rounded-xl border border-border bg-white dark:bg-slate-800 p-3 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-bold text-slate-900 dark:text-white">Emergency Boiler Repair</p>
                    <span className="rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 text-[9.5px] font-semibold border border-teal-200 dark:border-teal-800">
                      Scheduled
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <span className="grid size-6 place-items-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      <User className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-[11.5px] font-semibold text-slate-900 dark:text-white">Sarah Williams</p>
                      <p className="text-[10px]">48 King Road, London · +44 7123 456789</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1.5 text-[10.5px]">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                      <Clock className="size-3 text-teal-600" /> Tomorrow · 10:30 AM
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">Tech: Mike Johnson (Gas Safe)</span>
                  </div>
                </div>

                {/* Quote Card */}
                <div className="rounded-xl border border-border bg-white dark:bg-slate-800 p-3 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-[12.5px] font-bold text-slate-900 dark:text-white">
                    <span>Quote #Q-8924</span>
                    <span className="text-teal-600 dark:text-teal-400">£350.00</span>
                  </div>
                  {[
                    ['Diagnostic Labour', '£180'],
                    ['Seal Kit Parts', '£120'],
                    ['Emergency Call-out', '£50'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10.5px] text-muted-foreground">
                      <span>{k}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{v}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={onGetStarted}
                      className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-700 py-1 text-[10px] font-semibold text-white transition-colors cursor-pointer"
                    >
                      View Quote
                    </button>
                    <button
                      type="button"
                      onClick={onGetStarted}
                      className="flex-1 rounded-lg border border-teal-500/40 py-1 text-[10px] font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
                    >
                      Send WhatsApp Link
                    </button>
                  </div>
                </div>

                {/* WhatsApp Notification Card */}
                <div className="rounded-xl border border-border bg-white dark:bg-slate-800 p-3 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-white">
                      <MessageSquare className="size-3" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white">Customer Notified via WhatsApp</span>
                  </div>
                  <p className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 border border-border/60">
                    &quot;Hi Sarah, your boiler repair is confirmed for tomorrow at 10:30 AM. Mike will be your technician. Track him in real-time here: [live link]&quot;
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Try it yourself Suggestion Pills */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr_0.8fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
                Try it yourself
              </span>
              <h3 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">See how easy it is.</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Click a suggestion or type your own command and watch Fieseros handle the rest.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setPrompt(`${s.label} — Fieseros, handle it end to end.`);
                    run();
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 cursor-pointer shadow-xs',
                    i === 0
                      ? 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                  )}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </button>
              ))}
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 space-y-1">
              <span className="grid size-8 place-items-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <Zap className="size-4" />
              </span>
              <p className="text-xs sm:text-sm font-bold leading-snug text-slate-900 dark:text-white pt-1">
                One instruction.
                <br />
                The workflow moves forward.
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-6 sm:grid-cols-2 lg:grid-cols-4 shadow-sm">
          {metrics.map((m) => (
            <div key={m.head} className="flex items-start gap-3 lg:border-slate-200 dark:lg:border-slate-800 lg:not-first:border-l lg:not-first:pl-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                <m.icon className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{m.top}</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.head}</p>
                <p className="text-[10px] text-muted-foreground">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

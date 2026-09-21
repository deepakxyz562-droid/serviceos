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
import { BrandMark } from '@/components/brand/brand-mark';
import { cn } from '@/lib/utils';

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
  'Matching skills & location...',
  'Creating £350 quote...',
  'Preparing customer message...',
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
    timers.current.forEach(clearTimeout);
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
    <section id="top" className="relative overflow-hidden bg-surface pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 grid-fade" />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-[84rem] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
            The Workflow Revolution
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] text-navy sm:text-5xl lg:text-6xl tracking-tight">
            Stop managing software.{' '}
            <span className="block text-gradient-brand">Tell Fieseros what needs to happen.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your team shouldn&apos;t spend the day jumping between customers, jobs, calendars, quotes,
            invoices and messages. Fieseros AI turns one simple instruction into an entire connected
            workflow.
          </p>
        </motion.div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr_1.25fr]">
          {/* Column 1 — the old way */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-border bg-background/80 p-3 shadow-[0_30px_70px_-50px_oklch(0.21_0.045_258/0.6)] backdrop-blur-sm"
          >
            <div className="flex items-center justify-between rounded-2xl bg-surface px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy">
                <Clock className="size-4 text-muted-foreground" /> The old way
              </span>
              <span className="text-xs text-muted-foreground">~14 min per job</span>
            </div>
            <ol className="mt-2 space-y-1.5">
              {oldWay.map((s) => (
                <li
                  key={s.n}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-2.5 transition-colors hover:border-primary/30"
                >
                  <span className="w-5 text-[11px] font-bold text-muted-foreground/70">{s.n}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground">
                    <s.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-navy">{s.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{s.sub}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex items-center gap-2.5 rounded-2xl bg-destructive/10 px-3.5 py-3">
              <Clock className="size-4 shrink-0 text-destructive" />
              <p className="text-[12px] font-medium text-destructive">
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
            <div className="rounded-3xl border border-border bg-background p-4 shadow-[0_30px_70px_-50px_oklch(0.21_0.045_258/0.6)]">
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <Sparkles className="size-4" /> Ask Fieseros AI
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="mt-3 w-full resize-none rounded-2xl border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-navy outline-none transition-colors focus:border-primary/50"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={run}
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-deep cursor-pointer"
                >
                  {running ? 'Running' : 'Run'}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div className="relative rounded-3xl border border-primary/25 bg-background p-4 shadow-[0_0_0_6px_var(--accent)]">
              <span className="absolute -top-4 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                <Sparkles className="size-4" />
              </span>
              <ul className="mt-2 divide-y divide-border/70">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full transition-colors',
                        i < done ? 'bg-primary text-primary-foreground' : 'border-2 border-border'
                      )}
                    >
                      {i < done && <Check className="size-3" />}
                    </span>
                    <span
                      className={cn(
                        'text-[13px] transition-colors',
                        i < done ? 'text-navy font-medium' : 'text-muted-foreground/60'
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
                    className="mt-2 flex items-center gap-2.5 rounded-2xl bg-accent px-3.5 py-3"
                  >
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span className="text-[13px] font-bold text-accent-foreground">Workflow complete!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Column 3 — dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="overflow-hidden rounded-3xl border border-border bg-background shadow-[0_40px_90px_-50px_oklch(0.21_0.045_258/0.65)]"
          >
            <div className="grid grid-cols-[9.5rem_1fr]">
              <aside className="bg-navy-deep p-3">
                <div className="mb-4 flex items-center gap-2 px-1">
                  <BrandMark size={20} className="shrink-0" />
                  <span className="text-[13px] font-bold text-primary-foreground">Fieseros</span>
                </div>
                <ul className="space-y-0.5">
                  {sidebar.map((s, i) => (
                    <li key={s.label}>
                      <span
                        className={cn(
                          'flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11.5px] transition-colors',
                          i === 1
                            ? 'bg-white/10 font-semibold text-primary-foreground'
                            : 'text-primary-foreground/55 hover:bg-white/5'
                        )}
                      >
                        <s.icon className="size-3.5" /> {s.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="space-y-2.5 bg-surface p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <Search className="size-3.5" /> Search...
                  </div>
                  <Bell className="size-4 text-muted-foreground" />
                  <span className="size-6 rounded-full bg-navy" />
                </div>

                <AnimatePresence>
                  {complete && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-accent px-3 py-2.5"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      <span className="text-[11.5px] leading-tight">
                        <span className="block font-bold text-accent-foreground">Job Created Successfully</span>
                        <span className="block text-accent-foreground/70">
                          Emergency boiler repair has been scheduled.
                        </span>
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-bold text-navy">Emergency Boiler Repair</p>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      Scheduled
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-start gap-2.5">
                    <span className="grid size-8 place-items-center rounded-full bg-surface text-muted-foreground">
                      <User className="size-4" />
                    </span>
                    <div className="text-[11px] text-muted-foreground">
                      <p className="text-[12px] font-semibold text-navy">Sarah Williams</p>
                      <p>sarah@customer.com</p>
                      <p>+44 7123 456789</p>
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <Clock className="size-3.5 text-primary" /> Tomorrow · 10:30 AM
                  </p>
                  <div className="mt-2 flex items-start gap-2.5 border-t border-border pt-2">
                    <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Wrench className="size-4" />
                    </span>
                    <div className="text-[11px] text-muted-foreground">
                      <p className="text-[12px] font-semibold text-navy">Mike Johnson</p>
                      <p>Gas Certified</p>
                      <p className="flex items-center gap-1">
                        <MapPin className="size-3" /> 2.4 miles away
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="flex items-center justify-between text-[13px] font-bold text-navy">
                    <span>Quote</span>
                    <span className="text-primary">£350</span>
                  </div>
                  {[
                    ['Labour', '£180'],
                    ['Parts', '£120'],
                    ['Emergency call-out', '£50'],
                  ].map(([k, v]) => (
                    <div key={k} className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-[11px]">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-navy">{v}</span>
                    </div>
                  ))}
                  <div className="mt-2.5 flex gap-2">
                    <button className="flex-1 rounded-xl bg-primary py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-brand-deep cursor-pointer">
                      View Quote
                    </button>
                    <button className="flex-1 rounded-xl border border-primary/40 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-accent cursor-pointer">
                      Send to Customer
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                      <MessageSquare className="size-3.5" />
                    </span>
                    <span className="text-[11px] leading-tight">
                      <span className="block text-[12px] font-semibold text-navy">Customer Notified</span>
                      <span className="block text-muted-foreground">via WhatsApp · 10:32 AM</span>
                    </span>
                  </div>
                  <p className="mt-2 rounded-xl bg-surface p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    Hi Sarah, your boiler repair is confirmed for tomorrow at 10:30 AM. Mike will be your
                    technician. Track him in real-time here: [tracking link]
                  </p>
                  <button className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-semibold text-navy transition-colors hover:bg-surface cursor-pointer">
                    <MapPin className="size-3.5 text-primary" /> Track Technician
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Try it yourself */}
        <div className="mt-8 rounded-3xl border border-border bg-background/80 p-6 sm:p-8 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr_0.8fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
                Try it yourself
              </span>
              <h3 className="mt-3 text-xl font-extrabold text-navy">See how easy it is.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Click a suggestion or type your own command and watch Fieseros handle the rest.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {suggestions.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setPrompt(`${s.label} — Fieseros, handle it end to end.`);
                    run();
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5 cursor-pointer',
                    i === 0
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-brand-deep'
                      : 'border-border bg-background text-navy hover:border-primary/40 hover:bg-surface'
                  )}
                >
                  <s.icon className="size-4" />
                  {s.label}
                </button>
              ))}
            </div>

            <div className="border-border lg:border-l lg:pl-6">
              <span className="grid size-9 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Zap className="size-4" />
              </span>
              <p className="mt-3 text-sm font-bold leading-snug text-navy">
                One instruction.
                <br />
                The workflow moves forward.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl border border-border bg-background/80 p-6 sm:grid-cols-2 lg:grid-cols-4 shadow-sm">
          {metrics.map((m) => (
            <div key={m.head} className="flex items-start gap-3 lg:border-border lg:not-first:border-l lg:not-first:pl-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-surface text-primary">
                <m.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-navy">{m.top}</p>
                <p className="text-sm font-semibold text-navy">{m.head}</p>
                <p className="text-[11px] text-muted-foreground">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

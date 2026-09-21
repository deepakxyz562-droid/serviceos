'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  CreditCard,
  MapPin,
  Navigation,
  PenLine,
  Smartphone,
  Truck,
  Check,
  Radio,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const milestones = [
  { n: '01', label: 'Assigned', time: '09:00 AM', icon: Truck },
  { n: '02', label: 'En Route', time: '09:42 AM', icon: Navigation },
  { n: '03', label: 'On Site', time: '10:00 AM', icon: MapPin },
  { n: '04', label: 'Completed', time: '11:15 AM', icon: CheckCircle2 },
];

const feed = [
  'Mike Johnson accepted job #4821',
  'GPS ping — 2.4 mi from site (London SW4)',
  'Safety checklist 4/4 verified',
  'Before photos uploaded (3 high-res inspection images)',
  'Signature captured · Paid £350 via contactless card',
];

export function FlowFieldSync({ onGetStarted }: { onGetStarted?: () => void }) {
  const [step, setStep] = useState(2);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % milestones.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="sync" className="bg-slate-50/70 dark:bg-slate-900/60 py-24 border-b border-border relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex rounded-full bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
            Real-time office ↔ field sync
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Your office sees the business.{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              Your technicians see the work.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Zero paper clipboards. Zero missing parts notes. The office dispatch board and field technician mobile PWA app stay synchronized in real time.
          </p>
        </div>

        {/* Milestones Stepper */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {milestones.map((m, i) => (
            <button
              key={m.n}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer shadow-xs',
                i <= step
                  ? 'border-teal-500/50 bg-white dark:bg-slate-900 shadow-md ring-2 ring-teal-500/20'
                  : 'border-border bg-white/60 dark:bg-slate-900/40 opacity-70'
              )}
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
                  i <= step ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                )}
              >
                <m.icon className="size-4" />
              </span>
              <span>
                <span className="block text-[11px] font-bold text-muted-foreground">{m.n}</span>
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{m.label}</span>
                <span className="block text-[11px] text-muted-foreground font-mono">{m.time}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Split Screen Grid (Office Desktop vs Mobile PWA) */}
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start max-w-6xl mx-auto">
          {/* Office Dispatch Board */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl border border-border bg-white dark:bg-slate-900 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border bg-slate-50 dark:bg-slate-800/80 px-5 py-3.5">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Office Dispatch &amp; Operations Command</p>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> Live GPS Fleet
              </span>
            </div>

            <div className="grid gap-3 px-5 sm:grid-cols-3">
              {[
                ['8', 'Active technicians'],
                ['£8,940', 'Pipeline today'],
                ['96%', 'On-time arrival'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-border">
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{v}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{l}</p>
                </div>
              ))}
            </div>

            <div className="px-5 pb-5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Live Audit Log Feed</p>
              <ul className="space-y-2">
                {feed.map((f, i) => (
                  <li
                    key={f}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs transition-colors',
                      i <= step + 1
                        ? 'border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 font-medium'
                        : 'border-border text-muted-foreground opacity-50'
                    )}
                  >
                    <CheckCircle2
                      className={cn('size-4 shrink-0', i <= step + 1 ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground')}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Technician Mobile PWA Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto w-full max-w-sm rounded-[2.5rem] border-8 border-slate-900 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-bold text-slate-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-teal-600 dark:text-teal-400" />
                <span>Technician Mobile PWA</span>
              </div>
              <Badge variant="outline" className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-300">
                Offline Ready
              </Badge>
            </div>

            {/* Checklist */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-3 space-y-2 border border-border">
              <p className="text-xs font-bold text-slate-900 dark:text-white">Safety Checklist (Gas Safe)</p>
              <ul className="space-y-1.5">
                {['Isolate gas supply', 'PPE & safety gear on', 'Before inspection photos', 'Customer briefed'].map((c) => (
                  <li key={c} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400" /> {c}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400">✓ 4 of 4 verified</p>
            </div>

            {/* On-Site Actions */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1">
                <Camera className="size-4 text-teal-600 mx-auto" />
                <p className="text-[10px] font-bold text-slate-900 dark:text-white">3 Photos Attached</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-1">
                <CreditCard className="size-4 text-emerald-600 mx-auto" />
                <p className="text-[10px] font-bold text-slate-900 dark:text-white">£350 Tap-to-Pay</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onGetStarted}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Sign &amp; Complete Work Order →
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

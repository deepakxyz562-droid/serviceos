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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const milestones = [
  { n: '01', label: 'Assigned', time: '09:00 AM', icon: Truck },
  { n: '02', label: 'En Route', time: '09:42 AM', icon: Navigation },
  { n: '03', label: 'On Site', time: '10:00 AM', icon: MapPin },
  { n: '04', label: 'Completed', time: '11:15 AM', icon: CheckCircle2 },
];

const feed = [
  'Mike Johnson accepted job #4821',
  'GPS ping — 2.4 mi from site',
  'Safety checklist 4/4 verified',
  'Before photos uploaded (3)',
  'Signature captured · Paid £350',
];

export function FlowFieldSync() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % milestones.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="sync" className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
            Real-time office ↔ field sync
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl tracking-tight">
            Your office sees the business.{' '}
            <span className="text-gradient-brand">Your technicians see the work.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m, i) => (
            <button
              key={m.n}
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300 cursor-pointer',
                i <= step
                  ? 'border-primary/40 bg-background shadow-[0_18px_44px_-32px_var(--brand-deep)]'
                  : 'border-border bg-background/50'
              )}
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
                  i <= step ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground'
                )}
              >
                <m.icon className="size-4" />
              </span>
              <span>
                <span className="block text-[11px] font-bold text-muted-foreground">{m.n}</span>
                <span className="block text-sm font-bold text-navy">{m.label}</span>
                <span className="block text-[11px] text-muted-foreground">{m.time}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl border border-border bg-background shadow-[0_40px_90px_-60px_oklch(0.21_0.045_258/0.6)]"
          >
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
              <p className="text-sm font-bold text-navy">Office Dispatch Board</p>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-primary">
                <span className="size-2 animate-pulse rounded-full bg-primary" /> Live
              </span>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              {[
                ['8', 'Active technicians'],
                ['£8,940', 'Pipeline today'],
                ['96%', 'On-time arrival'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-surface p-4 border border-border/40">
                  <p className="text-2xl font-extrabold text-navy">{v}</p>
                  <p className="text-[12px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-2 px-5 pb-5">
              {feed.map((f, i) => (
                <li
                  key={f}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 text-[13px] transition-colors',
                    i <= step + 1 ? 'bg-accent/40 text-navy font-medium' : 'text-muted-foreground'
                  )}
                >
                  <CheckCircle2
                    className={cn('size-4', i <= step + 1 ? 'text-primary' : 'text-muted-foreground/40')}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto w-full max-w-sm rounded-[2rem] border-8 border-navy-deep bg-background p-4 shadow-[0_40px_90px_-50px_oklch(0.21_0.045_258/0.7)]"
          >
            <div className="flex items-center gap-2 text-[12px] font-bold text-navy">
              <Smartphone className="size-4 text-primary" /> Technician PWA
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground font-semibold">
                Offline ready
              </span>
            </div>

            <div className="mt-3 rounded-2xl bg-surface p-3 border border-border/40">
              <p className="text-[12px] font-bold text-navy">Safety checklist</p>
              <ul className="mt-2 space-y-1.5">
                {['Isolate gas supply', 'PPE on', 'Site photos', 'Customer briefed'].map((c) => (
                  <li key={c} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-primary" /> {c}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] font-semibold text-primary">4/4 verified</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {['Before', 'After'].map((l) => (
                <div
                  key={l}
                  className="grid h-20 place-items-center rounded-2xl border border-dashed border-border bg-surface text-[11px] text-muted-foreground font-medium"
                >
                  <Camera className="size-4 text-primary" />
                  {l} photo
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-border p-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold text-navy">
                <PenLine className="size-4 text-primary" /> Digital signature
              </p>
              <div className="mt-2 h-10 rounded-xl bg-surface border border-border/40" />
            </div>

            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-deep cursor-pointer">
              <CreditCard className="size-4" /> Tap to pay · 0% fee
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

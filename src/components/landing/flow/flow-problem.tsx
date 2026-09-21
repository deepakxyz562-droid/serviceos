'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, PhoneMissed, Receipt, Table2 } from 'lucide-react';

const cards = [
  {
    icon: PhoneMissed,
    title: 'Missed calls = lost revenue',
    stat: '62%',
    statLabel: 'of calls go unanswered after hours',
    sub: '3–5 jobs lost every single week.',
  },
  {
    icon: Table2,
    title: 'Chaos in spreadsheets & texts',
    stat: '4+ hrs',
    statLabel: 'per day wasted on admin',
    sub: 'Job details scattered across five apps.',
  },
  {
    icon: Receipt,
    title: 'Late invoices, late payments',
    stat: '18 days',
    statLabel: 'average invoice paid late',
    sub: 'Cash flow you already earned, still waiting.',
  },
];

export function FlowProblem() {
  return (
    <section id="problem" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-destructive shadow-sm">
            <Flame className="size-3.5" /> The problem
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl tracking-tight">
            Running a service business is chaos.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.article
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group rounded-3xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-destructive/30 hover:bg-background hover:shadow-[0_30px_70px_-45px_oklch(0.21_0.045_258/0.55)]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive transition-transform duration-300 group-hover:scale-110">
                <c.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-navy">{c.title}</h3>
              <p className="mt-4 text-3xl font-extrabold text-destructive">{c.stat}</p>
              <p className="text-sm font-medium text-navy">{c.statLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.sub}</p>
            </motion.article>
          ))}
        </div>

        <p className="mt-10 text-center text-base font-semibold text-navy">
          Fieseros fixes all three —{' '}
          <span className="text-primary font-bold">day one, no Meta approvals required.</span>
        </p>
      </div>
    </section>
  );
}

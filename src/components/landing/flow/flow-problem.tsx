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
    <section id="problem" className="bg-background py-24 border-b border-border relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/25 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-400">
            <Flame className="size-3.5" /> The problem
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Running a service business is chaos.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Contractors lose hours of billing time every day to manual data entry, missed calls, and disconnected software.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.article
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group rounded-3xl border border-border bg-slate-50/50 dark:bg-slate-900/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/30 hover:bg-white dark:hover:bg-slate-900 shadow-md hover:shadow-xl"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-transform duration-300 group-hover:scale-110">
                <c.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{c.title}</h3>
              <p className="mt-4 text-3xl font-extrabold text-rose-600 dark:text-rose-400">{c.stat}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.statLabel}</p>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{c.sub}</p>
            </motion.article>
          ))}
        </div>

        <p className="text-center text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
          Fieseros fixes all three —{' '}
          <span className="text-teal-600 dark:text-teal-400 font-bold">day one, no Meta approvals required.</span>
        </p>
      </div>
    </section>
  );
}

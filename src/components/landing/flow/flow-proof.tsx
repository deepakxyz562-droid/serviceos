'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CloudOff, Quote, ShieldCheck, Star, Workflow as WorkflowIcon } from 'lucide-react';

const testimonials = [
  {
    quote:
      'We were missing 20 calls a week. Fieseros picked up every one of them and booked them while I was under a sink.',
    name: 'Ray Donnelly',
    role: 'Donnelly Plumbing · 7 vans',
    stats: '+38% revenue',
  },
  {
    quote:
      'The dispatch board rebuilds itself when a job runs over. My office manager got her afternoons back.',
    name: 'Sofia Marín',
    role: 'Marín Air & Heat · 14 techs',
    stats: '4.2 hrs saved/day',
  },
  {
    quote:
      'Quotes go out before we leave the driveway. Our close rate went from 41% to 68% in one quarter.',
    name: 'Tom Ashby',
    role: 'Ashby Roofing · 22 crew',
    stats: '68% close rate',
  },
];

const badges = [
  {
    icon: ShieldCheck,
    title: 'Field-tested reliability',
    body: '99.98% uptime across 4M+ dispatched jobs.',
  },
  {
    icon: CloudOff,
    title: 'Offline mobile sync',
    body: 'Basements, lofts, dead zones — it keeps working.',
  },
  {
    icon: WorkflowIcon,
    title: 'Zero double-entry',
    body: 'One record from first call to paid invoice.',
  },
];

export function FlowProof() {
  return (
    <section id="proof" className="relative py-24 bg-muted/30 border-y border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            Trusted in the field
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Built with contractors, proven on the tools
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            See how trade owners run bigger businesses with smaller offices.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="flex flex-col rounded-3xl border border-border/70 bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md hover:border-teal-500/30"
            >
              <div className="flex items-center justify-between">
                <Quote className="size-7 text-teal-600 dark:text-teal-400 opacity-70" />
                <span className="inline-flex items-center rounded-full bg-teal-500/10 dark:bg-teal-500/20 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  {t.stats}
                </span>
              </div>
              <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-foreground font-normal">
                “{t.quote}”
              </blockquote>
              <div className="mt-6 flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="size-4 fill-current" />
                ))}
              </div>
              <figcaption className="mt-3 text-sm">
                <span className="font-bold text-foreground">{t.name}</span>
                <span className="block text-muted-foreground text-xs mt-0.5">{t.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                <b.icon className="size-5" />
              </span>
              <div>
                <p className="font-bold text-foreground text-sm">{b.title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

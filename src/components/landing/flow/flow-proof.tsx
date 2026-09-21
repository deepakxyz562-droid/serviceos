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
  },
  {
    quote:
      'The dispatch board rebuilds itself when a job runs over. My office manager got her afternoons back.',
    name: 'Sofia Marín',
    role: 'Marín Air & Heat · 14 techs',
  },
  {
    quote:
      'Quotes go out before we leave the driveway. Our close rate went from 41% to 68% in one quarter.',
    name: 'Tom Ashby',
    role: 'Ashby Roofing · 22 crew',
  },
];

const badges = [
  { icon: ShieldCheck, title: 'Field-tested reliability', body: '99.98% uptime across 4M+ dispatched jobs.' },
  { icon: CloudOff, title: 'Offline mobile sync', body: 'Basements, lofts, dead zones — it keeps working.' },
  { icon: WorkflowIcon, title: 'Zero double-entry', body: 'One record from first call to paid invoice.' },
];

export function FlowProof() {
  return (
    <section id="proof" className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Trusted in the field</p>
          <h2 className="mt-3 text-3xl font-extrabold text-navy sm:text-4xl tracking-tight">
            Built with contractors, proven on the tools
          </h2>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="flex flex-col rounded-3xl border border-border bg-background p-7 transition-transform duration-300 hover:-translate-y-1.5 shadow-sm"
            >
              <Quote className="size-7 text-primary" />
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-navy">“{t.quote}”</blockquote>
              <div className="mt-6 flex items-center gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="size-4 fill-current" />
                ))}
              </div>
              <figcaption className="mt-3 text-sm">
                <span className="font-bold text-navy">{t.name}</span>
                <span className="block text-muted-foreground">{t.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-4 rounded-2xl border border-border bg-background p-6 shadow-xs"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <b.icon className="size-5" />
              </span>
              <div>
                <p className="font-bold text-navy">{b.title}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

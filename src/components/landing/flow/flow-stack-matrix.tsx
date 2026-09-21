'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const tools = [
  ['HubSpot', '$99'],
  ['ServiceTitan', '$299'],
  ['FieldEdge', '$99'],
  ['Typeform', '$79'],
  ['Air AI', '$199'],
  ['Calendly', '$29'],
  ['Podium', '$99'],
  ['Zapier', '$169'],
  ['Mailchimp', '$99'],
  ['QuickBooks', '$49'],
  ['DocuSign', '$47'],
  ['Birdeye', '$159'],
  ['Housecall Pro', '$169'],
  ['Twilio SMS', '$120'],
  ['Google Voice AI', '$250'],
  ['Jotform', '$39'],
  ['Loom + Docs', '$343'],
];

export function FlowStackMatrix() {
  return (
    <section id="replace" className="bg-surface py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
            All-in-one stack replacement
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl tracking-tight">
            Stop paying for a stack of disconnected tools.
          </h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
            Replace <span className="font-semibold text-navy">$2,347/month</span> in point solutions, broken
            Zapier webhooks, and separate logins with one unified AI-native operating system.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-border bg-background p-6 shadow-sm"
          >
            <p className="text-sm font-bold text-navy">What you&apos;re paying today</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {tools.map(([name, price], i) => (
                <motion.li
                  key={name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px]"
                >
                  <span className="flex items-center gap-2 text-muted-foreground line-through decoration-destructive/50">
                    <X className="size-3.5 shrink-0 text-destructive" />
                    {name}
                  </span>
                  <span className="font-semibold text-navy">{price}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-destructive/10 px-4 py-3.5">
              <span className="text-sm font-bold text-destructive">17 tools · 17 logins</span>
              <span className="text-xl font-extrabold text-destructive">$2,347/mo</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-primary/30 bg-navy-deep p-6 text-primary-foreground shadow-[0_40px_90px_-55px_var(--brand-deep)]"
          >
            <p className="text-sm font-bold text-brand-glow">Included in Fieseros</p>
            <ul className="mt-4 space-y-2">
              {[
                'CRM, leads & customer portal',
                'AI voice receptionist & omnichannel inbox',
                'Dispatch board, GPS routing & mobile PWA',
                'Quoting, invoicing & 0% tap-to-pay',
                'Forms, chatbots & booking pages (GPTForm™)',
                'Reviews, reactivation & marketing automation',
                'Reporting, workflows & native integrations',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-primary-foreground/85">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-glow" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-2xl bg-white/5 p-4 text-center border border-white/10">
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/60">One platform from</p>
              <p className="text-3xl font-extrabold text-brand-glow">$29/mo</p>
            </div>
            <a
              href="#pricing"
              className="mt-4 block rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-glow hover:text-navy-deep cursor-pointer"
            >
              See pricing
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

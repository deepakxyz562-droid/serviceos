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

export function FlowStackMatrix({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="replace" className="bg-slate-50/70 dark:bg-slate-900/60 py-24 border-b border-border relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex rounded-full bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
            All-in-one stack replacement
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Stop paying for a stack of disconnected tools.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Replace <span className="font-bold text-slate-900 dark:text-white">$2,347/month</span> in point solutions, broken
            Zapier webhooks, and separate logins with one unified AI-native operating system.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          {/* Old Stack */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-border bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
          >
            <p className="text-sm font-bold text-slate-900 dark:text-white">What you&apos;re paying today</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {tools.map(([name, price], i) => (
                <motion.li
                  key={name}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs sm:text-[13px]"
                >
                  <span className="flex items-center gap-2 text-muted-foreground line-through decoration-rose-500/60">
                    <X className="size-3.5 shrink-0 text-rose-500" />
                    {name}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{price}</span>
                </motion.li>
              ))}
            </ul>
            <div className="flex items-center justify-between rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3.5">
              <span className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-400">17 tools · 17 logins · Fragile Zaps</span>
              <span className="text-lg sm:text-xl font-extrabold text-rose-700 dark:text-rose-400">$2,347/mo</span>
            </div>
          </motion.div>

          {/* Fieseros All-in-One */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl border border-teal-500/40 bg-slate-900 text-white p-6 sm:p-7 shadow-2xl space-y-5"
          >
            <p className="text-sm font-bold text-teal-400">Included in Fieseros</p>
            <ul className="space-y-2.5">
              {[
                'CRM, leads & customer portal',
                'AI voice receptionist & omnichannel inbox',
                'Dispatch board, GPS routing & mobile PWA',
                'Quoting, invoicing & 0% tap-to-pay',
                'Forms, chatbots & booking pages (GPTForm™)',
                'Reviews, reactivation & marketing automation',
                'Reporting, workflows & native integrations',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-xs sm:text-[13.5px] text-slate-200">
                  <Check className="mt-0.5 size-4 shrink-0 text-teal-400 font-bold" /> {f}
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 text-center space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">One platform from</p>
              <p className="text-3xl font-extrabold text-teal-300">$29/mo</p>
            </div>

            <button
              type="button"
              onClick={onGetStarted}
              className="w-full rounded-full bg-teal-600 hover:bg-teal-500 py-3 text-center text-sm font-bold text-white transition-colors cursor-pointer shadow-lg"
            >
              See Pricing &amp; Start Free →
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

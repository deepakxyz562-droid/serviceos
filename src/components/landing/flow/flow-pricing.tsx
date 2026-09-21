'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Plan = {
  name: string;
  monthly: number | null;
  blurb: string;
  features: string[];
  popular?: boolean;
};

const plans: Plan[] = [
  {
    name: 'Free Forever',
    monthly: 0,
    blurb: 'Get your first jobs off paper.',
    features: ['100 lifetime jobs', '1 solo user', 'Quotes & invoices', 'Calendar & dispatch', 'Online booking link', '0% platform fee'],
  },
  {
    name: 'Starter',
    monthly: 29,
    blurb: 'For small crews getting organised.',
    features: ['Up to 5 users', 'Full trade CRM', 'Jobs & scheduling', 'Customer portals', 'Time tracking', '5 GB storage'],
  },
  {
    name: 'Professional',
    monthly: 79,
    blurb: 'The AI workhorse for growing teams.',
    popular: true,
    features: [
      'Up to 10 users',
      'Unlimited work orders',
      'Email + SMS + Push',
      'WhatsApp (BYO API)',
      'Omnichannel inbox',
      'AI assistant + quote generator',
      'Workflow & forms builder',
      '50 GB storage',
    ],
  },
  {
    name: 'Business',
    monthly: 149,
    blurb: 'Full autonomous operations.',
    features: ['Up to 25 users', 'AI receptionist (voice)', 'AI dispatcher', 'Live GPS fleet map', 'Inventory sync', '200 GB storage'],
  },
  {
    name: 'Enterprise',
    monthly: null,
    blurb: 'Multi-branch and franchise scale.',
    features: ['Unlimited users', 'White label branding', 'Dedicated support manager', 'Custom SLAs', 'SSO & audit logs'],
  },
];

export function FlowPricing({ onGetStarted }: { onGetStarted?: () => void }) {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="bg-background py-24 border-b border-border relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="mx-auto max-w-2xl text-center space-y-4">
          <span className="inline-flex rounded-full bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
            Pricing
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Simple, transparent pricing.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            No hidden setup fees. No percentage take rate on your payment transactions.
          </p>

          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-slate-100 dark:bg-slate-900 p-1 shadow-inner">
            {[
              { l: 'Monthly', v: false },
              { l: 'Yearly · save 17%', v: true },
            ].map((o) => (
              <button
                key={o.l}
                type="button"
                onClick={() => setYearly(o.v)}
                className={cn(
                  'rounded-full px-5 py-2 text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer',
                  yearly === o.v
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {plans.map((p, i) => {
            const price =
              p.monthly === null ? null : yearly ? Math.round(p.monthly * 0.83) : p.monthly;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className={cn(
                  'relative flex flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 shadow-lg',
                  p.popular
                    ? 'border-teal-500 bg-slate-900 text-white ring-2 ring-teal-500/30'
                    : 'border-border bg-white dark:bg-slate-900/90 hover:border-teal-500/40'
                )}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </span>
                )}
                <p className={cn('text-xs font-bold uppercase tracking-wider', p.popular ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400')}>
                  {p.name}
                </p>
                <p className={cn('mt-3 text-3xl font-extrabold', p.popular ? 'text-white' : 'text-slate-900 dark:text-white')}>
                  {price === null ? 'Custom' : `$${price}`}
                  {price !== null && (
                    <span className={cn('text-xs font-medium', p.popular ? 'text-slate-400' : 'text-muted-foreground')}>
                      /mo
                    </span>
                  )}
                </p>
                <p className={cn('mt-1.5 text-xs', p.popular ? 'text-slate-300' : 'text-muted-foreground')}>
                  {p.blurb}
                </p>
                <ul className="mt-5 flex-1 space-y-2 border-t border-border/70 pt-4">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className={cn(
                        'flex items-start gap-2 text-xs',
                        p.popular ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <Check className={cn('mt-0.5 size-3.5 shrink-0 font-bold', p.popular ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400')} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className={cn(
                    'mt-6 rounded-xl py-2.5 text-center text-xs font-bold transition-all cursor-pointer shadow-md',
                    p.popular
                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                      : 'border border-border bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
                  )}
                >
                  {p.monthly === null ? 'Talk to Sales' : p.monthly === 0 ? 'Start Free Forever' : 'Start Free Trial'}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

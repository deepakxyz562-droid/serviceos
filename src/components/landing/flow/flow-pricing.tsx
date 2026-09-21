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
    name: 'Free',
    monthly: 0,
    blurb: 'Get your first jobs off paper.',
    features: ['100 lifetime jobs', '1 solo user', 'Quotes & invoices', 'Calendar', 'Online booking'],
  },
  {
    name: 'Starter',
    monthly: 29,
    blurb: 'For small crews getting organised.',
    features: ['Up to 5 users', 'Full CRM', 'Jobs & scheduling', 'Customer portals', 'Time tracking', '5 GB storage'],
  },
  {
    name: 'Professional',
    monthly: 79,
    blurb: 'The AI workhorse for growing teams.',
    popular: true,
    features: [
      'Up to 10 users',
      'Unlimited jobs',
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
    features: ['Up to 25 users', 'AI receptionist (voice)', 'AI dispatcher', 'Live GPS map', 'Inventory', '200 GB storage'],
  },
  {
    name: 'Enterprise',
    monthly: null,
    blurb: 'Multi-branch and franchise scale.',
    features: ['Unlimited users', 'White label', 'Dedicated support', 'Custom SLAs', 'SSO & advanced security'],
  },
];

export function FlowPricing({ onGetStarted }: { onGetStarted?: () => void }) {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
            Pricing
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl tracking-tight">
            Simple, transparent pricing.
          </h2>

          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-xs">
            {[
              { l: 'Monthly', v: false },
              { l: 'Yearly · save 17%', v: true },
            ].map((o) => (
              <button
                key={o.l}
                onClick={() => setYearly(o.v)}
                className={cn(
                  'rounded-full px-5 py-2 text-[13px] font-semibold transition-colors cursor-pointer',
                  yearly === o.v ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-navy'
                )}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-5">
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
                  'relative flex flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1',
                  p.popular
                    ? 'border-primary bg-navy-deep text-primary-foreground shadow-[0_40px_90px_-50px_var(--brand-deep)]'
                    : 'border-border bg-surface hover:border-primary/30 shadow-sm'
                )}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                    Most popular
                  </span>
                )}
                <p className={cn('text-sm font-bold', p.popular ? 'text-brand-glow' : 'text-primary')}>
                  {p.name}
                </p>
                <p className={cn('mt-3 text-3xl font-extrabold', p.popular ? 'text-primary-foreground' : 'text-navy')}>
                  {price === null ? 'Custom' : `$${price}`}
                  {price !== null && (
                    <span className={cn('text-sm font-medium', p.popular ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      /mo
                    </span>
                  )}
                </p>
                <p className={cn('mt-2 text-[13px]', p.popular ? 'text-primary-foreground/65' : 'text-muted-foreground')}>
                  {p.blurb}
                </p>
                <ul className="mt-5 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className={cn(
                        'flex items-start gap-2 text-[13px]',
                        p.popular ? 'text-primary-foreground/85' : 'text-muted-foreground'
                      )}
                    >
                      <Check className={cn('mt-0.5 size-4 shrink-0', p.popular ? 'text-brand-glow' : 'text-primary')} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGetStarted}
                  className={cn(
                    'mt-6 rounded-full py-3 text-center text-sm font-semibold transition-colors cursor-pointer',
                    p.popular
                      ? 'bg-primary text-primary-foreground hover:bg-brand-glow hover:text-navy-deep'
                      : 'border border-border bg-background text-navy hover:border-primary/40 hover:bg-accent'
                  )}
                >
                  {p.monthly === null ? 'Talk to sales' : p.monthly === 0 ? 'Start free' : 'Start free trial'}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          All plans include{' '}
          <span className="font-semibold text-navy">0% platform commission</span>, email, SMS, push &amp;
          in-app notifications, live dispatch, and the technician mobile PWA.
        </p>
      </div>
    </section>
  );
}

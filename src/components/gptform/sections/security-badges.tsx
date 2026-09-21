'use client';

import {
  ShieldCheck,
  Lock,
  FileCheck,
  CreditCard,
  Globe,
  Accessibility,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Badge {
  name: string;
  description: string;
  icon: typeof ShieldCheck;
}

const BADGES: Badge[] = [
  {
    name: 'HIPAA',
    description: 'Healthcare data protection',
    icon: ShieldCheck,
  },
  {
    name: 'GDPR',
    description: 'EU privacy regulation compliant',
    icon: FileCheck,
  },
  {
    name: 'SOC 2 Type II',
    description: 'Audited security controls',
    icon: ShieldCheck,
  },
  {
    name: 'PCI DSS',
    description: 'Secure payment processing',
    icon: CreditCard,
  },
  {
    name: 'SSL/TLS 256-bit',
    description: 'End-to-end encryption',
    icon: Lock,
  },
  {
    name: 'WCAG 2.2 AA',
    description: 'Accessibility certified',
    icon: Accessibility,
  },
];

export function SecurityBadges() {
  return (
    <section className="w-full border-y border-border bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Eyebrow */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            <Globe className="size-3.5" />
            Enterprise-grade security &amp; compliance
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Built for sensitive data. Audited for trust.
          </h2>
        </div>

        {/* Badges grid */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.name}
                className={cn(
                  'group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center',
                  'transition-colors hover:border-teal-300 hover:bg-teal-50/50 dark:hover:border-teal-700 dark:hover:bg-teal-950/20'
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                  <Icon className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {badge.name}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          All form submissions, e-signatures, and payment data are encrypted at
          rest and in transit. Fieseros never stores your customers&apos; payment
          card details.
        </p>
      </div>
    </section>
  );
}

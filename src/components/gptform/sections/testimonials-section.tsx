'use client';

import {
  Clock,
  Calculator,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Accent = 'teal' | 'emerald' | 'amber';

interface UseCase {
  icon: typeof Clock;
  title: string;
  desc: string;
  bullet: string;
  accent: Accent;
}

const USE_CASES: UseCase[] = [
  {
    icon: Clock,
    title: 'Estimate-to-deposit in minutes',
    desc: 'Instead of a 3-day back-and-forth, customers describe their need, see a live-calculated quote, and pay the deposit in one sitting.',
    bullet: 'Faster intake → faster revenue',
    accent: 'teal',
  },
  {
    icon: Calculator,
    title: 'Live calculation engine',
    desc: 'Customers drag a slider, pick a material tier, toggle add-ons — and watch the price update in real time. No spreadsheets, no waiting.',
    bullet: 'Transparent, instant pricing',
    accent: 'emerald',
  },
  {
    icon: Workflow,
    title: 'One form replaces a stack',
    desc: 'Form builder + calculator + calendar booking + e-signature + Stripe payment + CRM lead sync — all in one GPTForm, no Zapier needed.',
    bullet: 'Fewer tools, lower cost',
    accent: 'amber',
  },
  {
    icon: MessageSquare,
    title: 'Conversational AI agent',
    desc: 'Customers chat naturally instead of filling a static form. The AI qualifies, captures photos, books a slot, and compiles structured data.',
    bullet: 'Higher completion, less friction',
    accent: 'teal',
  },
  {
    icon: CreditCard,
    title: '0% payment commission',
    desc: 'Deposits and payments go straight to your connected Stripe account. GPTForm takes zero commission — you keep 100% of every transaction.',
    bullet: 'Keep 100% of your money',
    accent: 'emerald',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise-grade capture',
    desc: 'E-signatures, photo annotations with canvas markup, SMS OTP verification, GPS geofence checks, and 256-bit SSL encryption on every submission.',
    bullet: 'Built for sensitive data',
    accent: 'amber',
  },
];

const ACCENT_STYLES: Record<
  Accent,
  { icon: string; bullet: string; ring: string }
> = {
  teal: {
    icon: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    bullet: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    ring: 'ring-teal-500/20',
  },
  emerald: {
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    bullet: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    ring: 'ring-emerald-500/20',
  },
  amber: {
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    bullet: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    ring: 'ring-amber-500/20',
  },
};

export function TestimonialsSection() {
  return (
    <section className="w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white py-20 sm:py-24 border-y border-border dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-teal-500/40 bg-teal-500/10 text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300"
          >
            Why teams choose GPTForm
          </Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Built for outcomes, not just data collection.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            Every GPTForm feature exists to move your customer from a question to a completed job — faster, with less friction.
          </p>
        </div>

        {/* Use cases grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((uc) => {
            const styles = ACCENT_STYLES[uc.accent];
            const Icon = uc.icon;
            return (
              <div
                key={uc.title}
                className={cn(
                  'flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground dark:bg-slate-900/60 p-6 ring-1 backdrop-blur shadow-sm',
                  styles.ring
                )}
              >
                <div className={cn('flex size-10 items-center justify-center rounded-xl', styles.icon)}>
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  {uc.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {uc.desc}
                </p>
                <div className="mt-4">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                      styles.bullet
                    )}
                  >
                    {uc.bullet}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

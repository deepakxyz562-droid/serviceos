'use client';

import { Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Accent = 'teal' | 'emerald' | 'amber';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  metric: string;
  initials: string;
  accent: Accent;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'GPTForm cut our estimate-to-deposit time from 3 days to 20 minutes. Quote conversion is up 40% since we switched from Jotform.',
    name: 'Marcus Webb',
    role: 'Owner, Webb Plumbing & Heating',
    metric: '+40% quote conversion',
    initials: 'MW',
    accent: 'teal',
  },
  {
    quote:
      'The live calculation engine lets customers see their roofing quote update in real time as they drag the slider. We close 1 in 3 forms now.',
    name: 'Diego Santos',
    role: 'Founder, Santos Roofing Co.',
    metric: '1 in 3 close rate',
    initials: 'DS',
    accent: 'emerald',
  },
  {
    quote:
      'We replaced Typeform + Calendly + Stripe + Zapier with one GPTForm. The 0% payment commission alone saves us £400/month.',
    name: 'Aisha Patel',
    role: 'Operations Director, CleanBright Services',
    metric: '£400/mo saved',
    initials: 'AP',
    accent: 'amber',
  },
];

const ACCENT_STYLES: Record<
  Accent,
  { badge: string; avatar: string; ring: string }
> = {
  teal: {
    badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    avatar: 'bg-teal-500 text-white',
    ring: 'ring-teal-500/20',
  },
  emerald: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    avatar: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-500/20',
  },
  amber: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    avatar: 'bg-amber-500 text-slate-950',
    ring: 'ring-amber-500/20',
  },
};

export function TestimonialsSection() {
  return (
    <section className="w-full bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-teal-500/40 bg-teal-500/10 text-[11px] font-semibold uppercase tracking-wider text-teal-300"
          >
            Customer Stories
          </Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Real businesses. Real results.
          </h2>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Service teams across 25+ trades switched to GPTForm and never looked
            back.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => {
            const styles = ACCENT_STYLES[t.accent];
            return (
              <figure
                key={t.name}
                className={cn(
                  'flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 ring-1 backdrop-blur',
                  styles.ring
                )}
              >
                <Quote className="size-6 text-slate-600" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-200 sm:text-base">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="mt-5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                      styles.badge
                    )}
                  >
                    {t.metric}
                  </span>
                </div>

                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-800 pt-5">
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full text-xs font-bold',
                      styles.avatar
                    )}
                  >
                    {t.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {t.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-500">
          Illustrative testimonials · representative of GPTForm customer outcomes
        </p>
      </div>
    </section>
  );
}

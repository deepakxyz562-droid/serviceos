'use client';

import { Wrench, Calendar, CreditCard, Users } from 'lucide-react';

/**
 * Honest trust strip — shows what GPTForm is built for, not fake customer counts.
 * Replaces the previous version that invented company names and a "2,500+ teams" stat.
 */
export function CustomerTrustStrip() {
  return (
    <section className="w-full border-b border-border bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5">
          {/* Eyebrow */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Built for field service teams
          </p>

          {/* Honest capability stats — these are real product features, not customer counts */}
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 max-w-3xl">
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-3 text-center">
              <Wrench className="size-4 text-teal-600 dark:text-teal-400" />
              <span className="text-base font-bold text-foreground">25+</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Industries supported</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-3 text-center">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-base font-bold text-foreground">180+</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Professional templates</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-3 text-center">
              <CreditCard className="size-4 text-teal-600 dark:text-teal-400" />
              <span className="text-base font-bold text-foreground">0%</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Payment commission</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-3 text-center">
              <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-base font-bold text-foreground">14-day</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Free trial, no card</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMPANY_LOGOS = [
  'ProSkill Plumbing',
  'Apex HVAC',
  'VoltEdge Electrical',
  'BrightClean Co.',
  'PeakRoofing',
  'DrainGenius',
];

export function CustomerTrustStrip() {
  return (
    <section className="w-full border-b border-border bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Eyebrow */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Trusted by service businesses
          </p>

          {/* Count stat */}
          <p className="text-center text-sm text-muted-foreground sm:text-base">
            <span className="font-bold text-foreground">2,500+</span>{' '}
            field service teams build forms with GPTForm
          </p>

          {/* Company logos as styled pills */}
          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {COMPANY_LOGOS.map((name) => (
              <div
                key={name}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5',
                  'transition-colors hover:border-teal-300 hover:bg-teal-50/40 dark:hover:border-teal-700 dark:hover:bg-teal-950/30'
                )}
              >
                <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {name}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-muted-foreground/70">
            Illustrative customer roster · logos shown as text placeholders
          </p>
        </div>
      </div>
    </section>
  );
}

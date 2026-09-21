'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Cell = 'yes' | 'no' | 'limited' | string;

interface Row {
  feature: string;
  gptform: Cell;
  typeform: Cell;
  jotform: Cell;
  tally: Cell;
}

const ROWS: Row[] = [
  {
    feature: 'AI form generation from prompts',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'no',
    tally: 'no',
  },
  {
    feature: 'Conversational / agent mode',
    gptform: 'yes',
    typeform: 'limited',
    jotform: 'no',
    tally: 'no',
  },
  {
    feature: 'Live calculation engine',
    gptform: 'yes',
    typeform: 'limited',
    jotform: 'yes',
    tally: 'yes',
  },
  {
    feature: 'Built-in calendar booking',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'no',
    tally: 'no',
  },
  {
    feature: 'E-signature capture',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'yes',
    tally: 'no',
  },
  {
    feature: 'Photo upload with annotations',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'limited',
    tally: 'no',
  },
  {
    feature: 'Direct Stripe payments',
    gptform: 'yes',
    typeform: 'yes',
    jotform: 'yes',
    tally: 'no',
  },
  {
    feature: 'Payment commission',
    gptform: '0%',
    typeform: '0%',
    jotform: '0%',
    tally: '0%',
  },
  {
    feature: 'Industry-specific widgets (18)',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'no',
    tally: 'no',
  },
  {
    feature: 'Workflow automation builder',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'limited',
    tally: 'no',
  },
  {
    feature: 'CRM lead sync',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'no',
    tally: 'no',
  },
  {
    feature: 'Free tier submissions',
    gptform: '100/mo',
    typeform: '10/mo',
    jotform: '100/mo',
    tally: 'Unlimited',
  },
  {
    feature: 'White-label embedding',
    gptform: 'yes',
    typeform: 'no',
    jotform: 'limited',
    tally: 'no',
  },
];

const COMPETITORS = ['Typeform', 'Jotform', 'Tally'] as const;

function CellDisplay({ value }: { value: Cell }) {
  if (value === 'yes') {
    return (
      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
        ✓
      </span>
    );
  }
  if (value === 'no') {
    return <span className="text-slate-400 dark:text-slate-500">✗</span>;
  }
  if (value === 'limited') {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Limited
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-foreground">{value}</span>
  );
}

export function ComparisonTable({
  onGetStarted,
}: {
  onGetStarted?: () => void;
}) {
  return (
    <section className="w-full bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
            Why switch to GPTForm
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            One platform replaces your entire form stack.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Stop paying for Typeform + Calendly + Stripe + Zapier. GPTForm does
            it all with 0% payment commission.
          </p>
        </div>

        {/* Table */}
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse overflow-hidden rounded-xl border border-border text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="w-[34%] px-4 py-3 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Feature
                </th>
                <th className="relative px-4 py-3 text-center align-bottom">
                  <div className="absolute inset-x-0 top-0 -top-px h-1 bg-teal-500" />
                  <div className="flex flex-col items-center gap-1">
                    <Badge className="bg-teal-600 text-[9px] uppercase tracking-wide text-white">
                      Recommended
                    </Badge>
                    <span className="text-sm font-bold text-foreground">
                      GPTForm
                    </span>
                  </div>
                </th>
                {COMPETITORS.map((c) => (
                  <th
                    key={c}
                    className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={cn(
                    'border-t border-border',
                    idx % 2 === 1 ? 'bg-muted/20' : 'bg-background'
                  )}
                >
                  <td className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    {row.feature}
                  </td>
                  <td className="bg-teal-50/60 px-4 py-3 text-center dark:bg-teal-950/30">
                    <CellDisplay value={row.gptform} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellDisplay value={row.typeform} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellDisplay value={row.jotform} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellDisplay value={row.tally} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3">
          <Button
            onClick={onGetStarted}
            className="bg-teal-600 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 sm:text-base"
            size="lg"
          >
            Start Free — No Credit Card
            <ArrowRight className="size-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground">
            100 free submissions / month · No card required · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

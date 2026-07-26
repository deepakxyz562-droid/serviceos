'use client';

/**
 * Shared "Coming Soon" placeholder used by all the new Business Owner
 * settings sections whose full UI is still being built.
 *
 * Each section passes its own:
 *   - title / icon / description (top of card)
 *   - bullet list of what will be configured (ConfiguredItems)
 *   - optional read-only info row (InfoRow) — e.g. current plan, 2FA status
 *
 * The card is intentionally information-rich so the section is still
 * useful as a "what does this do?" reference even before the form UI lands.
 */

import type { LucideIcon } from 'lucide-react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PlaceholderConfiguredItem {
  label: string;
  hint?: string;
}

export interface PlaceholderInfoRow {
  label: string;
  value: string;
  status?: 'ok' | 'warn' | 'muted';
}

interface SectionPlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'slate';
  configuredItems: PlaceholderConfiguredItem[];
  infoRows?: PlaceholderInfoRow[];
  ctaLabel?: string;
  onCta?: () => void;
}

const ACCENT_CLASSES: Record<NonNullable<SectionPlaceholderProps['accent']>, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300',
};

const STATUS_DOT: Record<NonNullable<PlaceholderInfoRow['status']>, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  muted: 'bg-slate-300',
};

export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
  accent = 'emerald',
  configuredItems,
  infoRows = [],
  ctaLabel,
  onCta,
}: SectionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${ACCENT_CLASSES[accent]}`}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {title}
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                    <Clock className="size-2.5 mr-0.5" /> Coming Soon
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">{description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            This section is configured but the full UI is coming soon. Below is a preview of
            what you&apos;ll be able to manage here.
          </p>

          {/* What will be configured */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              What you&apos;ll configure here
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {configuredItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30"
                >
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.hint && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {item.hint}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Read-only info rows (current state) */}
          {infoRows.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Current state
              </p>
              <div className="rounded-lg border divide-y">
                {infoRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-medium flex items-center gap-2">
                      {row.status && (
                        <span className={`size-1.5 rounded-full ${STATUS_DOT[row.status]}`} aria-hidden />
                      )}
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional CTA */}
          {ctaLabel && onCta && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onCta}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

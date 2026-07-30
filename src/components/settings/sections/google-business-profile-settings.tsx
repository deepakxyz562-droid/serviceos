'use client';

/**
 * Google Business Profile Settings section.
 *
 * UI-only marketing-style card (no real Google OAuth) — matches the spec the
 * user provided verbatim:
 *   - Headline: "Get 3x more leads by improving your Google ranking"
 *   - 2-column stats: 42 leads (TODAY) vs 126 leads (With optimized profile, 12-month projection)
 *   - 3 benefit bullets with check icons
 *   - 2 CTA buttons: "Create Google Profile" (emerald primary) + "Connect Existing Profile" (outline)
 *   - Both CTAs open a "coming soon" dialog
 *
 * Style follows the same pattern as company-settings.tsx (emerald accents,
 * `space-y-6` rhythm, Card + shadow-sm, mobile-first responsive, dark-mode).
 */

import { useState } from 'react';
import { Check, Store, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const BENEFITS = [
  'Get more clicks from people ready to book',
  'Show up higher in local searches',
  'Build trust with polished business info',
];

export function GoogleBusinessProfileSettings() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Hero headline + description */}
      <Card className="overflow-hidden border shadow-sm">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Store className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Get 3x more leads by improving your Google ranking
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Creating a Google business profile — or improving your existing one — with Jobber can
              help you reach 3x more leads so you win more work.
            </p>
          </div>

          {/* Stats: 2-column grid (stacks on mobile) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left card: TODAY */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Today
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">42</span>
                <span className="text-sm font-medium text-muted-foreground">leads</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">monthly leads</p>
            </div>

            {/* Right card: WITH OPTIMIZED PROFILE (emerald accent) */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/15">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                <TrendingUp className="size-3.5" />
                With optimized profile
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                  126
                </span>
                <span className="text-sm font-medium text-emerald-700/80 dark:text-emerald-300/80">
                  leads
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                12 month projection · monthly leads
              </p>
            </div>
          </div>

          {/* Pitch paragraph + benefit bullets */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We&apos;ll create an optimized Google listing for you to review, so you can attract
              more high-quality leads.
            </p>
            <ul className="space-y-2.5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Google Profile
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setConnectDialogOpen(true)}
            >
              Connect Existing Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Google Profile dialog — coming soon */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Google Profile</DialogTitle>
            <DialogDescription>
              This feature will connect your Google Business Profile. Setup wizard coming soon.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setCreateDialogOpen(false);
                toast.info('Google Business Profile setup wizard is coming soon.');
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Existing Profile dialog — coming soon */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Existing Profile</DialogTitle>
            <DialogDescription>
              This feature will connect your Google Business Profile. Setup wizard coming soon.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConnectDialogOpen(false);
                toast.info('Google Business Profile setup wizard is coming soon.');
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

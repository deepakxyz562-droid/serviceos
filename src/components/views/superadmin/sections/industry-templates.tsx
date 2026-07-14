'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Industry Templates — pre-built industry configurations (forms, services,
// workflows, branding) that new workspaces can install during onboarding.
// ─────────────────────────────────────────────────────────────────────────────

import {
  LayoutGrid, Store, Wind, Sparkles, Wrench, Zap, Flower2, HeartPulse, HardHat, Trees, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import { SectionHeader, DemoDataPill } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

interface TemplateCard {
  name: string;
  icon: LucideIcon;
  color: string;
  installs: number;
}

const TEMPLATES: TemplateCard[] = [
  { name: 'HVAC Services', icon: Wind, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', installs: 128 },
  { name: 'Salon & Spa', icon: Sparkles, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', installs: 96 },
  { name: 'Repair Shop', icon: Wrench, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', installs: 72 },
  { name: 'Electrical', icon: Zap, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', installs: 64 },
  { name: 'Florist', icon: Flower2, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', installs: 41 },
  { name: 'Healthcare Clinic', icon: HeartPulse, color: 'bg-red-500/10 text-red-600 dark:text-red-400', installs: 38 },
  { name: 'Construction', icon: HardHat, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', installs: 33 },
  { name: 'Landscaping', icon: Trees, color: 'bg-green-500/10 text-green-600 dark:text-green-400', installs: 27 },
];

interface RecentlyUsed {
  template: string;
  workspace: string;
  color: string;
}

const RECENTLY_USED: RecentlyUsed[] = [
  { template: 'HVAC Services', workspace: 'Acme HVAC', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { template: 'Salon & Spa', workspace: 'Bella Salon', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { template: 'Electrical', workspace: 'VoltEdge Electric', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { template: 'Construction', workspace: 'Skyline Roofing', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function IndustryTemplatesSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Industry Templates"
        description="Pre-built industry configurations — quick deploy to new workspaces."
        icon={LayoutGrid}
        actions={<DemoDataPill />}
      />

      {/* Info banner */}
      <Card className="card-shadow border-primary/30 bg-primary/5">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Store className="size-5" />
          </div>
          <p className="text-sm text-foreground/80 flex-1">
            Industry templates are curated configurations of forms, services, workflows, and branding for specific industries.
            New workspaces can install these during onboarding.
          </p>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => toast.info('Opening marketplace...')}>
            Browse Marketplace <ArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Available templates */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Available Industry Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <Card key={t.name} className="card-shadow card-hover flex flex-col">
              <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
                <div className={cn('size-11 rounded-xl flex items-center justify-center mb-3', t.color)}>
                  <t.icon className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1">12 forms · 8 workflows · 14 services</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-mono font-medium text-foreground">{t.installs}</span> installs
                  </span>
                  <Badge variant="secondary" className="text-[10px]">v2.1</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => toast.success(`${t.name} template ready for new workspaces`)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recently used */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Recently Used</CardTitle>
          <CardDescription>Templates most recently applied to new workspaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {RECENTLY_USED.map((r, idx) => (
              <div key={r.workspace} className="flex items-center gap-3">
                {idx > 0 && <Separator orientation="vertical" className="h-10" />}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/30 min-w-[200px]">
                  <span className={cn('size-2 rounded-full', r.color.split(' ')[0])} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{r.template}</p>
                    <p className="text-[11px] text-muted-foreground truncate">→ {r.workspace}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

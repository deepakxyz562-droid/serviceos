'use client';

// Industry Packs Marketplace — flagship superadmin section. One-click install
// of complete business templates (forms, services, workflows, automations,
// checklists, documents, branding) for HVAC, Cleaning, Plumbing, Electrical,
// Beauty, Healthcare, Construction, and Landscaping industries.

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Store, Wind, Sparkles, Wrench, Zap, Flower2, HeartPulse, HardHat, Trees,
  Star, Download, Check, Settings, Trash2, DollarSign, TrendingUp,
  Search, Upload, PackageOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  SectionHeader, DemoDataPill, KpiCard, EmptyState, formatCurrency, type KpiColor,
} from '@/components/views/superadmin/_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IndustryPack {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  gradient: string;       // Tailwind gradient stops (theme-token-safe, light + dark)
  iconColor: string;      // Tailwind text color class for the icon overlay
  templates: number;
  workflows: number;
  forms: number;
  rating: number;
  installs: string;
  installsRaw: number;
  price: number | 'Free';
  industry: string;
}

interface RevenueRow {
  pack: string;
  industry: string;
  installs: string;
  installsRaw: number;
  revenue: number;
  rating: number;
}

interface RevenueKpi {
  label: string;
  value: string;
  trend?: number;
  color: KpiColor;
  icon: LucideIcon;
  sub: string;
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const PACKS: IndustryPack[] = [
  {
    id: 'hvac-pro', name: 'HVAC Pro Pack', industry: 'HVAC',
    description: 'Complete field-service template for HVAC companies — service calls, maintenance contracts, equipment tracking, and seasonal tune-up workflows.',
    icon: Wind, gradient: 'from-sky-500/20 to-sky-500/5', iconColor: 'text-sky-600 dark:text-sky-400',
    templates: 24, workflows: 8, forms: 12, rating: 4.8, installs: '1.2K', installsRaw: 1200, price: 49,
  },
  {
    id: 'cleaning-service', name: 'Cleaning Service Pack', industry: 'Cleaning',
    description: 'Everything a residential or commercial cleaning business needs — recurring jobs, checklists, supply tracking, and customer satisfaction surveys.',
    icon: Sparkles, gradient: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-600 dark:text-emerald-400',
    templates: 18, workflows: 6, forms: 9, rating: 4.9, installs: '2.4K', installsRaw: 2400, price: 'Free',
  },
  {
    id: 'plumbing-pro', name: 'Plumbing Pro Pack', industry: 'Plumbing',
    description: 'Plumbing operations made simple — emergency dispatch, drain cleaning workflows, fixture catalogs, and after-service inspection checklists.',
    icon: Wrench, gradient: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-600 dark:text-blue-400',
    templates: 22, workflows: 7, forms: 11, rating: 4.6, installs: '890', installsRaw: 890, price: 49,
  },
  {
    id: 'electrical-pro', name: 'Electrical Pro Pack', industry: 'Electrical',
    description: 'Licensed electrician toolkit — code-compliant service templates, panel upgrade workflows, safety checklists, and permit-ready documents.',
    icon: Zap, gradient: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-600 dark:text-amber-400',
    templates: 20, workflows: 9, forms: 10, rating: 4.7, installs: '1.1K', installsRaw: 1100, price: 49,
  },
  {
    id: 'beauty-salon', name: 'Beauty & Salon Pack', industry: 'Beauty',
    description: 'Salon and spa management — appointment booking, stylist schedules, treatment menus, loyalty programs, and branded intake forms.',
    icon: Flower2, gradient: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-600 dark:text-rose-400',
    templates: 16, workflows: 5, forms: 8, rating: 4.9, installs: '1.8K', installsRaw: 1800, price: 39,
  },
  {
    id: 'healthcare-clinic', name: 'Healthcare Clinic Pack', industry: 'Healthcare',
    description: 'HIPAA-ready templates for clinics — patient intake, telehealth workflows, prescription tracking, and compliance audit checklists.',
    icon: HeartPulse, gradient: 'from-red-500/20 to-red-500/5', iconColor: 'text-red-600 dark:text-red-400',
    templates: 32, workflows: 12, forms: 18, rating: 4.5, installs: '540', installsRaw: 540, price: 99,
  },
  {
    id: 'construction-pro', name: 'Construction Pro Pack', industry: 'Construction',
    description: 'Job-site and project management for contractors — RFI workflows, daily logs, safety toolbox talks, and OSHA-compliant inspection forms.',
    icon: HardHat, gradient: 'from-orange-500/20 to-orange-500/5', iconColor: 'text-orange-600 dark:text-orange-400',
    templates: 28, workflows: 10, forms: 14, rating: 4.4, installs: '720', installsRaw: 720, price: 79,
  },
  {
    id: 'landscaping-pro', name: 'Landscaping Pro Pack', industry: 'Landscaping',
    description: 'Lawn care and landscaping operations — route optimization, seasonal service plans, crew dispatch, and equipment maintenance schedules.',
    icon: Trees, gradient: 'from-green-500/20 to-green-500/5', iconColor: 'text-green-600 dark:text-green-400',
    templates: 19, workflows: 6, forms: 9, rating: 4.7, installs: '1.0K', installsRaw: 1000, price: 39,
  },
];

// Pre-installed pack IDs (seed for the "Installed" tab demo content).
const INITIALLY_INSTALLED: string[] = ['cleaning-service', 'hvac-pro', 'electrical-pro'];

const REVENUE_KPIS: RevenueKpi[] = [
  { label: 'Total Revenue', value: '$48,392', trend: 18, color: 'emerald', icon: DollarSign, sub: 'Last 30 days' },
  { label: 'Top Pack', value: 'Cleaning Service Pack', color: 'sky', icon: TrendingUp, sub: '2.4K installs' },
  { label: 'Avg Rating', value: '4.7 ★', color: 'amber', icon: Star, sub: 'Across all packs · +0.2 vs last month' },
];

const TOP_PACKS_REVENUE: RevenueRow[] = [
  { pack: 'Beauty & Salon Pack', industry: 'Beauty', installs: '1.8K', installsRaw: 1800, revenue: 12400, rating: 4.9 },
  { pack: 'HVAC Pro Pack', industry: 'HVAC', installs: '1.2K', installsRaw: 1200, revenue: 11800, rating: 4.8 },
  { pack: 'Construction Pro Pack', industry: 'Construction', installs: '720', installsRaw: 720, revenue: 9200, rating: 4.4 },
  { pack: 'Electrical Pro Pack', industry: 'Electrical', installs: '1.1K', installsRaw: 1100, revenue: 7400, rating: 4.7 },
  { pack: 'Healthcare Clinic Pack', industry: 'Healthcare', installs: '540', installsRaw: 540, revenue: 5800, rating: 4.5 },
];

const MAX_INSTALLS_RAW = Math.max(...TOP_PACKS_REVENUE.map((r) => r.installsRaw));

const PUBLISH_INDUSTRIES: string[] = [
  'HVAC', 'Cleaning', 'Plumbing', 'Electrical', 'Beauty',
  'Healthcare', 'Construction', 'Landscaping', 'Other',
];

// ─── Pack card ───────────────────────────────────────────────────────────────

interface PackCardProps {
  pack: IndustryPack;
  installed: boolean;
  variant: 'browse' | 'installed';
  onInstall: (pack: IndustryPack) => void;
  onUninstall: (pack: IndustryPack) => void;
  onConfigure: (pack: IndustryPack) => void;
}

function PackCard({ pack, installed, variant, onInstall, onUninstall, onConfigure }: PackCardProps) {
  const Icon = pack.icon;
  return (
    <Card className="card-shadow card-hover overflow-hidden flex flex-col">
      {/* Industry-themed gradient header strip */}
      <div className={cn('h-20 bg-gradient-to-br relative flex items-center justify-center', pack.gradient)}>
        <Icon className={cn('size-9', pack.iconColor)} />
      </div>

      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight">{pack.name}</h3>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pack.description}</p>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {pack.templates} templates · {pack.workflows} workflows · {pack.forms} forms
        </p>

        {/* Footer: rating · installs · price badge */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {pack.rating}
          </span>
          <span aria-hidden>·</span>
          <span>{pack.installs} installs</span>
          <span className="ml-auto">
            {pack.price === 'Free' ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Free
              </Badge>
            ) : (
              <Badge variant="outline">${pack.price}</Badge>
            )}
          </span>
        </div>

        {/* Action area */}
        <div className="mt-auto pt-1">
          {variant === 'browse' ? (
            installed ? (
              <Button
                variant="outline"
                disabled
                className="w-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              >
                <Check className="size-4" /> Installed
              </Button>
            ) : (
              <Button className="w-full" onClick={() => onInstall(pack)}>
                <Download className="size-4" /> Install Pack
              </Button>
            )
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                disabled
                className="w-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              >
                <Check className="size-4" /> Installed
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onConfigure(pack)}
                >
                  <Settings className="size-3.5" /> Configure
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  onClick={() => onUninstall(pack)}
                >
                  <Trash2 className="size-3.5" /> Uninstall
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Publish dialog ───────────────────────────────────────────────────────────

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PublishDialog({ open, onOpenChange }: PublishDialogProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onOpenChange(false);
    toast.success('Submitted for review');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish Your Industry Pack</DialogTitle>
          <DialogDescription>
            Submit a complete pack — forms, workflows, automations, checklists, documents, and branding —
            for review. Our team reviews submissions within 5 business days.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pack-name">Pack name</Label>
            <Input id="pack-name" placeholder="e.g. Pet Grooming Pro Pack" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pack-industry">Industry</Label>
            <Select required>
              <SelectTrigger id="pack-industry" className="w-full">
                <SelectValue placeholder="Select an industry" />
              </SelectTrigger>
              <SelectContent>
                {PUBLISH_INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pack-desc">Description</Label>
            <Textarea
              id="pack-desc"
              placeholder="Describe what's included in your pack — templates, workflows, forms, branding assets..."
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Upload className="size-4" /> Submit for Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main section ────────────────────────────────────────────────────────────

export function MarketplaceSection() {
  const [installed, setInstalled] = useState<Set<string>>(() => new Set(INITIALLY_INSTALLED));
  const [search, setSearch] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);

  const handleInstall = (pack: IndustryPack) => {
    setInstalled((prev) => {
      const next = new Set(prev);
      next.add(pack.id);
      return next;
    });
    toast.success(`Pack installed: ${pack.name}`);
  };

  const handleUninstall = (pack: IndustryPack) => {
    setInstalled((prev) => {
      const next = new Set(prev);
      next.delete(pack.id);
      return next;
    });
    toast.success('Pack uninstalled');
  };

  const handleConfigure = (pack: IndustryPack) => {
    toast.info(`Opening configuration for ${pack.name}`);
  };

  const filteredPacks = PACKS.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.industry.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const installedPacks = PACKS.filter((p) => installed.has(p.id));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Industry Packs Marketplace"
        description="One-click install of complete business templates — forms, services, workflows, checklists, branding."
        icon={Store}
        actions={
          <>
            <DemoDataPill />
            <Button variant="outline" onClick={() => setPublishOpen(true)}>
              <Upload className="size-4" /> Publish Pack
            </Button>
          </>
        }
      />

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">
            <Store className="size-3.5" /> Browse
          </TabsTrigger>
          <TabsTrigger value="installed">
            <PackageOpen className="size-3.5" /> Installed ({installedPacks.length})
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <DollarSign className="size-3.5" /> Revenue
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Browse ─────────────────────────────────────────── */}
        <TabsContent value="browse" className="space-y-4 outline-none">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search packs by name, industry, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search industry packs"
            />
          </div>

          {filteredPacks.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No packs found"
              subtitle={`No packs match "${search}". Try a different keyword or clear the search.`}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  installed={installed.has(pack.id)}
                  variant="browse"
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  onConfigure={handleConfigure}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Installed ──────────────────────────────────────── */}
        <TabsContent value="installed" className="space-y-4 outline-none">
          {installedPacks.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No packs installed"
              subtitle="Browse the marketplace to install your first industry pack."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {installedPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  installed
                  variant="installed"
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                  onConfigure={handleConfigure}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Revenue ────────────────────────────────────────── */}
        <TabsContent value="revenue" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REVENUE_KPIS.map((kpi) => (
              <KpiCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                color={kpi.color}
                icon={kpi.icon}
                sub={kpi.sub}
              />
            ))}
          </div>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Top Packs by Revenue</CardTitle>
              <CardDescription>
                Ranked by gross revenue over the last 30 days across all tenants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2.5 pr-4 font-medium">Pack</th>
                      <th className="py-2.5 pr-4 font-medium">Industry</th>
                      <th className="py-2.5 pr-4 font-medium w-56">Installs</th>
                      <th className="py-2.5 pr-4 font-medium">Revenue</th>
                      <th className="py-2.5 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_PACKS_REVENUE.map((row) => (
                      <tr key={row.pack} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">{row.pack}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{row.industry}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground tabular-nums w-12">{row.installs}</span>
                            <Progress
                              value={(row.installsRaw / MAX_INSTALLS_RAW) * 100}
                              className="h-1.5 w-24"
                            />
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-foreground tabular-nums">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {row.rating}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} />
    </div>
  );
}

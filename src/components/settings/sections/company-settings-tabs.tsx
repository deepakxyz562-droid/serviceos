'use client';

/**
 * CompanySettingsTabs — unified Company settings surface.
 *
 * Collapses 4 previously-separate sidebar sections into horizontal tabs:
 *   1. Company Information — existing CompanySettings + BusinessProfileSettings
 *   2. Branding           — NEW BrandingSettings (colors, font, footer, white-label)
 *   3. Brand Brain        — existing BrandBrainView
 *   4. Marketplace        — existing MarketplaceSettings
 *
 * Why: the user observed that having Business Profile, Brand Kit, Brand Brain,
 * and Marketplace as separate top-level sidebar entries creates confusion about
 * "where do I change my logo / business name / phone number". Grouping them
 * under one Company section with tabs makes the conceptual ownership clear.
 *
 * Backwards compatibility: accepts an `initialTab` prop so old deep links
 * (e.g. ?section=brand-brain) can pre-select the right tab.
 */

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Palette, Brain, Store, Sparkles, SlidersHorizontal, CheckCircle2, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CompanySettings } from '@/components/settings/sections/company-settings';
import { BrandingSettings } from '@/components/settings/sections/branding-settings';
import { BrandBrainView } from '@/components/views/tenant/brand-brain-view';
import { MarketplaceSettings } from '@/components/settings/sections/marketplace-settings';
import { BusinessBlueprintWizard } from '@/components/onboarding/business-blueprint-wizard';
import { performClientLogout } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

type CompanyTab = 'information' | 'branding' | 'brand-brain' | 'marketplace' | 'blueprint';

interface CompanySettingsTabsProps {
  initialTab?: CompanyTab;
  onSaved?: () => void;
}

/**
 * Normalize legacy kebab-case industry values to the canonical Title-Case
 * form. Mirrors the normalizer inside company-settings.tsx + settings-view.tsx
 * so the Marketplace tab receives the same value the Company form just saved.
 */
function normalizeIndustry(value: string): string {
  if (!value) return '';
  const map: Record<string, string> = {
    'home-services': 'Home Services',
    'packers-movers': 'Moving',
    'plumbing': 'Plumbing',
    'cleaning': 'Cleaning',
    'window-cleaning': 'Cleaning',
    'pest-control': 'Pest Control',
    'hvac': 'HVAC',
    'electrical': 'Electrical',
    'landscaping': 'Landscaping',
    'courier': 'Moving',
    'home-repair': 'Home Services',
    'salon-beauty': 'Other',
    'roofing': 'Roofing',
    'painting': 'Painting',
  };
  return map[value.toLowerCase()] || value;
}

export function CompanySettingsTabs({ initialTab = 'information', onSaved }: CompanySettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<CompanyTab>(initialTab);

  // ── Shared tenant snapshot ────────────────────────────────────────────
  // MarketplaceSettings needs tenantId / industry / slug for its URL preview
  // + a `loading` flag for the skeleton state. Rather than read from the
  // global app store (where `tenant` is nested at `auth.tenant` and is not
  // guaranteed to be hydrated when this tab mounts), we fetch /api/auth/me
  // ourselves — mirroring the existing pattern in settings-view.tsx.
  const [tenantSnapshot, setTenantSnapshot] = useState<{
    id: string | null;
    industry: string;
    slug: string;
  }>({ id: null, industry: '', slug: '' });
  const [tenantLoading, setTenantLoading] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const refreshTenant = useCallback(async () => {
    setTenantLoading(true);
    try {
      const res = await fetch('/api/auth/me?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant;
        if (t) {
          setTenantSnapshot({
            id: t.id,
            industry: normalizeIndustry(t.industry || ''),
            slug: t.slug || '',
          });
        }
        // Detect platform admin: superadmin flag, superadmin role, or admin
        // role without a tenantId (the legacy platform-admin pattern).
        const u = data.user;
        if (u) {
          const platformAdmin =
            u.isSuperAdmin === true ||
            u.role === 'superadmin' ||
            u.role === 'super_admin' ||
            (u.role === 'admin' && !u.tenantId);
          setIsPlatformAdmin(platformAdmin);
        }
      }
    } catch {
      // silently fail — Marketplace tab will render its "no tenant" state
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTenant();
  }, [refreshTenant]);

  const { auth, blueprint, countryPack } = useAppStore();
  const [blueprintWizardOpen, setBlueprintWizardOpen] = useState(false);
  const isStandalone =
    !isPlatformAdmin &&
    (!auth.user?.tenantId ||
     (auth.tenant as any)?.signupMode === 'standalone' ||
     (auth.tenant as any)?.plan === 'standalone_starter' ||
     (auth.tenant as any)?.plan === 'standalone_business' ||
     (auth.tenant as any)?.productType === 'forms' ||
     (auth.workspace as any)?.productType === 'forms' ||
     String((auth.tenant as any)?.plan || '').startsWith('standalone') ||
     (auth.user as any)?.role === 'standalone_user');

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CompanyTab)} className="w-full">
        <TabsList className="bg-muted/60 h-auto p-1 overflow-x-auto">
          <TabsTrigger value="information" className="gap-1.5">
            <Building2 className="size-3.5" />
            Company Information
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="size-3.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="brand-brain" className="gap-1.5">
            <Brain className="size-3.5" />
            Brand Brain
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="size-3.5" />
            Marketplace
          </TabsTrigger>
          {isStandalone && (
            <TabsTrigger value="blueprint" className="gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
              <Sparkles className="size-3.5" />
              Business Blueprint
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="information" className="mt-6">
          <CompanySettings onSaved={() => {
            void refreshTenant();
            onSaved?.();
          }} />
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="brand-brain" className="mt-6">
          <BrandBrainView />
        </TabsContent>

        <TabsContent value="marketplace" className="mt-6">
          <MarketplaceSettings
            tenantId={tenantSnapshot.id}
            industry={tenantSnapshot.industry}
            slug={tenantSnapshot.slug}
            loading={tenantLoading}
            isPlatformAdmin={isPlatformAdmin}
            onSaved={onSaved}
          />
        </TabsContent>

        {isStandalone && (
          <TabsContent value="blueprint" className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Business Operating Blueprint</h3>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-xs uppercase">
                      {blueprint?.businessType || 'RETAIL'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Customize your industry vertical, multi-channel selling methods, and active modules.
                  </p>
                </div>
                <Button
                  onClick={() => setBlueprintWizardOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0"
                >
                  <SlidersHorizontal className="size-4" />
                  Customize Blueprint
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Business Vertical</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white capitalize">
                    {blueprint?.businessType ? blueprint.businessType.replace('_', ' ') : 'Retail / Kirana'}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Tailors dashboard, navigation, and core workflows
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Sales Channels</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(blueprint?.salesChannels && blueprint.salesChannels.length > 0 ? blueprint.salesChannels : ['in_store']).map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-xs capitalize">
                        {ch.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Regional Pack</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {countryPack?.countryCode || 'US'} ({countryPack?.currency || 'USD'})
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Auto-configured tax rates, invoice formats & nomenclature
                  </span>
                </div>
              </div>

              {blueprint?.capabilities && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Modules & Capabilities</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Object.entries(blueprint.capabilities).map(([key, enabled]) => (
                      <div
                        key={key}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border text-xs',
                          enabled
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-700 dark:text-slate-300'
                            : 'opacity-40 bg-muted/40 border-slate-200 dark:border-slate-800'
                        )}
                      >
                        <CheckCircle2 className={cn('size-3.5', enabled ? 'text-emerald-600' : 'text-slate-400')} />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <BusinessBlueprintWizard
              open={blueprintWizardOpen}
              onOpenChange={setBlueprintWizardOpen}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Account / Session row with Sign Out for quick mobile & desktop access */}
      <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-emerald-600 text-white font-semibold text-xs">
              {auth.user?.name ? auth.user.name.slice(0, 2).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {auth.user?.name || 'Account Owner'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {auth.user?.email || 'Logged in'}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void performClientLogout()}
          className="gap-2 shrink-0 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/40 font-semibold cursor-pointer"
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

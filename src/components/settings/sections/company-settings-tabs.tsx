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
import { Building2, Palette, Brain, Store } from 'lucide-react';
import { CompanySettings } from '@/components/settings/sections/company-settings';
import { BusinessProfileSettings } from '@/components/settings/sections/business-profile-section';
import { BrandingSettings } from '@/components/settings/sections/branding-settings';
import { BrandBrainView } from '@/components/views/tenant/brand-brain-view';
import { MarketplaceSettings } from '@/components/settings/sections/marketplace-settings';

type CompanyTab = 'information' | 'branding' | 'brand-brain' | 'marketplace';

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
        </TabsList>

        <TabsContent value="information" className="mt-6 space-y-8">
          {/* CompanySettings owns: name, industry, currency, phone, email, address */}
          <CompanySettings onSaved={() => {
            void refreshTenant();
            onSaved?.();
          }} />
          {/* BusinessProfileSettings owns: logo, tagline, description, hours */}
          <div className="border-t pt-8">
            <BusinessProfileSettings onSaved={onSaved} />
          </div>
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
      </Tabs>
    </div>
  );
}

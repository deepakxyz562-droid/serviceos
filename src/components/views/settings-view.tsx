'use client';

/**
 * SettingsView — thin config-driven shell for the Business Owner
 * Settings surface.
 *
 * Renders:
 *   - A page header showing the active section's icon + label + description
 *   - A command-palette-style SettingsSearch at the top
 *   - A left SettingsSidebar (sticky on desktop, Sheet drawer on mobile)
 *   - The active section's component on the right
 *
 * All 14 sections are declared in `settings-config.ts`. Existing tabs
 * (Company, Users/Roles, Integrations, Hub, AI Voice) are preserved
 * verbatim — they now live in their own section components under
 * `src/components/settings/sections/`. New sections (CRM, Jobs,
 * Finance, Customers, Communication, Automations, Security, Developer,
 * Billing) render a "Coming Soon" placeholder card with a preview of
 * what will be configured there.
 *
 * The only shared state at this level is the active section id + the
 * tenant snapshot (tenantId / industry / slug) used by the Marketplace
 * section. The Company section calls `refreshTenant` after a successful
 * save so the Marketplace section's URL preview stays in sync.
 */

import { useState, useEffect, useCallback } from 'react';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { SettingsSearch } from '@/components/settings/settings-search';
import { getSettingsSection } from '@/components/settings/settings-config';
import { getSettingsIcon } from '@/components/settings/settings-icons';

import { CompanySettings } from '@/components/settings/sections/company-settings';
import { MarketplaceSettings } from '@/components/settings/sections/marketplace-settings';
import { CrmSettings } from '@/components/settings/sections/crm-settings';
import { JobsSchedulingSettings } from '@/components/settings/sections/jobs-scheduling-settings';
import { FinanceSettings } from '@/components/settings/sections/finance-settings';
import { TeamSettings } from '@/components/settings/sections/team-settings';
import { CustomersSettings } from '@/components/settings/sections/customers-settings';
import { CommunicationSettings } from '@/components/settings/sections/communication-settings';
import { AiSettings } from '@/components/settings/sections/ai-settings';
import { IntegrationsSettings } from '@/components/settings/sections/integrations-settings';
import { AutomationsSettings } from '@/components/settings/sections/automations-settings';
import { SecuritySettings } from '@/components/settings/sections/security-settings';
import { DeveloperSettings } from '@/components/settings/sections/developer-settings';
import { BillingSettings } from '@/components/settings/sections/billing-settings';

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Normalize legacy kebab-case industry values to the canonical Title-Case
 * form. Mirrors the normalizer inside company-settings.tsx so the
 * Marketplace section receives the same value the Company form just saved.
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

// ─── Component ─────────────────────────────────────────────────────────────

export function SettingsView() {
  const [activeSection, setActiveSection] = useState('company');

  // Shared tenant snapshot — Marketplace section needs tenantId/industry/slug
  // for its URL preview. Company section owns its own form state but calls
  // `refreshTenant` after a successful save so this snapshot stays in sync.
  const [tenant, setTenant] = useState<{
    id: string | null;
    industry: string;
    slug: string;
  }>({ id: null, industry: '', slug: '' });
  const [tenantLoading, setTenantLoading] = useState(true);

  const refreshTenant = useCallback(async () => {
    setTenantLoading(true);
    try {
      const res = await fetch('/api/auth/me?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant;
        if (t) {
          setTenant({
            id: t.id,
            industry: normalizeIndustry(t.industry || ''),
            slug: t.slug || '',
          });
        }
      }
    } catch {
      // silently fail — Marketplace section will render its "no tenant" state
    } finally {
      setTenantLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTenant();
  }, [refreshTenant]);

  const activeConfig = getSettingsSection(activeSection);
  const ActiveIcon = activeConfig ? getSettingsIcon(activeConfig.icon) : null;

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'company':
        return <CompanySettings onSaved={refreshTenant} />;
      case 'marketplace':
        return (
          <MarketplaceSettings
            tenantId={tenant.id}
            industry={tenant.industry}
            slug={tenant.slug}
            loading={tenantLoading}
          />
        );
      case 'crm':
        return <CrmSettings />;
      case 'jobs-scheduling':
        return <JobsSchedulingSettings />;
      case 'finance':
        return <FinanceSettings />;
      case 'team':
        return <TeamSettings />;
      case 'customers':
        return <CustomersSettings />;
      case 'communication':
        return <CommunicationSettings />;
      case 'ai':
        return <AiSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'automations':
        return <AutomationsSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'developer':
        return <DeveloperSettings />;
      case 'billing':
        return <BillingSettings />;
      default:
        return <CompanySettings onSaved={refreshTenant} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header — shows the active section's icon + label + description */}
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
          {ActiveIcon && <ActiveIcon className="size-5 sm:size-6 text-emerald-600" />}
          <span>{activeConfig?.label ?? 'Settings'}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
          {activeConfig?.description}
        </p>
      </header>

      {/* Command-palette search — filters across all 14 sections */}
      <div className="mb-6">
        <SettingsSearch activeSectionId={activeSection} onSelect={setActiveSection} />
      </div>

      {/* Layout: sticky sidebar (desktop) / Sheet drawer (mobile) + content */}
      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsSidebar
          activeSectionId={activeSection}
          onSelect={setActiveSection}
        />
        <main className="flex-1 min-w-0 max-w-4xl">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}

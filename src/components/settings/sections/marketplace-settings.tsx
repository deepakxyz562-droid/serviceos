'use client';

/**
 * Marketplace section.
 *
 * Shows the existing `PublicHubTab` (profile basics — cover image, tagline,
 * business hours, FAQs, etc.) AND a prominent banner at the top that links
 * through to the full provider marketplace dashboard (eligibility checklist,
 * portfolio, certifications, quote inbox, emergency feed).
 *
 * The parent settings shell fetches the tenant snapshot (tenantId / industry /
 * slug) and passes it down so the URL preview renders correctly without a
 * duplicate fetch.
 *
 * Shows a loading skeleton while the tenant snapshot is still being
 * fetched by the parent.
 */

import { Loader2, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { PublicHubTab } from '@/components/settings/public-hub-tab';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';

interface MarketplaceSettingsProps {
  tenantId: string | null;
  industry: string;
  slug: string;
  loading?: boolean;
  isPlatformAdmin?: boolean;
  /** Passed through to PublicHubTab so saves refresh the auth/tenant state. */
  onSaved?: () => void;
}

export function MarketplaceSettings({ tenantId, industry, slug, loading, isPlatformAdmin, onSaved }: MarketplaceSettingsProps) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading marketplace settings...
      </div>
    );
  }

  if (!tenantId) {
    // Platform admins (superadmins / admins without a tenant) are intentionally
    // tenant-less — they manage the platform itself, not a single business.
    // Show a calm, informative message instead of the misleading "Complete
    // onboarding" copy (onboarding is suppressed for platform admins).
    if (isPlatformAdmin) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3 max-w-md mx-auto text-center">
          <ShieldCheck className="size-10 opacity-40 text-emerald-600" />
          <p className="text-sm font-medium text-foreground">Platform Admin Account</p>
          <p className="text-xs leading-relaxed">
            You&apos;re signed in as a platform administrator. Marketplace profile
            management is for tenant-scoped businesses. Use the SuperAdmin
            Directory Listings to manage all marketplace businesses.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            onClick={() => setCurrentView('superadminDirectoryListings')}
          >
            <Store className="size-4" />
            Open Directory Listings
          </Button>
        </div>
      );
    }
    // Non-platform-admin user with no tenant — this is a genuine data-integrity
    // issue. The "Complete onboarding" message is correct here.
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <Store className="size-8 opacity-30" />
        <p className="text-sm font-medium">No tenant found</p>
        <p className="text-xs">Complete onboarding to manage your marketplace profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner — bridge to the full marketplace dashboard */}
      <div className="rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-900/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="size-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Store className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            Manage your marketplace dashboard
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
            Eligibility checklist, portfolio, certifications, incoming quote requests, and live emergency dispatches.
          </p>
        </div>
        <Button
          onClick={() => setCurrentView('marketplaceDashboard')}
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 shrink-0"
        >
          Open dashboard
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Existing public hub profile editor (cover image, tagline, hours, FAQs, SEO) */}
      <PublicHubTab tenantId={tenantId} industry={industry} slug={slug} onSaved={onSaved} />
    </div>
  );
}

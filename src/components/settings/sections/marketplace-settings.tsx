'use client';

/**
 * Marketplace section.
 *
 * Thin wrapper around the existing `PublicHubTab` component. The parent
 * settings shell fetches the tenant snapshot (tenantId / industry / slug)
 * and passes it down so the URL preview renders correctly without a
 * duplicate fetch.
 *
 * Shows a loading skeleton while the tenant snapshot is still being
 * fetched by the parent.
 */

import { Loader2, Store } from 'lucide-react';
import { PublicHubTab } from '@/components/settings/public-hub-tab';

interface MarketplaceSettingsProps {
  tenantId: string | null;
  industry: string;
  slug: string;
  loading?: boolean;
}

export function MarketplaceSettings({ tenantId, industry, slug, loading }: MarketplaceSettingsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading marketplace settings...
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <Store className="size-8 opacity-30" />
        <p className="text-sm font-medium">No tenant found</p>
        <p className="text-xs">Complete onboarding to manage your marketplace profile.</p>
      </div>
    );
  }

  return <PublicHubTab tenantId={tenantId} industry={industry} slug={slug} />;
}

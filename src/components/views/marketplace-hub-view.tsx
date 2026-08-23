'use client';

/**
 * Marketplace Hub — unified page for the marketplace section.
 *
 * Consolidates 2 previously-separate nav items into one tabbed page:
 *   - My Listing   → the tenant's marketplace listing dashboard
 *   - Claim Business → find + claim existing business profiles
 *
 * The "My Listing" tab uses the same smart-routing logic as the old
 * `marketplaceDashboard` view: listing_only/claimed_free tenants get the
 * minimal ListingProviderDashboard, everyone else gets the full
 * ProviderMarketplaceDashboard.
 */

import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Store, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

// Lazy-load both dashboard components + the claim view
const ListingProviderDashboard = lazy(() =>
  import('@/components/marketplace/listing-provider-dashboard').then((m) => ({ default: m.ListingProviderDashboard }))
);
const ProviderMarketplaceDashboard = lazy(() =>
  import('@/components/marketplace/provider-marketplace-dashboard').then((m) => ({ default: m.ProviderMarketplaceDashboard }))
);
const ClaimBusinessView = lazy(() =>
  import('@/components/views/claim-business-view').then((m) => ({ default: m.ClaimBusinessView }))
);

type MarketplaceTab = 'listing' | 'claim';

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Smart router — picks the right dashboard based on signupMode.
 * Mirrors the logic in app-layout.tsx's MarketplaceDashboardRouter.
 */
function MarketplaceDashboardRouterInner() {
  const auth = useAppStore((s) => s.auth);
  const isListingOnly =
    (auth?.tenant as Record<string, unknown> | null)?.signupMode === 'listing_only' ||
    (auth?.tenant as Record<string, unknown> | null)?.listingTier === 'claimed_free';

  if (isListingOnly) {
    return (
      <Suspense fallback={<TabLoader />}>
        <ListingProviderDashboard />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<TabLoader />}>
      <ProviderMarketplaceDashboard />
    </Suspense>
  );
}

export function MarketplaceHubView() {
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('listing');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50">
          <Store className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your marketplace listing and claim existing business profiles.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketplaceTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="listing" className="gap-1.5">
            <Store className="size-4" /> My Listing
          </TabsTrigger>
          <TabsTrigger value="claim" className="gap-1.5">
            <ShieldCheck className="size-4" /> Claim Business
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listing" className="mt-6">
          <MarketplaceDashboardRouterInner />
        </TabsContent>

        <TabsContent value="claim" className="mt-6">
          <Suspense fallback={<TabLoader />}>
            <ClaimBusinessView />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

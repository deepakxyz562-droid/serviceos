import type { Metadata } from 'next';
import { ProductSessionShell } from '@/components/products/product-session-shell';
import { ProviderMarketplaceDashboard } from '@/components/marketplace/provider-marketplace-dashboard';

export const metadata: Metadata = {
  title: 'Provider dashboard — Fieseros Marketplace',
  robots: { index: false, follow: false },
};
export default function ProviderDashboardPage() {
  return <ProductSessionShell><main className="min-h-screen p-4 sm:p-6 lg:p-8"><ProviderMarketplaceDashboard /></main></ProductSessionShell>;
}

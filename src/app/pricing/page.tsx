import type { Metadata } from 'next';
import { PricingPageClient } from './pricing-page-client';

export const metadata: Metadata = {
  title: 'Pricing — Free Forms + Free CRM (100 Jobs) | Fieseros',
  description: 'Start free with 100 form submissions/month + 100 lifetime CRM jobs. Upgrade Forms ($10-$24/mo) or CRM ($29-$149/mo) when you grow.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return <PricingPageClient />;
}

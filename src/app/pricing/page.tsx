import type { Metadata } from 'next';
import { PricingPageClient } from './pricing-page-client';
import { CornerstoneLayout } from '@/components/seo/cornerstone-layout';
import { getSoftwareApplicationSchema } from '@/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Fieseros Pricing — Free First 100 Jobs, Transparent Pro Plans',
  description:
    'Start free with your first 100 CRM jobs & 100 form submissions/month with zero platform fees. Upgrade to Pro CRM, AI Voice Receptionist, or Enterprise when your team scales.',
  keywords: [
    'field service software pricing',
    'contractor crm pricing',
    'free field service management software',
    'fieseros plans',
    'jobber alternative pricing',
    'ai voice receptionist pricing',
    'trade business software cost',
  ],
  alternates: { canonical: 'https://fieseros.com/pricing' },
  openGraph: {
    title: 'Fieseros Pricing — Free First 100 Jobs, Transparent Pro Plans',
    description:
      'Start free with your first 100 CRM jobs & 100 form submissions/month. Transparent pricing with 0% platform transaction fees.',
    url: 'https://fieseros.com/pricing',
    siteName: 'Fieseros',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fieseros Pricing — Free First 100 Jobs, Transparent Pro Plans',
    description:
      'Start free with your first 100 CRM jobs & 100 form submissions/month. Upgrade when your trade business scales.',
  },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: 'Fieseros Platform Pricing',
    description:
      'Transparent pricing for field service management, AI voice receptionist, and smart conversational forms. 100 free jobs forever.',
    url: 'https://fieseros.com/pricing',
    applicationCategory: 'BusinessApplication',
    offers: { price: '0', priceCurrency: 'USD' },
  });

  return (
    <CornerstoneLayout
      activePath="/pricing"
      breadcrumbs={[
        { name: 'Home', url: 'https://fieseros.com' },
        { name: 'Pricing Plans', url: 'https://fieseros.com/pricing' },
      ]}
      additionalSchema={[appSchema]}
    >
      <PricingPageClient />
    </CornerstoneLayout>
  );
}

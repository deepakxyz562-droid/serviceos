import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CustomerWebApp } from '@/components/customer-app/customer-web-app';
import HomePageClient from '@/components/home/home-page-client';

export const metadata: Metadata = {
  title: 'Fieseros App | Customer Service Booking, Quotes & Home Memory',
  description:
    'Find trusted professionals, compare up to 3 competitive upfront quotes, track arrivals live, and manage home appliances with Fieseros AI Assistant.',
};

export default async function CustomerPortalPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  // Safeguard: If a deep link was constructed with product=bgos/book/... or bgos/b/..., cleanly redirect to public route
  if (typeof params.product === 'string' && params.product.startsWith('bgos/')) {
    const rawTarget = params.product.replace(/^bgos\//, '');
    const cleanTarget = rawTarget.replace(/\/(?:15|30|60)min$/, '');
    redirect(`/${cleanTarget}`);
  }
  if (params.product === 'bgos' || params.view === 'billing') {
    return <HomePageClient />;
  }
  return <CustomerWebApp />;
}

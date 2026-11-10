import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CustomerWebApp } from '@/components/customer-app/customer-web-app';
import HomePageClient from '@/components/home/home-page-client';
import { productForHostname } from '../../../shared/product-context';

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function isBgosRequest(
  params: Record<string, string | string[] | undefined>,
  host: string,
): boolean {
  return params.product === 'bgos' || productForHostname(host) === 'bgos';
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}): Promise<Metadata> {
  const [params, hdrs] = await Promise.all([
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
    headers(),
  ]);
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || '';
  if (isBgosRequest(params, host)) {
    return {
      title: 'BGOS — Business Growth OS',
      description:
        'Manage Google Business reviews, AI replies, local posts, leads, and appointments in one workspace.',
    };
  }
  return {
    title: 'Fieseros App | Customer Service Booking, Quotes & Home Memory',
    description:
      'Find trusted professionals, compare up to 3 competitive upfront quotes, track arrivals live, and manage home appliances with Fieseros AI Assistant.',
  };
}

export default async function CustomerPortalPage({
  searchParams,
}: {
  searchParams?: PageSearchParams;
}) {
  const [params, hdrs] = await Promise.all([
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
    headers(),
  ]);
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || '';
  // Safeguard: If a deep link was constructed with product=bgos/book/... or bgos/b/..., cleanly redirect to public route
  if (typeof params.product === 'string' && params.product.startsWith('bgos/')) {
    const rawTarget = params.product.replace(/^bgos\//, '');
    const cleanTarget = rawTarget.replace(/\/(?:15|30|60)min$/, '');
    redirect(`/${cleanTarget}`);
  }
  if (isBgosRequest(params, host) || params.view === 'billing') {
    return <HomePageClient />;
  }
  return <CustomerWebApp />;
}

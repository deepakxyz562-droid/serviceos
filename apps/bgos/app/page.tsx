import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Landing from './landing';

export const metadata: Metadata = {
  title: 'BGOS — Autonomous Growth Engine for Local Businesses & Google Maps',
  description: 'Rank #1 on Google Maps, answer customer inquiries 24/7 with an AI sales receptionist, and launch an instant booking website at bgos.site/yourname.',
  alternates: { canonical: 'https://bgos.site/' },
  openGraph: {
    title: 'BGOS — Autonomous Growth Engine for Local Businesses',
    description: 'Autonomous Google Maps SEO, 24/7 AI Receptionist, QR Review Standees, and Instant Booking Website.',
    url: 'https://bgos.site/',
    images: [{ url: 'https://bgos.site/bgos/primary-logo.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BGOS — Autonomous Growth Engine for Local Businesses',
    description: 'Rank #1 on Google Maps, 24/7 AI Receptionist, and instant short booking website.',
  },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Preserve authentication and feature deep links at the old entry point.
  if (['auth', 'view', 'code', 'token', 'returnUrl', 'error'].some(key => key in params)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
    }
    query.set('product', 'bgos');
    redirect(`/app?${query}`);
  }
  return <Landing />;
}

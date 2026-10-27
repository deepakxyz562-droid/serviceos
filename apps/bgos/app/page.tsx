import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Landing from './landing';

export const metadata: Metadata = {
  title: 'BGOS — Your next stage of business growth',
  description: 'Bring your leads, conversations, appointments, forms and AI assistant together. A connected growth workspace for your business.',
  alternates: { canonical: 'https://bgos.fieseros.com/' },
  openGraph: { title: 'BGOS — Grow your business, all in one place', description: 'Your customers. Your conversations. Your next opportunity.', url: 'https://bgos.fieseros.com/', images: [{ url: 'https://bgos.fieseros.com/bgos/landing/assistant-hd.png' }] },
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

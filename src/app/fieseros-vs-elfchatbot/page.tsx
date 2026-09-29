import type { Metadata } from 'next';
import { ComparisonPageShell } from '@/components/seo/comparison-page-shell';
import { getComparisonBySlug } from '@/lib/seo/comparison-config';

const cfg = getComparisonBySlug('fieseros-vs-elfchatbot')!;

export const metadata: Metadata = {
  title: cfg.titleTag,
  description: cfg.metaDescription,
  keywords: [
    'fieseros vs elfchatbot',
    'elfchatbot alternative',
    'elfsight chatbot alternative',
    'elfchatbot review',
    'website ai chatbot with payments',
    'chatbot that books appointments',
  ],
  alternates: { canonical: `https://fieseros.com/${cfg.slug}` },
  openGraph: {
    title: cfg.titleTag,
    description: cfg.metaDescription,
    url: `https://fieseros.com/${cfg.slug}`,
    siteName: 'Fieseros AI Studio',
    type: 'article',
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <ComparisonPageShell cfg={cfg} />;
}

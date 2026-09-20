import type { Metadata } from 'next';
import Link from 'next/link';
import { TemplatesGalleryClient } from './templates-gallery-client';
import {
  searchTemplatesPaginated,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
} from '@/lib/forms/templates';
import { Sparkles } from 'lucide-react';

/**
 * /templates — public template gallery (SEO landing page).
 *
 * Server-rendered for crawlers. Shows the full 20,000+ template catalog with search,
 * category/industry filters, and "Use this template" CTAs that redirect to
 * the app (auth-gated).
 */
export const metadata: Metadata = {
  title: 'Form Templates — 20,000+ Free Online Form Examples | Fieseros',
  description:
    'Browse 20,000+ free form templates for every industry and business need. Contact forms, patient intake, surveys, bookings, orders, quotes, waivers, and more. Customize and launch in minutes.',
  alternates: { canonical: '/templates' },
  openGraph: {
    title: '20,000+ Free Form Templates | Fieseros',
    description:
      'Browse 20,000+ contact forms, intake forms, surveys, bookings, quotes, and more. Free to customize and embed.',
    type: 'website',
  },
};

export default function TemplatesGalleryPage() {
  const initialData = searchTemplatesPaginated({ page: 1, pageSize: 24, sort: 'featured' });
  const categories = TEMPLATE_CATEGORIES;
  const industries = TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general');

  const categoryCounts: Record<string, number> = {};
  for (const c of categories) {
    categoryCounts[c.id] = c.count || 580;
  }

  const industryCounts: Record<string, number> = {};
  for (const ind of industries) {
    industryCounts[ind.id] = ind.count || 420;
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Form Templates',
    numberOfItems: initialData.total,
    itemListElement: initialData.templates.slice(0, 30).map((t, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: t.name,
      url: `/templates/${t.categories[0] || 'general'}/${t.id}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <header className="border-b border-border bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/30 dark:via-background dark:to-blue-950/30">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <Sparkles className="size-3.5" />
            20,000+ Free Online Templates
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            20,000+ Form Templates for Every Business
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            Browse 20,000+ ready-to-use form templates with Jotform parity. Contact forms, patient
            intake, service requests, inspections, surveys, bookings, orders, and waivers. Customize, embed, and
            launch in minutes — free.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
            <span className="bg-background border border-border px-3 py-1.5 rounded-full font-medium">
              ⭐ 1,500+ Hand-Crafted Featured
            </span>
            <span className="bg-background border border-border px-3 py-1.5 rounded-full font-medium">
              📂 {categories.length} Core Categories
            </span>
            <span className="bg-background border border-border px-3 py-1.5 rounded-full font-medium">
              🏭 {industries.length} Industry Verticals
            </span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Gallery with Sticky Sidebar & Instant Preview */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <TemplatesGalleryClient
          initialTemplates={initialData.templates}
          initialTotalCount={initialData.total}
          categoryCounts={categoryCounts}
          industryCounts={industryCounts}
        />
      </main>

      <footer className="border-t border-border bg-muted/30 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-xs text-muted-foreground space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">About Fieseros 20,000+ Form Templates</h2>
            <p>
              Our template library covers 20,000+ form variations across {industries.length}+
              industries. Every template is free to use — just click &ldquo;Use this template&rdquo;
              to open it in our form builder, where you can add fields, change colors, configure
              payment integrations, set up conditional logic, and embed on your website.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Popular Categories</h3>
              <ul className="space-y-1">
                {categories.slice(0, 5).map((c) => (
                  <li key={c.id}><Link href={`/templates/${c.id}`} className="hover:text-emerald-600 hover:underline">{c.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Top Industries</h3>
              <ul className="space-y-1">
                {industries.slice(0, 5).map((i) => (
                  <li key={i.id}><Link href={`/templates/industries/${i.id}`} className="hover:text-emerald-600 hover:underline">{i.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Featured Templates</h3>
              <ul className="space-y-1">
                {initialData.templates.slice(0, 5).map((t) => (
                  <li key={t.id}><Link href={`/templates/${t.categories[0] || 'general'}/${t.id}`} className="hover:text-emerald-600 hover:underline">{t.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Product</h3>
              <ul className="space-y-1">
                <li><Link href="/gptform" className="hover:text-emerald-600 hover:underline">GPTForm™ Builder</Link></li>
                <li><Link href="/#ai-receptionist" className="hover:text-emerald-600 hover:underline">24/7 AI Receptionist</Link></li>
                <li><Link href="/" className="hover:text-emerald-600 hover:underline">Home</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

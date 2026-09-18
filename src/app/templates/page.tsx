import type { Metadata } from 'next';
import Link from 'next/link';
import { TemplatesGalleryClient } from './templates-gallery-client';
import { getAllTemplates, TEMPLATE_CATEGORIES, TEMPLATE_INDUSTRIES } from '@/lib/forms/templates';
import { Sparkles } from 'lucide-react';

/**
 * /templates — public template gallery (SEO landing page).
 *
 * Server-rendered for crawlers. Shows the full template catalog with search,
 * category/industry filters, and "Use this template" CTAs that redirect to
 * the app (auth-gated).
 */
export const metadata: Metadata = {
  title: 'Form Templates — 50+ Free Online Form Examples | Fieseros',
  description:
    'Browse 50+ free form templates for every business need. Contact forms, intake forms, surveys, bookings, quotes, donations, and more. Customize and launch in minutes.',
  alternates: { canonical: '/templates' },
  openGraph: {
    title: '50+ Free Form Templates | Fieseros',
    description:
      'Browse contact forms, intake forms, surveys, bookings, quotes, and more. Free to customize and embed.',
    type: 'website',
  },
};

export default function TemplatesGalleryPage() {
  const allTemplates = getAllTemplates();
  const featured = allTemplates.filter((t) => t.isFeatured);

  const categoryCounts = new Map<string, number>();
  for (const t of allTemplates) {
    for (const c of t.categories) {
      categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
    }
  }
  const categories = TEMPLATE_CATEGORIES.filter((c) => (categoryCounts.get(c.id) ?? 0) > 0);

  const industryCounts = new Map<string, number>();
  for (const t of allTemplates) {
    for (const i of t.industries) {
      industryCounts.set(i, (industryCounts.get(i) ?? 0) + 1);
    }
  }
  const industries = TEMPLATE_INDUSTRIES.filter((i) => i.id !== 'general' && (industryCounts.get(i.id) ?? 0) > 0);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Form Templates',
    numberOfItems: allTemplates.length,
    itemListElement: allTemplates.slice(0, 20).map((t, idx) => ({
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
            {allTemplates.length}+ Free Templates
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Form Templates for Every Business
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse {allTemplates.length}+ ready-to-use form templates. Contact forms, patient
            intake, service requests, surveys, bookings, quotes, and more. Customize, embed, and
            launch in minutes — free.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs">
            <span className="bg-background border border-border px-3 py-1.5 rounded-full">
              ⭐ {featured.length} Featured
            </span>
            <span className="bg-background border border-border px-3 py-1.5 rounded-full">
              📂 {categories.length} Categories
            </span>
            <span className="bg-background border border-border px-3 py-1.5 rounded-full">
              🏭 {industries.length} Industries
            </span>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Browse by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/templates/${cat.id}`} className="inline-flex items-center gap-1 text-xs bg-background border border-border hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-3 py-1.5 rounded-full transition">
                {cat.label}
                <span className="text-muted-foreground">({categoryCounts.get(cat.id)})</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Browse by Industry</h2>
          <div className="flex flex-wrap gap-2">
            {industries.slice(0, 20).map((ind) => (
              <Link key={ind.id} href={`/templates/industries/${ind.id}`} className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-full transition">
                {ind.label}
                <span className="opacity-60">({industryCounts.get(ind.id)})</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <TemplatesGalleryClient templates={allTemplates} />
      </main>

      <footer className="border-t border-border bg-muted/30 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 text-xs text-muted-foreground space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">About Fieseros Form Templates</h2>
            <p>
              Our template library covers the most common form needs across {industries.length}+
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
                {featured.slice(0, 5).map((t) => (
                  <li key={t.id}><Link href={`/templates/${t.categories[0] || 'general'}/${t.id}`} className="hover:text-emerald-600 hover:underline">{t.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Product</h3>
              <ul className="space-y-1">
                <li><Link href="/ai-forms" className="hover:text-emerald-600 hover:underline">AI Form Builder</Link></li>
                <li><Link href="/" className="hover:text-emerald-600 hover:underline">Home</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

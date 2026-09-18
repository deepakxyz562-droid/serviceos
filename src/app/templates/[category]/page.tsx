import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TemplatesGalleryClient } from '../../templates-gallery-client';
import {
  getAllTemplates,
  TEMPLATE_CATEGORIES,
  CATEGORY_MAP,
  getIndustryLabel,
} from '@/lib/forms/templates';
import { ChevronRight } from 'lucide-react';

/**
 * /templates/[category] — public category listing page.
 *
 * Server-rendered. Shows all templates in a given category with SEO
 * metadata tailored to that category (e.g. "Contact Form Templates").
 */
export async function generateStaticParams() {
  // Pre-render a page for every category that has at least 1 template.
  const all = getAllTemplates();
  const catSet = new Set<string>();
  for (const t of all) {
    for (const c of t.categories) catSet.add(c);
  }
  return Array.from(catSet).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORY_MAP.get(category);
  if (!cat) return { title: 'Category not found' };
  const count = getAllTemplates().filter((t) => t.categories.includes(category as never)).length;
  return {
    title: `${cat.label} — ${count} Free Templates | Fieseros`,
    description: `${cat.description} Browse ${count} free ${cat.label.toLowerCase()} templates. Customize and embed in minutes.`,
    alternates: { canonical: `/templates/${category}` },
    openGraph: {
      title: `${cat.label} | Fieseros`,
      description: cat.description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = CATEGORY_MAP.get(category);
  if (!cat) notFound();

  const all = getAllTemplates();
  const templates = all.filter((t) => t.categories.includes(category as never));

  if (templates.length === 0) notFound();

  // Build subcategory counts
  const subCounts = new Map<string, number>();
  for (const t of templates) {
    // Each template's categories may include this one + others; we count
    // cross-listed categories as "related"
    for (const c of t.categories) {
      if (c !== category) subCounts.set(c, (subCounts.get(c) ?? 0) + 1);
    }
  }
  const related = Array.from(subCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({ id, label: CATEGORY_MAP.get(id)?.label || id, count }));

  // Industries represented in this category
  const industryCounts = new Map<string, number>();
  for (const t of templates) {
    for (const i of t.industries) {
      if (i !== 'general') industryCounts.set(i, (industryCounts.get(i) ?? 0) + 1);
    }
  }
  const industries = Array.from(industryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <nav className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link href="/templates" className="hover:text-foreground">Templates</Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-medium">{cat.label}</span>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{cat.label}</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{cat.description}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </header>

      {/* Related categories */}
      {related.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h2 className="text-xs font-semibold text-foreground mb-2">Related categories</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/templates/${r.id}`}
                  className="text-xs bg-background border border-border hover:border-emerald-400 px-3 py-1 rounded-full transition"
                >
                  {r.label} <span className="text-muted-foreground">({r.count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Industries in this category */}
      {industries.length > 0 && (
        <section className="border-b border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h2 className="text-xs font-semibold text-foreground mb-2">Industries in {cat.label}</h2>
            <div className="flex flex-wrap gap-2">
              {industries.map(([id, count]) => (
                <Link
                  key={id}
                  href={`/templates/industries/${id}`}
                  className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 px-3 py-1 rounded-full transition"
                >
                  {getIndustryLabel(id)} <span className="opacity-60">({count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Template grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <TemplatesGalleryClient templates={templates} />
      </main>
    </div>
  );
}

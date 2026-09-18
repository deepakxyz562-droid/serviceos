import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TemplatesGalleryClient } from '../../templates-gallery-client';
import {
  getAllTemplates,
  getTemplatesByIndustry,
  TEMPLATE_INDUSTRIES,
  INDUSTRY_MAP,
  getCategoryLabel,
} from '@/lib/forms/templates';
import { ChevronRight } from 'lucide-react';

/**
 * /templates/industries/[industry] — public industry listing page.
 *
 * Server-rendered. Shows all templates for a given industry (e.g. "Dental",
 * "HVAC") with SEO metadata tailored to that industry.
 */
export async function generateStaticParams() {
  const all = getAllTemplates();
  const indSet = new Set<string>();
  for (const t of all) {
    for (const i of t.industries) indSet.add(i);
  }
  return Array.from(indSet).map((industry) => ({ industry }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry } = await params;
  const ind = INDUSTRY_MAP.get(industry);
  if (!ind) return { title: 'Industry not found' };
  const count = getAllTemplates().filter((t) => t.industries.includes(industry as never)).length;
  return {
    title: `${ind.label} Form Templates — ${count} Free Examples | Fieseros`,
    description: `Browse ${count} free form templates for the ${ind.label} industry. Intake forms, service requests, quotes, inspections, and more.`,
    alternates: { canonical: `/templates/industries/${industry}` },
    openGraph: {
      title: `${ind.label} Form Templates | Fieseros`,
      description: `${count} free form templates for ${ind.label}.`,
    },
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;
  const ind = INDUSTRY_MAP.get(industry);
  if (!ind) notFound();

  const templates = await getTemplatesByIndustry(industry as never, { limit: 100 });

  if (templates.length === 0) notFound();

  // Categories represented in this industry
  const catCounts = new Map<string, number>();
  for (const t of templates) {
    for (const c of t.categories) {
      catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
    }
  }
  const categories = Array.from(catCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Related industries
  const relatedIndustries = TEMPLATE_INDUSTRIES.filter(
    (i) => i.id !== industry && i.id !== 'general',
  ).slice(0, 15);

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <nav className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link href="/templates" className="hover:text-foreground">Templates</Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-medium">{ind.label}</span>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {ind.label} Form Templates
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            {templates.length} free form template{templates.length !== 1 ? 's' : ''} for the {ind.label.toLowerCase()} industry.
            Customize, embed, and launch in minutes.
          </p>
          {ind.aliases.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Also relevant for: {ind.aliases.slice(0, 5).join(', ')}
            </p>
          )}
        </div>
      </header>

      {/* Categories in this industry */}
      {categories.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h2 className="text-xs font-semibold text-foreground mb-2">Form types for {ind.label}</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(([id, count]) => (
                <Link
                  key={id}
                  href={`/templates/${id}`}
                  className="text-xs bg-background border border-border hover:border-emerald-400 px-3 py-1 rounded-full transition"
                >
                  {getCategoryLabel(id)} <span className="text-muted-foreground">({count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Template grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <TemplatesGalleryClient
          initialTemplates={templates.slice(0, 24)}
          initialTotalCount={templates.length}
          initialIndustry={industry}
        />
      </main>

      {/* Related industries */}
      {relatedIndustries.length > 0 && (
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h2 className="text-xs font-semibold text-foreground mb-2">Other industries</h2>
            <div className="flex flex-wrap gap-2">
              {relatedIndustries.map((r) => (
                <Link
                  key={r.id}
                  href={`/templates/industries/${r.id}`}
                  className="text-xs bg-background border border-border hover:border-blue-400 px-3 py-1 rounded-full transition"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

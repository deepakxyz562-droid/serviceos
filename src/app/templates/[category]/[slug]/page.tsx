import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllTemplates,
  getTemplateSync,
  getCategoryLabel,
  getIndustryLabel,
  type TemplateCategoryId,
} from '@/lib/forms/templates';
import { FormRuntimeRenderer } from '@/features/forms/components/runtime/form-runtime-renderer';
import { ChevronRight, Star, FileText, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { UseTemplateCTAButton } from './use-template-cta-button';

/**
 * /templates/[category]/[slug] — template detail page.
 *
 * The most important SEO page. Shows a live preview of the form, the fields
 * it includes, FAQs, related templates, and a "Use this template" CTA that
 * redirects to the app (auth-gated).
 *
 * Server-rendered for crawlers. The FormRuntimeRenderer is a client component
 * but receives the schema as a prop, so the initial HTML is SSR'd.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const all = getAllTemplates();
  // Prerender the top 1,000 canonical templates at build time for fast SSG,
  // and dynamically render all remaining 20,000+ templates on demand.
  return all.slice(0, 1000).map((t) => ({
    category: t.categories[0] || 'general',
    slug: t.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplateSync(slug);
  if (!template) return { title: 'Template not found' };

  return {
    title: template.seo.seoTitle || `${template.name} | Fieseros`,
    description: template.seo.seoDescription || template.shortDescription,
    alternates: { canonical: `/templates/${template.categories[0] || 'general'}/${template.id}` },
    keywords: template.seo.seoKeywords,
    openGraph: {
      title: template.name,
      description: template.shortDescription,
      type: 'website',
    },
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const template = getTemplateSync(slug);

  if (!template || !template.categories.includes(category as TemplateCategoryId)) {
    // If the template exists but the category doesn't match, redirect to the
    // canonical URL.
    if (template) {
      const canonicalCat = template.categories[0] || 'general';
      if (canonicalCat !== category) {
        return notFound();
      }
    }
    notFound();
  }

  // Find related templates (same primary category, excluding self)
  const categoryTemplates = await getTemplatesByCategory(template.categories[0] as TemplateCategoryId, { limit: 5 });
  const related = categoryTemplates.filter((t) => t.id !== template.id).slice(0, 4);

  const fieldCount = template.schema.fields?.length || 0;
  const stepCount = template.schema.steps?.length || 1;

  // JSON-LD structured data (FAQ + SoftwareApplication)
  const faqJsonLd = template.seo.faq && template.seo.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: template.seo.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null;

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: template.name,
    description: template.shortDescription,
    applicationCategory: 'BusinessApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <div className="min-h-screen bg-background">
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      {/* Breadcrumbs */}
      <nav className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          <Link href="/" className="hover:text-foreground shrink-0">Home</Link>
          <ChevronRight className="size-3 shrink-0" />
          <Link href="/templates" className="hover:text-foreground shrink-0">Templates</Link>
          <ChevronRight className="size-3 shrink-0" />
          <Link href={`/templates/${category}`} className="hover:text-foreground shrink-0">
            {getCategoryLabel(category)}
          </Link>
          <ChevronRight className="size-3 shrink-0" />
          <span className="text-foreground font-medium truncate">{template.name}</span>
        </div>
      </nav>

      {/* Hero */}
      <header className="border-b border-border bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/30 dark:via-background dark:to-blue-950/30">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              {template.isFeatured && (
                <div className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-1 rounded mb-3">
                  <Star className="size-3 fill-current" /> Featured Template
                </div>
              )}
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {template.name}
              </h1>
              <p className="mt-3 text-base text-muted-foreground max-w-2xl">
                {template.shortDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {template.categories.map((c) => (
                  <Link
                    key={c}
                    href={`/templates/${c}`}
                    className="text-xs bg-background border border-border hover:border-emerald-400 px-2.5 py-1 rounded-full transition"
                  >
                    {getCategoryLabel(c)}
                  </Link>
                ))}
                {template.industries.filter((i) => i !== 'general').map((i) => (
                  <Link
                    key={i}
                    href={`/templates/industries/${i}`}
                    className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 px-2.5 py-1 rounded-full transition"
                  >
                    {getIndustryLabel(i)}
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <UseTemplateCTAButton template={template} />
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 bg-background border border-border hover:bg-muted text-sm font-medium px-5 py-2.5 rounded-lg transition"
                >
                  Live Preview
                </a>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Free · No credit card required · {fieldCount} fields · Customize everything
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column: preview + details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Live preview */}
          <section id="preview" className="scroll-mt-4">
            <h2 className="text-lg font-bold text-foreground mb-3">Live Preview</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden p-6">
              <FormRuntimeRenderer
                formName={template.name}
                schema={template.schema}
                previewMode={true}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              This is a live, interactive preview. Fill it out to see how it works.
            </p>
          </section>

          {/* What's included */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">What&apos;s Included</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Fields" value={fieldCount} />
              <Stat label="Steps" value={stepCount} />
              <Stat label="Categories" value={template.categories.length} />
              <Stat label="Industries" value={template.industries.filter((i) => i !== 'general').length} />
            </div>
          </section>

          {/* Field list */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Form Fields</h2>
            <p className="text-xs text-muted-foreground mb-4">
              This template includes {fieldCount} fields. Here&apos;s what respondents will see:
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-foreground">Field</th>
                    <th className="text-left p-3 font-semibold text-foreground">Type</th>
                    <th className="text-left p-3 font-semibold text-foreground">Required</th>
                    <th className="text-left p-3 font-semibold text-foreground hidden sm:table-cell">Width</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(template.schema.fields || []).map((field) => (
                    <tr key={field.id} className="hover:bg-muted/30">
                      <td className="p-3 text-foreground font-medium">{field.label}</td>
                      <td className="p-3 text-muted-foreground">{field.type.replace(/_/g, ' ')}</td>
                      <td className="p-3">
                        {field.required ? (
                          <span className="inline-flex items-center text-emerald-600 text-xs font-medium">
                            <CheckCircle2 className="size-3 mr-0.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell capitalize">
                        {field.width || 'full'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ */}
          {template.seo.faq && template.seo.faq.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {template.seo.faq.map((faq, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-4">
                    <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* CTA card */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5">
            <h3 className="text-sm font-bold text-foreground">Start with this template</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Open in the form builder, customize fields, colors, and integrations, then publish.
            </p>
            <UseTemplateCTAButton template={template} variant="sidebar" />
          </div>

          {/* Template info */}
          <div className="rounded-xl border border-border p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Template details</h3>
            <Detail label="Fields" value={`${fieldCount}`} />
            <Detail label="Steps" value={`${stepCount}`} />
            <Detail label="Source" value={template.source === 'curated' ? 'Fieseros Team' : template.source} />
            <Detail label="Language" value="English" />
            {template.tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Related templates */}
      {related.length > 0 && (
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Related Templates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((t) => (
                <Link
                  key={t.id}
                  href={`/templates/${t.categories[0] || 'general'}/${t.id}`}
                  className="group rounded-xl border border-border bg-card hover:border-emerald-400 hover:shadow-md transition-all p-4"
                >
                  {t.isFeatured && (
                    <Star className="size-3 text-amber-500 fill-current mb-1" />
                  )}
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {t.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.shortDescription}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {t.schema.fields?.length || 0} fields
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium capitalize">{value}</span>
    </div>
  );
}

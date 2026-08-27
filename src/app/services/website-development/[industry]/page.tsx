import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout'
import { CtaSection } from '@/components/seo/cta-section'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getServiceSchema } from '@/lib/seo/schemas'
import { INDUSTRY_SERVICES, getIndustryBySlug, getAllIndustrySlugs } from '@/lib/services/industry-data'

// Statically generate all 18 industry pages at build time.
export const dynamicParams = false

export function generateStaticParams() {
  return getAllIndustrySlugs().map((slug) => ({ industry: slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>
}): Promise<Metadata> {
  const { industry: slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) return {}

  return {
    title: `Website Development for ${industry.name} Businesses | Fieseros`,
    description: industry.metaDescription,
    alternates: { canonical: `/services/website-development/${slug}` },
    openGraph: {
      title: `${industry.emoji} Websites for ${industry.name} Businesses | Fieseros`,
      description: industry.metaDescription,
      url: `/services/website-development/${slug}`,
    },
  }
}

export default async function IndustryServicePage({
  params,
}: {
  params: Promise<{ industry: string }>
}) {
  const { industry: slug } = await params
  const industry = getIndustryBySlug(slug)

  if (!industry) {
    notFound()
  }

  const schema = getServiceSchema({
    name: `Website Development for ${industry.name} Businesses`,
    description: industry.metaDescription,
    url: `https://fieseros.com/services/website-development/${slug}`,
    category: `Website Development for ${industry.name}`,
  })

  return (
    <CornerstoneLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <CornerstoneHero
        eyebrow={`${industry.emoji} ${industry.name}`}
        title={industry.tagline}
        subtitle={`Professional websites built specifically for ${industry.singularNoun}s. Mobile-first, SEO-ready, with booking forms that flow straight into your Fieseros CRM. Starting at $999.`}
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/services/get-a-quote?service=website&industry=${slug}`}>
            <Button size="lg" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Get a Free Quote <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/services/website-development">
            <Button size="lg" variant="outline">
              See All Features
            </Button>
          </Link>
        </div>
      </CornerstoneHero>

      {/* ── Pain points vs features ───────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
          The Challenge for {industry.name} Businesses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pain points */}
          <Card className="border-red-200 dark:border-red-900/40">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4">
                Without a Fieseros website:
              </h3>
              <ul className="space-y-3">
                {industry?.painPoints?.map((pain) => (
                  <li key={pain} className="flex items-start gap-2 text-sm">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <span className="text-muted-foreground">{pain}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="border-emerald-500 border-2">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4">
                With a Fieseros {industry?.name} website:
              </h3>
              <ul className="space-y-3">
                {industry?.features?.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Why Fieseros for this industry ────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
            Why {industry?.name} Businesses Choose Fieseros
          </h2>
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-2">
                Built for {industry?.singularNoun}s, not generic businesses
              </h3>
              <p className="text-sm text-muted-foreground">
                We understand the {industry?.name?.toLowerCase()} industry. Your website
                includes service pages, booking forms, and CRM workflows designed
                specifically for {industry?.singularNoun}s — not a generic template
                repurposed for every trade.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-2">
                Every lead flows into your CRM
              </h3>
              <p className="text-sm text-muted-foreground">
                When a customer submits a booking form on your website, it doesn&apos;t
                go to your inbox (where it gets lost). It flows directly into Fieseros
                CRM — where you can convert it to a job, schedule a technician, send
                a quote, and collect payment. No lead falls through the cracks.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-2">
                Built to rank on Google
              </h3>
              <p className="text-sm text-muted-foreground">
                Your website is built with clean code, structured data, and
                SEO-optimized content for {industry?.keywords?.slice(0, 3)?.join(', ')}.
                Combined with Google Business Profile optimization, you&apos;ll rank
                for the searches your customers actually type.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing callout ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-8 text-center dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-cyan-950/20">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {industry.name} Websites Starting at $999
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Starter Website for small {industry.name.toLowerCase()} businesses. Growth
            Website ($2,499) includes full CRM integration + more pages.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/services/get-a-quote?service=website&industry=${slug}`}>
              <Button size="lg" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                Get a Free Quote <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/services/website-development">
              <Button size="lg" variant="outline">
                Compare Tiers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Other industries ──────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-6 text-center">
            Other Industries We Serve
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {INDUSTRY_SERVICES.filter((i) => i.slug !== slug).map((other) => (
              <Link
                key={other.slug}
                href={`/services/website-development/${other.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 transition-colors"
              >
                <span>{other.emoji}</span>
                {other.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title={`Ready for a website that grows your ${industry.name.toLowerCase()} business?`}
        subtitle="Get a free quote tailored to your industry and location. No obligation."
        primaryCta={{ label: 'Get a Free Quote', href: '/services/get-a-quote' }}
        secondaryCta={{ label: 'See All Services', href: '/services' }}
      />
    </CornerstoneLayout>
  )
}

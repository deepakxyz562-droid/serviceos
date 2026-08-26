import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Search, MapPin, Star, TrendingUp, FileText, Link as LinkIcon } from 'lucide-react'
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout'
import { CtaSection } from '@/components/seo/cta-section'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getServiceSchema } from '@/lib/seo/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SEO & Local Search for Service Businesses | Fieseros',
  description:
    'Rank higher on Google and turn local searches into booked jobs. Local SEO, Google Business Profile optimization, review management, and content — built for service businesses.',
  alternates: { canonical: '/services/seo' },
  openGraph: {
    title: 'SEO & Local Search for Service Businesses | Fieseros',
    description:
      'Local SEO, Google Business Profile optimization, and reputation management for plumbers, HVAC, electricians, and 20+ service industries.',
    url: '/services/seo',
  },
}

const services = [
  {
    icon: MapPin,
    title: 'Local SEO',
    desc: 'Rank for "plumber near me", "HVAC repair [city]", and the high-intent local searches your customers actually type. City/neighborhood landing pages, local citations, and geo-targeted content.',
  },
  {
    icon: Search,
    title: 'Google Business Profile Optimization',
    desc: 'Your GBP is the #1 local SEO ranking factor. We optimize your profile, set up booking links, manage posts, and ensure your "Book" button links to your Fieseros booking page.',
  },
  {
    icon: Star,
    title: 'Review & Reputation Management',
    desc: 'More 5-star reviews = higher rankings + more trust. We set up automated review requests via Fieseros CRM (SMS + email after job completion) and help you respond to reviews.',
  },
  {
    icon: FileText,
    title: 'Content & Service Pages',
    desc: 'SEO-optimized service pages, blog posts, and industry guides that answer your customers\' questions and rank for long-tail keywords. Written by humans who understand your industry.',
  },
  {
    icon: LinkIcon,
    title: 'Citations & Link Building',
    desc: 'We build consistent NAP (Name, Address, Phone) citations across 50+ local directories and earn relevant backlinks from industry sites.',
  },
  {
    icon: TrendingUp,
    title: 'Monthly Reporting',
    desc: 'Transparent monthly reports showing rankings, traffic, leads, and revenue attributed to SEO. No vanity metrics — just what matters to your bottom line.',
  },
]

const process = [
  { step: '1', title: 'SEO Audit', desc: 'We audit your current website, Google rankings, Google Business Profile, and competitor landscape. You get a prioritized action plan.' },
  { step: '2', title: 'Foundation', desc: 'We fix technical SEO issues, optimize your site structure, set up Google Business Profile, and install tracking (Google Analytics + Search Console).' },
  { step: '3', title: 'Content & Citations', desc: 'We create SEO-optimized service pages, build local citations, and publish content that ranks for your target keywords.' },
  { step: '4', title: 'Reviews & Reputation', desc: 'We set up automated review requests in Fieseros CRM and help you respond to reviews (positive and negative).' },
  { step: '5', title: 'Measure & Scale', desc: 'Monthly reports show what\'s working. We double down on the keywords and channels driving revenue.' },
]

const faqs = [
  {
    q: 'How long until I see SEO results?',
    a: 'Local SEO typically shows results in 2–3 months (Google Business Profile optimization, local citations). Content-based SEO (blog posts, service pages) takes 3–6 months to rank. We set realistic expectations in your audit.',
  },
  {
    q: 'Do you guarantee #1 rankings?',
    a: 'No — and neither should any honest SEO agency. Google\'s algorithm has 200+ factors and we don\'t control it. What we DO guarantee is transparent reporting, white-hat tactics, and measurable progress month over month.',
  },
  {
    q: 'What makes Fieseros SEO different from other agencies?',
    a: 'We\'re not just an SEO agency — we\'re your CRM provider. That means we can track SEO leads all the way to booked jobs and revenue, not just "traffic went up". And we can automate review requests, SMS follow-ups, and customer re-engagement directly from the CRM.',
  },
  {
    q: 'Do I need a Fieseros website to use your SEO service?',
    a: 'No — we can optimize your existing website. However, if your site is slow, not mobile-friendly, or lacks proper SEO foundation, we may recommend a Fieseros website (discounted when bundled with SEO).',
  },
  {
    q: 'What does the monthly retainer include?',
    a: 'Pricing depends on your market competitiveness, number of locations, and goals. After the free audit, we\'ll propose a monthly retainer (typically $499–$1,499/month) with a clear scope of work.',
  },
]

export default function SeoPage() {
  const schema = getServiceSchema({
    name: 'SEO & Local Search for Service Businesses',
    description: 'Local SEO, Google Business Profile optimization, review management, and content marketing for service businesses.',
    url: 'https://fieseros.com/services/seo',
    category: 'Search Engine Optimization',
  })

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (faqs || []).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <CornerstoneLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <CornerstoneHero
        eyebrow="Grow"
        title="Rank Higher. Get More Customers. Grow Your Service Business."
        subtitle="When someone searches 'plumber near me' or 'HVAC repair in [your city]', are you showing up? We get you to the top of Google — and turn those searches into booked jobs."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/services/get-a-quote?service=seo">
            <Button size="lg" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Get a Free SEO Audit <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/services">
            <Button size="lg" variant="outline">
              See All Services
            </Button>
          </Link>
        </div>
      </CornerstoneHero>

      {/* ── Services grid ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
            What&apos;s Included
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            A complete local SEO strategy — from technical foundation to content to reputation management.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.title}>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                  <service.icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Process ───────────────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
            Our SEO Process
          </h2>
          <div className="space-y-6">
            {process.map((item) => (
              <div key={item.step} className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Fieseros SEO is different ─────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
          Why Fieseros SEO Is Different
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-3">Other SEO agencies</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Report on "traffic" and "rankings" — not revenue</li>
                <li>• Can&apos;t connect SEO leads to booked jobs</li>
                <li>• No automation — manual review requests at best</li>
                <li>• Don&apos;t understand service businesses</li>
                <li>• Lock you into long contracts with vague deliverables</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-emerald-500 border-2">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-3">Fieseros SEO</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Track SEO leads → booked jobs → revenue</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Automated review requests via Fieseros CRM</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> SMS + email follow-ups to convert leads</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Built for plumbers, HVAC, electricians, etc.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Month-to-month, cancel anytime</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {(faqs || []).map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Ready to rank higher and get more customers?"
        subtitle="Get a free SEO audit. We'll show you exactly what's holding your site back and how to fix it."
        primaryCta={{ label: 'Get a Free SEO Audit', href: '/services/get-a-quote' }}
        secondaryCta={{ label: 'See All Services', href: '/services' }}
      />
    </CornerstoneLayout>
  )
}

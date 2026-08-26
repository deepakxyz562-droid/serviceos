import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Target, Zap, BarChart3, MousePointerClick, Wallet, Gauge } from 'lucide-react'
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout'
import { CtaSection } from '@/components/seo/cta-section'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getServiceSchema } from '@/lib/seo/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Google Ads Management for Service Businesses | Fieseros',
  description:
    'Get qualified leads fast with Google Ads management. Campaign setup, keyword targeting, ad copy, landing pages, and ROI tracking — built for service businesses.',
  alternates: { canonical: '/services/google-ads' },
  openGraph: {
    title: 'Google Ads Management for Service Businesses | Fieseros',
    description:
      'Turn Google searches into booked jobs with Google Ads management built for service businesses. Campaign setup, optimization, and ROI tracking.',
    url: '/services/google-ads',
  },
}

const services = [
  {
    icon: Target,
    title: 'Campaign Strategy & Setup',
    desc: 'We research your market, competitors, and customer search behavior — then build a campaign structure designed to capture high-intent leads (not just clicks).',
  },
  {
    icon: Zap,
    title: 'Keyword Research & Targeting',
    desc: 'We target "emergency plumber", "AC repair near me", and the high-intent keywords that turn into booked jobs — not "how to fix a leaky faucet" (informational, not buying).',
  },
  {
    icon: MousePointerClick,
    title: 'Ad Copy & Landing Pages',
    desc: 'Compelling ad copy + dedicated landing pages that match the search intent. Every click lands on a page designed to convert — with a booking form that flows into Fieseros CRM.',
  },
  {
    icon: BarChart3,
    title: 'Conversion Tracking',
    desc: 'We track every click → form submission → booked job → revenue. You see exactly which keywords and ads are making money, not just which ones get clicks.',
  },
  {
    icon: Wallet,
    title: 'Budget Optimization',
    desc: 'We monitor your campaigns daily, shifting budget to the keywords that convert and pausing the ones that don\'t. No wasted spend on clicks that don\'t become jobs.',
  },
  {
    icon: Gauge,
    title: 'Monthly ROI Reports',
    desc: 'Transparent monthly reports showing spend, leads, cost per lead, booked jobs, and revenue. You always know your return on ad spend (ROAS).',
  },
]

const process = [
  { step: '1', title: 'Strategy Call', desc: 'We learn about your business, your average job value, your profit margins, and how many jobs you can handle per month. This determines your ad budget.' },
  { step: '2', title: 'Campaign Setup', desc: 'We research keywords, write ad copy, build landing pages, set up conversion tracking, and launch your campaigns on Google.' },
  { step: '3', title: 'Optimize & Scale', desc: 'In the first 2 weeks, we optimize bids, ad copy, and landing pages based on real data. We cut what doesn\'t work and scale what does.' },
  { step: '4', title: 'Track Revenue', desc: 'Every lead flows into Fieseros CRM. We connect ad clicks → leads → booked jobs → revenue so you see true ROAS, not just cost per click.' },
  { step: '5', title: 'Monthly Review', desc: 'Monthly strategy call to review performance, plan next month\'s budget, and adjust targeting based on seasonality and business goals.' },
]

const faqs = [
  {
    q: 'How much should I spend on Google Ads?',
    a: 'It depends on your industry, market, and average job value. A plumber in a mid-sized city might start at $500–$1,000/month. A roofer in a competitive market might need $2,000+/month. We\'ll recommend a budget after the strategy call.',
  },
  {
    q: 'How quickly will I see results?',
    a: 'Google Ads can generate leads within 24 hours of launch. However, it takes 2–4 weeks to optimize campaigns and find the best-converting keywords. We set realistic expectations during onboarding.',
  },
  {
    q: 'What\'s the difference between Google Ads and SEO?',
    a: 'Google Ads = pay to appear at the top of Google immediately (stop paying = stop appearing). SEO = earn your way to the top over 3–6 months (lasts longer, but takes time). Most service businesses should do both — Ads for immediate leads, SEO for long-term growth.',
  },
  {
    q: 'Do you charge a management fee on top of my ad budget?',
    a: 'Yes. Our management fee is typically $499–$999/month depending on campaign complexity. Your ad budget goes directly to Google — we don\'t mark it up. You see exactly what you\'re paying for.',
  },
  {
    q: 'Can I see which ads are generating revenue?',
    a: 'Yes — that\'s the Fieseros advantage. Because we integrate with Fieseros CRM, we can connect every ad click → lead → booked job → invoice → revenue. Most agencies can only report on clicks and form submissions, not actual revenue.',
  },
  {
    q: 'What if I don\'t have a Fieseros website?',
    a: 'We can build dedicated landing pages for your ads (hosted on Fieseros) even if your main website is elsewhere. However, we recommend a Fieseros website for the best tracking and conversion optimization.',
  },
]

export default function GoogleAdsPage() {
  const schema = getServiceSchema({
    name: 'Google Ads Management for Service Businesses',
    description: 'Campaign setup, keyword targeting, ad copy, landing pages, and ROI tracking for Google Ads. Built for service businesses.',
    url: 'https://fieseros.com/services/google-ads',
    category: 'Pay-Per-Click Advertising',
  })

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
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
        title="Turn Google Searches Into Booked Jobs"
        subtitle="When someone searches 'emergency plumber' or 'AC repair near me', you want to be the first result. Google Ads puts you there instantly — and we make sure every click converts into revenue."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/services/get-a-quote?service=google_ads">
            <Button size="lg" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Get a Free Strategy Call <ArrowRight className="size-4" />
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
            Full-funnel Google Ads management — from strategy to revenue tracking.
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
            Our Process
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

      {/* ── The Fieseros advantage ────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
          The Fieseros Advantage: Track Revenue, Not Just Clicks
        </h2>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-8 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-cyan-950/20">
          <p className="text-base text-foreground mb-6">
            Most Google Ads agencies report on <strong>clicks</strong> and <strong>cost per click</strong>.
            Fieseros reports on <strong>booked jobs</strong> and <strong>revenue</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Other agencies:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• "You got 500 clicks this month!"</li>
                <li>• "Cost per click is $3.50"</li>
                <li>• "Your CTR is 5.2%"</li>
                <li>• No idea which clicks became jobs</li>
                <li>• No connection to your CRM or revenue</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Fieseros:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> "You got 23 booked jobs from Google Ads"</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> "Cost per booked job: $87"</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> "Revenue from ads: $11,500"</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> "ROAS: 4.6x (every $1 spent = $4.60 revenue)"</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Full pipeline: click → lead → job → invoice</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Ready to turn Google searches into revenue?"
        subtitle="Book a free strategy call. We'll review your market and recommend a Google Ads plan that fits your budget."
        primaryCta={{ label: 'Book a Free Strategy Call', href: '/services/get-a-quote' }}
        secondaryCta={{ label: 'See All Services', href: '/services' }}
      />
    </CornerstoneLayout>
  )
}

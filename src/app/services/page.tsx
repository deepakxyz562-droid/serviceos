import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout'
import { CtaSection } from '@/components/seo/cta-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getServiceCatalogSchema } from '@/lib/seo/schemas'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Fieseros Services — Build it. Grow it. Run it. | Websites, SEO & CRM for Service Businesses',
  description:
    'One partner for your service business. Build a lead-generating website, grow with SEO and Google Ads, and run your entire operation with Fieseros CRM. Built for plumbers, HVAC, electricians, landscapers, and 20+ industries.',
  alternates: { canonical: '/services' },
  openGraph: {
    title: 'Fieseros Services — Build it. Grow it. Run it.',
    description:
      'Websites, SEO, Google Ads, and the Fieseros CRM — all from one partner built for service businesses.',
    url: '/services',
  },
}

const services = [
  {
    category: 'Build',
    icon: '🏗️',
    color: 'emerald',
    title: 'Website Development',
    description:
      'Get a website that actually generates leads — mobile-first, SEO-ready, with booking and quote forms built in.',
    href: '/services/website-development',
    features: [
      '5–15 page professional website',
      'Mobile-first responsive design',
      'Booking & quote request forms',
      'Google Business Profile integration',
      'Local SEO foundation',
      'Fieseros CRM integration',
    ],
    startingPrice: '$999',
  },
  {
    category: 'Grow',
    icon: '📈',
    color: 'sky',
    title: 'SEO & Local Search',
    description:
      'Turn traffic into customers with local SEO, Google Business Profile optimization, and lead generation.',
    href: '/services/seo',
    features: [
      'Local SEO optimization',
      'Google Business Profile setup',
      'Keyword & competitor research',
      'On-page SEO optimization',
      'Review & reputation management',
      'Monthly performance reports',
    ],
    startingPrice: 'Custom',
  },
  {
    category: 'Grow',
    icon: '🎯',
    color: 'sky',
    title: 'Google Ads',
    description:
      'Get qualified leads fast with Google Ads management — campaign setup, optimization, and ROI tracking.',
    href: '/services/google-ads',
    features: [
      'Campaign strategy & setup',
      'Keyword research & targeting',
      'Ad copy & landing pages',
      'Conversion tracking',
      'Daily budget optimization',
      'Monthly ROI reports',
    ],
    startingPrice: 'Custom',
  },
]

export default function ServicesPage() {
  const schema = getServiceCatalogSchema()

  return (
    <CornerstoneLayout
      breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: 'Services', url: '/services' },
      ]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <CornerstoneHero
        eyebrow="Build. Grow. Run."
        title="Everything Your Service Business Needs — From One Partner"
        subtitle="Fieseros is the only platform that builds your website, grows your traffic, and runs your entire business. No more juggling agencies, freelancers, and software subscriptions."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/services/get-a-quote">
            <Button size="lg" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Get a Free Quote <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/#signup">
            <Button size="lg" variant="outline">
              Start Free CRM Trial
            </Button>
          </Link>
        </div>
      </CornerstoneHero>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
            One Partner. Three Ways to Grow.
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Most agencies sell you a website and disappear. Fieseros builds your website,
            then keeps working — driving traffic, capturing leads, and running your
            business alongside you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.href} className="flex flex-col overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    {service.category}
                  </span>
                </div>
                <div className="text-3xl mb-2">{service.icon}</div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2 mb-6 flex-1">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-muted-foreground">Starting at</span>
                  <span className="text-lg font-bold text-foreground">{service.startingPrice}</span>
                </div>
                <Link href={service.href} className="block">
                  <Button variant="outline" className="w-full gap-1.5">
                    Learn More <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
            Why Fieseros Is Different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">A normal agency</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="line-through opacity-60">Sells you a website → done</li>
                <li className="line-through opacity-60">Charges extra for SEO</li>
                <li className="line-through opacity-60">No CRM — you're on your own</li>
                <li className="line-through opacity-60">Disappears after launch</li>
                <li className="line-through opacity-60">One-time revenue, no relationship</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Fieseros</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Website → Leads → CRM → Jobs → Payments → Growth</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> SEO + Google Ads built in</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Full CRM — leads, jobs, scheduling, invoicing</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> AI Receptionist + WhatsApp automation</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Recurring growth partnership</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
          The Complete Customer Journey
        </h2>
        <div className="space-y-4">
          {[
            { step: '1', title: 'Build', desc: 'We build your lead-generating website with booking + quote forms integrated directly into Fieseros CRM.' },
            { step: '2', title: 'Grow', desc: 'We optimize your Google Business Profile, run local SEO, and manage Google Ads to drive qualified traffic.' },
            { step: '3', title: 'Capture', desc: 'Every website visitor can book a service or request a quote — leads flow straight into your Fieseros CRM.' },
            { step: '4', title: 'Run', desc: 'Manage leads, jobs, scheduling, dispatch, invoices, and payments from one dashboard. AI Receptionist handles calls 24/7.' },
            { step: '5', title: 'Scale', desc: 'Monthly reports show what\'s working. We double down on the channels that drive revenue.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaSection
        title="Ready to build, grow, and run your service business?"
        subtitle="Get a free quote for a Fieseros website + growth plan. Or start your CRM trial today."
        primaryCta={{ label: 'Get a Free Quote', href: '/services/get-a-quote' }}
        secondaryCta={{ label: 'Explore the CRM', href: '/features' }}
      />
    </CornerstoneLayout>
  )
}

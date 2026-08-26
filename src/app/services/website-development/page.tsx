import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Smartphone, Search, Zap, Globe, Palette, ShoppingCart } from 'lucide-react'
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout'
import { CtaSection } from '@/components/seo/cta-section'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getServiceSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = {
  title: 'Website Development for Service Businesses | Fieseros',
  description:
    'Get a lead-generating website built for your service business. Mobile-first, SEO-ready, with booking and quote forms integrated directly into Fieseros CRM. Starting at $999.',
  alternates: { canonical: '/services/website-development' },
  openGraph: {
    title: 'Website Development for Service Businesses | Fieseros',
    description:
      'Lead-generating websites for plumbers, HVAC, electricians, cleaners, landscapers, and 20+ service industries. Starting at $999.',
    url: '/services/website-development',
  },
}

const features = [
  {
    icon: Smartphone,
    title: 'Mobile-First Design',
    desc: '70%+ of your customers browse on mobile. Every site is built mobile-first, loads in under 2 seconds, and passes Core Web Vitals.',
  },
  {
    icon: Search,
    title: 'SEO-Ready Foundation',
    desc: 'Structured data, optimized meta tags, clean URLs, and internal linking — built to rank on Google from day one.',
  },
  {
    icon: Zap,
    title: 'Lead Capture Built In',
    desc: 'Booking forms, quote requests, and click-to-call buttons — every visitor can become a lead with one click.',
  },
  {
    icon: Globe,
    title: 'Google Business Profile Integration',
    desc: 'Your website syncs with your Google Business Profile. The "Book" button on Google Maps links straight to your site.',
  },
  {
    icon: Palette,
    title: 'Industry-Specific Design',
    desc: 'Not a generic template. Your site is designed for your industry — plumbing, HVAC, electrical, cleaning, landscaping, and more.',
  },
  {
    icon: ShoppingCart,
    title: 'Fieseros CRM Integration',
    desc: 'Every form submission flows straight into your Fieseros CRM — leads, jobs, scheduling, and invoicing in one place.',
  },
]

const tiers = [
  {
    name: 'Starter Website',
    price: '$999',
    cadence: 'one-time',
    description: 'For small local businesses getting online for the first time.',
    features: [
      '5-page professional website',
      'Mobile-responsive design',
      'Contact / quote request form',
      'Google Maps integration',
      'Basic SEO setup',
      'Analytics installation',
      'Hosting & deployment',
      '2 rounds of revisions',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Growth Website',
    price: '$2,499',
    cadence: 'one-time',
    description: 'Our main package — built to generate leads and integrate with Fieseros CRM.',
    features: [
      '8–15 page professional website',
      'Industry-specific design',
      'Service pages with booking forms',
      'Lead capture + quote requests',
      'Google Business Profile integration',
      'Local SEO foundation',
      'Fieseros CRM integration (leads → jobs → invoices)',
      'Conversion optimization',
      'Analytics + conversion tracking',
      'Unlimited revisions for 30 days',
      '30 days post-launch support',
    ],
    cta: 'Get a Quote',
    highlighted: true,
  },
]

const faqs = [
  {
    q: 'How long does it take to build my website?',
    a: 'The Starter Website takes 7–10 business days. The Growth Website takes 2–3 weeks, depending on how quickly you provide content (photos, service descriptions, pricing).',
  },
  {
    q: 'Do I own the website?',
    a: 'Yes — you own 100% of the website. We deploy it to your hosting account (or Fieseros-managed hosting if you prefer). No lock-in, no proprietary CMS.',
  },
  {
    q: 'What if I already have a website?',
    a: 'We can redesign your existing site or build a new one alongside it. We\'ll review your current site\'s SEO equity and make sure we don\'t lose any Google rankings during the migration.',
  },
  {
    q: 'Does the website include ongoing SEO?',
    a: 'The Growth Website includes a local SEO foundation (optimized content, structured data, Google Business Profile setup). For ongoing monthly SEO (content, link building, reputation management), see our SEO service.',
  },
  {
    q: 'Can I edit the website myself after launch?',
    a: 'Yes — your website is built on a modern CMS (or Next.js with an admin panel) so you can edit content, add services, and update photos without a developer.',
  },
  {
    q: 'What industries do you specialize in?',
    a: 'Service businesses — plumbing, HVAC, electrical, cleaning, landscaping, lawn care, painting, handyman, tree care, snow removal, pest control, roofing, pool service, window cleaning, concrete, garage door, solar, pet services, and more.',
  },
]

export default function WebsiteDevelopmentPage() {
  const schema = getServiceSchema({
    name: 'Website Development for Service Businesses',
    description: 'Lead-generating websites for service businesses. Mobile-first, SEO-ready, with booking and quote forms integrated into Fieseros CRM. Starting at $999.',
    url: 'https://fieseros.com/services/website-development',
    category: 'Website Development',
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
        eyebrow="Build"
        title="Websites That Generate Leads — Not Just Look Pretty"
        subtitle="Most agency websites are brochures. Yours will be a lead machine — mobile-first, SEO-ready, with booking forms that flow straight into your Fieseros CRM. Starting at $999."
      >
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/services/get-a-quote?service=website">
            <Button size="lg" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Get a Free Quote <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/services/website-development/plumbing">
            <Button size="lg" variant="outline">
              See Industry Examples
            </Button>
          </Link>
        </div>
      </CornerstoneHero>

      {/* ── Features grid ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
            Built to Generate Leads, Not Just Impress
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Every decision — design, copy, forms, speed — is optimized for one thing:
            turning visitors into booked jobs.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Pricing tiers ─────────────────────────────────────────────── */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Two tiers — pick what fits your business. Both include Fieseros CRM integration.
              Pro / custom projects available on request.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={tier.highlighted ? 'border-emerald-500 border-2 relative' : 'border-border'}
              >
                {tier.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-sm text-muted-foreground ml-1">{tier.cadence}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/services/get-a-quote?service=website" className="block">
                    <Button
                      className={`w-full gap-1.5 ${tier.highlighted ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      variant={tier.highlighted ? 'default' : 'outline'}
                    >
                      {tier.cta} <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Need something custom? <Link href="/contact-us" className="text-emerald-600 hover:underline">Contact us</Link> about Pro / custom web applications.
          </p>
        </div>
      </section>

      {/* ── Process ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8 text-center">
          How It Works
        </h2>
        <div className="space-y-6">
          {[
            { step: '1', title: 'Discovery Call', desc: 'We learn about your business, your customers, your services, and your goals. You tell us what makes you different from your competitors.' },
            { step: '2', title: 'Design & Content', desc: 'We design your site — industry-specific, mobile-first, with SEO-optimized copy. You review and request changes.' },
            { step: '3', title: 'Development & Integration', desc: 'We build the site, integrate booking forms with Fieseros CRM, set up Google Business Profile, and install analytics.' },
            { step: '4', title: 'Launch & Training', desc: 'We launch your site, train you on editing content, and show you how leads flow into your CRM dashboard.' },
            { step: '5', title: 'Grow (Optional)', desc: 'Add ongoing SEO, Google Ads, or AI Receptionist to turn your new site into a lead-generation machine.' },
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
        title="Ready for a website that actually generates leads?"
        subtitle="Get a free quote tailored to your business and industry. No obligation."
        primaryCta={{ label: 'Get a Free Quote', href: '/services/get-a-quote' }}
        secondaryCta={{ label: 'See All Services', href: '/services' }}
      />
    </CornerstoneLayout>
  )
}

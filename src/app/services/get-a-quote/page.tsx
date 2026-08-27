import type { Metadata } from 'next'
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout'
import { QuoteForm } from './quote-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Get a Free Quote — Fieseros Services | Websites, SEO & Google Ads',
  description:
    'Get a free quote for a Fieseros website, SEO, or Google Ads package. Built for service businesses. We\'ll be in touch within 1 business day.',
  alternates: { canonical: '/services/get-a-quote' },
  openGraph: {
    title: 'Get a Free Quote — Fieseros Services',
    description:
      'Get a free quote for a Fieseros website, SEO, or Google Ads package. Built for service businesses.',
    url: '/services/get-a-quote',
  },
  robots: { index: true, follow: true },
}

export default function GetAQuotePage() {
  return (
    <CornerstoneLayout
      breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: 'Services', url: '/services' },
        { name: 'Get a Quote', url: '/services/get-a-quote' },
      ]}
    >
      <CornerstoneHero
        eyebrow="Free Quote"
        title="Get a Free Quote for Your Service Business"
        subtitle="Tell us about your business and what you need. We'll get back to you within 1 business day with a tailored proposal — no obligation."
      />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <QuoteForm />
      </div>
    </CornerstoneLayout>
  )
}

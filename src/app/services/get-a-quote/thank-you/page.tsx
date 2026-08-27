import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { CornerstoneLayout } from '@/components/seo/cornerstone-layout'
import { CtaSection } from '@/components/seo/cta-section'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Thank You — Fieseros Services',
  description: 'Your quote request has been submitted. We\'ll be in touch within 1 business day.',
  robots: { index: false, follow: true }, // Don't index the thank-you page
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>
}) {
  const { leadId } = await searchParams

  return (
    <CornerstoneLayout>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Thanks for your interest!
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-2">
            Your request has been submitted. One of our specialists will be in touch
            within <strong className="text-foreground">1 business day</strong> to discuss your project.
          </p>
          {leadId && (
            <p className="text-xs text-muted-foreground mt-4">
              Reference ID: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{leadId}</code>
            </p>
          )}
        </div>

        {/* What happens next */}
        <div className="mt-12 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">What happens next?</h2>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">1</div>
              <div>
                <h3 className="font-medium text-foreground">We review your request</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Our team reviews your project details and prepares a tailored proposal.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">2</div>
              <div>
                <h3 className="font-medium text-foreground">We reach out within 1 business day</h3>
                <p className="text-sm text-muted-foreground mt-0.5">A Fieseros specialist will email or call you to discuss your project in detail.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">3</div>
              <div>
                <h3 className="font-medium text-foreground">You get a tailored proposal</h3>
                <p className="text-sm text-muted-foreground mt-0.5">We send you a detailed quote with pricing, timeline, and deliverables — no obligation.</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Secondary CTA — start CRM trial while waiting */}
        <div className="mt-8 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 text-center dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-cyan-950/20">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            While you wait — start your free CRM trial
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Explore the Fieseros platform that powers your future website. Manage leads,
            jobs, scheduling, and invoices from one dashboard. No credit card required.
          </p>
          <Link href="/#signup">
            <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Start Free CRM Trial <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>

      <CtaSection
        title="Have questions in the meantime?"
        subtitle="We're here to help. Reach out anytime."
        primaryCta={{ label: 'Contact Us', href: '/contact-us' }}
        secondaryCta={{ label: 'Back to Services', href: '/services' }}
      />
    </CornerstoneLayout>
  )
}

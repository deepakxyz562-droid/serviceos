import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Scale,
  Check,
  X,
  ArrowRight,
  DollarSign,
  Phone,
  Layers,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  CheckCircle2,
  Award,
  Building2,
  LayoutGrid,
} from 'lucide-react';
import { CornerstoneLayout, CornerstoneHero, ContentSection } from '@/components/seo/cornerstone-layout';
import { FaqSection } from '@/components/seo/faq-section';
import { CtaSection } from '@/components/seo/cta-section';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSoftwareApplicationSchema, getFaqSchema, type FaqItem } from '@/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Fieseros vs Jobber (2026 Comparison) | Fieseros',
  description:
    'Compare Fieseros vs Jobber for field service businesses. See why contractors choose Fieseros for built-in 24/7 AI voice receptionists & 0% platform payment fees.',
  keywords: [
    'fieseros vs jobber',
    'jobber alternative',
    'jobber vs fieseros',
    'best jobber alternative',
    'jobber alternatives for contractors',
    'field service software comparison',
    'jobber pricing comparison',
  ],
  alternates: {
    canonical: 'https://fieseros.com/fieseros-vs-jobber',
  },
  openGraph: {
    title: 'Fieseros vs Jobber (2026 Comparison) | Fieseros',
    description:
      'Detailed feature and pricing comparison between Fieseros and Jobber. Compare 24/7 AI voice answering, dispatch, payments, and fees.',
    url: 'https://fieseros.com/fieseros-vs-jobber',
    siteName: 'Fieseros',
    type: 'article',
  },
  robots: { index: true, follow: true },
};

const comparisonMatrix = [
  {
    feature: '24/7 Autonomous AI Voice Phone Receptionist',
    fieseros: true,
    jobber: false,
    note: 'Fieseros answers phone calls on the 1st ring, quotes prices, and books calendar slots live',
  },
  {
    feature: '0% Platform Transaction Fees on Invoices',
    fieseros: true,
    jobber: false,
    note: 'Jobber charges higher processing rates and locks you into Jobber Payments',
  },
  {
    feature: '33+ Payment Gateways Supported',
    fieseros: true,
    jobber: false,
    note: 'Fieseros connects Stripe, Square, PayPal, Authorize.net, Mollie, Razorpay, etc.',
  },
  {
    feature: 'Two-Sided Marketplace & Homeowner Lead Generation',
    fieseros: true,
    jobber: false,
    note: 'Fieseros directory brings you new local homeowner job requests; Jobber only manages existing leads',
  },
  {
    feature: 'Free Tier Available (First 100 Jobs Free)',
    fieseros: true,
    jobber: false,
    note: 'Jobber starts at $49–$349/month with strict user limits and no free plan',
  },
  {
    feature: 'Drag-and-Drop Scheduling & Dispatch Calendar',
    fieseros: true,
    jobber: true,
    note: 'Both offer intuitive drag-and-drop team calendar dispatching',
  },
  {
    feature: 'Real-Time Technician GPS Tracking & Route Optimization',
    fieseros: true,
    jobber: true,
    note: 'Both show technician location tracking on live maps',
  },
  {
    feature: 'Good / Better / Best Multi-Tier Quoting',
    fieseros: true,
    jobber: true,
    note: 'Both allow presenting tiered proposal options to homeowners',
  },
  {
    feature: 'Technician Mobile App (iOS / Android / PWA)',
    fieseros: true,
    jobber: true,
    note: 'Both offer mobile apps for field technicians to view work orders and collect signatures',
  },
  {
    feature: 'Custom Digital Inspection Checklists & Photo Geotags',
    fieseros: true,
    jobber: true,
    note: 'Both allow attaching timestamped before/after photos and inspection forms',
  },
];

const faqs: FaqItem[] = [
  {
    question: 'How is Fieseros different from Jobber?',
    answer:
      'While Jobber focuses on traditional scheduling and invoicing, Fieseros adds an autonomous 24/7 AI Voice Receptionist that answers your business phone calls, qualifies callers, and books appointments into your calendar while you work. Furthermore, Fieseros charges 0% platform transaction fees on payments, supports 33+ payment gateways, and includes a verified local marketplace that brings you new customer leads.',
  },
  {
    question: 'Can I migrate my clients and job history from Jobber to Fieseros?',
    answer:
      'Yes. You can export your client list, properties, and past invoices from Jobber as a CSV and import them directly into Fieseros in under 5 minutes with our automated data migration wizard.',
  },
  {
    question: 'How does Fieseros pricing compare to Jobber?',
    answer:
      'Jobber starts at $49/month for 1 user (Core), $169/month for up to 5 users (Connect), and $349/month for up to 15 users (Grow). In contrast, Fieseros offers a free starting tier for your first 100 jobs and simple, affordable growth tiers without punitive per-user fee hikes or locked-in payment processor fees.',
  },
  {
    question: 'Does Jobber have an AI receptionist?',
    answer:
      'No. Jobber does not offer a 24/7 AI voice phone receptionist. If you miss a call while using Jobber, it goes to standard voicemail. With Fieseros, our built-in AI answers on the first ring, answers trade-specific customer questions, and locks the job into your calendar.',
  },
  {
    question: 'Which software is better for solo contractors and growing teams?',
    answer:
      'For solo contractors and trade teams looking to automate phone answering, keep 100% of their payment margins with 0% extra fees, and acquire new local jobs through a built-in marketplace, Fieseros provides significantly higher value and lower overhead than Jobber.',
  },
];

export default function FieserosVsJobberPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: 'Fieseros vs Jobber Software Comparison',
    description:
      'In-depth comparison between Fieseros and Jobber. Compare features, pricing, 24/7 AI voice receptionist capabilities, and payment processing fees.',
    url: 'https://fieseros.com/fieseros-vs-jobber',
    applicationCategory: 'BusinessApplication',
    offers: { price: '0', priceCurrency: 'USD' },
  });

  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      activePath="/fieseros-vs-jobber"
      breadcrumbs={[
        { name: 'Home', url: 'https://fieseros.com' },
        { name: 'Compare', url: 'https://fieseros.com/jobber-alternatives' },
        { name: 'Fieseros vs Jobber', url: 'https://fieseros.com/fieseros-vs-jobber' },
      ]}
      additionalSchema={[appSchema, faqSchema]}
    >
      <CornerstoneHero
        eyebrow="2026 Software Comparison"
        title="Fieseros vs. Jobber: Which Field Service Software Wins in 2026?"
        subtitle="Looking for an alternative to Jobber? See how Fieseros compares on scheduling, dispatch, payments, and why contractors are switching for built-in 24/7 AI voice phone answering and 0% payment platform fees."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
          >
            <span>Try Fieseros Free — 100 Jobs Included</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/jobber-alternatives"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            View Top 10 Jobber Alternatives
          </Link>
        </div>
      </CornerstoneHero>

      {/* Feature Comparison Matrix */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Side-by-Side Feature Breakdown
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            How Fieseros and Jobber compare across essential field service management capabilities.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-muted/50 text-foreground font-bold border-b border-border">
              <tr>
                <th className="p-4">Key Capability</th>
                <th className="p-4 text-emerald-600 dark:text-emerald-400">Fieseros</th>
                <th className="p-4 text-slate-500">Jobber</th>
                <th className="p-4 hidden md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {comparisonMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-semibold">{row.feature}</td>
                  <td className="p-4 text-emerald-600 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Check className="size-4 text-emerald-600" /> Yes
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {row.jobber ? (
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Check className="size-4 text-slate-500" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500">
                        <X className="size-4" /> No
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground hidden md:table-cell">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Core Advantages of Fieseros */}
      <ContentSection
        eyebrow="The Fieseros Difference"
        title="Three Reasons Contractors Are Choosing Fieseros over Jobber"
        subtitle="Modern field service requires more than just a calendar — it requires autonomous lead capture and margin protection."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Phone className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Built-in 24/7 AI Phone Agent</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jobber leaves unanswered phone calls to voicemail. Fieseros answers your phone on the 1st ring, quotes prices, and books the customer into your calendar before they call your competitors.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
              <DollarSign className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">0% Platform Payment Fees</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jobber charges software fees AND locks you into Jobber Payments. Fieseros charges 0% platform transaction fees and lets you connect 33+ global payment processors of your choice.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
              <Sparkles className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Two-Sided Job Marketplace</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jobber only manages the clients you already have. Fieseros features an integrated directory and verified marketplace that delivers high-intent homeowner requests straight to your inbox.
            </p>
          </Card>
        </div>
      </ContentSection>

      <FaqSection
        title="Frequently Asked Questions: Fieseros vs Jobber"
        subtitle="Common questions from trade business owners considering a switch from Jobber."
        faqs={faqs}
      />

      {/* Hub-and-spoke internal linking */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
            Related Field Service Software Guides
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Compare top platforms and explore our full market analyses for service contractors.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/best-field-service-software"
              className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md"
            >
              <Award className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">
                Best Field Service Software (2026)
              </h3>
              <p className="text-xs text-muted-foreground">
                Comprehensive 10-platform ranking, pricing matrix &amp; buyer&apos;s guide.
              </p>
            </Link>
            <Link
              href="/jobber-alternatives"
              className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md"
            >
              <Scale className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">
                10 Best Jobber Alternatives
              </h3>
              <p className="text-xs text-muted-foreground">
                Honest pricing breakdowns, per-seat fee comparisons, and feature reviews.
              </p>
            </Link>
            <Link
              href="/housecall-pro-alternatives"
              className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md"
            >
              <Building2 className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">
                Housecall Pro Alternatives
              </h3>
              <p className="text-xs text-muted-foreground">
                Top residential service software alternatives compared.
              </p>
            </Link>
            <Link
              href="/field-service-software"
              className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md"
            >
              <LayoutGrid className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">
                Fieseros FSM Platform
              </h3>
              <p className="text-xs text-muted-foreground">
                All-in-one Voice AI, scheduling, GPS dispatch, and contractor CRM.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <CtaSection
        title="Ready to Switch to Fieseros?"
        subtitle="Get started free with your first 100 jobs included. No credit card required, easy 1-click CSV import from Jobber."
        primaryCta="Start Free Trial"
        primaryHref="/#signup"
        secondaryCta="Explore All Features"
        secondaryHref="/features"
      />
    </CornerstoneLayout>
  );
}

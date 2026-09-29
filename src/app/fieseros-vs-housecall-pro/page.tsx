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
} from 'lucide-react';
import { CornerstoneLayout, CornerstoneHero, ContentSection } from '@/components/seo/cornerstone-layout';
import { FaqSection } from '@/components/seo/faq-section';
import { CtaSection } from '@/components/seo/cta-section';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSoftwareApplicationSchema, getFaqSchema, type FaqItem } from '@/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Fieseros vs Housecall Pro (2026 Comparison) | Fieseros',
  description:
    'Compare Fieseros vs Housecall Pro for contractors. Compare pricing, 24/7 AI voice phone receptionist, 0% platform payment fees, and scheduling features.',
  keywords: [
    'fieseros vs housecall pro',
    'housecall pro alternative',
    'housecall pro vs fieseros',
    'best housecall pro alternative',
    'housecall pro competitors',
    'field service software comparison',
    'housecall pro pricing alternative',
  ],
  alternates: {
    canonical: 'https://fieseros.com/fieseros-vs-housecall-pro',
  },
  openGraph: {
    title: 'Fieseros vs Housecall Pro (2026 Comparison) | Fieseros',
    description:
      'Detailed feature and pricing breakdown between Fieseros and Housecall Pro. Compare 24/7 AI voice answering, dispatch, payments, and fees.',
    url: 'https://fieseros.com/fieseros-vs-housecall-pro',
    siteName: 'Fieseros',
    type: 'article',
  },
  robots: { index: true, follow: true },
};

const comparisonMatrix = [
  {
    feature: '24/7 Autonomous AI Voice Phone Receptionist',
    fieseros: true,
    housecallPro: false,
    note: 'Fieseros AI answers calls on the 1st ring, quotes prices, and books live slots; Housecall Pro offers an expensive third-party human answering add-on',
  },
  {
    feature: '0% Platform Transaction Fees on Invoices',
    fieseros: true,
    housecallPro: false,
    note: 'Housecall Pro locks contractors into their proprietary payment processor',
  },
  {
    feature: '33+ Payment Gateways Supported',
    fieseros: true,
    housecallPro: false,
    note: 'Fieseros connects Stripe, Square, PayPal, Authorize.net, Mollie, Razorpay, and more',
  },
  {
    feature: 'Free Starter Tier (First 100 Jobs Free)',
    fieseros: true,
    housecallPro: false,
    note: 'Housecall Pro starts at $49–$129/mo for basic single-user plans with steep upgrade costs',
  },
  {
    feature: 'Two-Sided Marketplace & Verified Contractor Directory',
    fieseros: true,
    housecallPro: false,
    note: 'Fieseros delivers inbound homeowner leads directly to your profile',
  },
  {
    feature: 'Drag-and-Drop Calendar & Dispatching',
    fieseros: true,
    housecallPro: true,
    note: 'Both provide dispatch calendars with color-coded job statuses',
  },
  {
    feature: 'Technician GPS Tracking & On-My-Way SMS Alerts',
    fieseros: true,
    housecallPro: true,
    note: 'Both send customer arrival tracking links with technician location',
  },
  {
    feature: 'Good / Better / Best Multi-Option Quoting',
    fieseros: true,
    housecallPro: true,
    note: 'Both support tiered proposals to boost average ticket sizes',
  },
  {
    feature: 'Mobile App for Technicians (iOS, Android & PWA)',
    fieseros: true,
    housecallPro: true,
    note: 'Both offer field technician mobile apps with work orders and signature capture',
  },
  {
    feature: 'Automated Invoice Generation & Review Requests',
    fieseros: true,
    housecallPro: true,
    note: 'Both trigger automated Google review requests upon job completion',
  },
];

const faqs: FaqItem[] = [
  {
    question: 'Why are contractors switching from Housecall Pro to Fieseros?',
    answer:
      'Contractors are switching to Fieseros primarily because of our autonomous 24/7 AI Voice Receptionist (which eliminates missed calls while on jobsites), 0% platform transaction fees on payments, support for 33+ payment gateways, and lower overall software pricing without restrictive feature lockouts.',
  },
  {
    question: 'How does Fieseros pricing compare to Housecall Pro?',
    answer:
      'Housecall Pro starts at $49/month for a single user (Basic plan with limited features), $129/month for up to 5 users (Essentials), and custom pricing for larger teams. In addition, many essential features require add-on fees. Fieseros offers a free starter plan for your first 100 jobs and flat, predictable pricing that doesn’t punish team growth.',
  },
  {
    question: 'Does Housecall Pro have an AI voice receptionist?',
    answer:
      'No. Housecall Pro offers "Voice", which is an expensive partnership with a human answering service that charges high per-minute rates and merely takes messages. Fieseros features a true native voice AI that understands trade vocabulary, answers in under 1 second, and directly books appointments into your calendar.',
  },
  {
    question: 'Can I import my customer data from Housecall Pro?',
    answer:
      'Yes. Export your customer list, past job records, and property addresses from Housecall Pro to CSV, and Fieseros will import your entire database seamlessly.',
  },
  {
    question: 'Does Fieseros charge extra for online payments?',
    answer:
      'No. Fieseros charges 0% platform transaction fees. You simply connect your Stripe, Square, PayPal, or preferred merchant account and pay standard processing fees without middleman markups.',
  },
];

export default function FieserosVsHousecallProPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: 'Fieseros vs Housecall Pro Software Comparison',
    description:
      'Comprehensive comparison between Fieseros and Housecall Pro. Compare features, pricing, 24/7 AI voice phone answering, and payment processing fees.',
    url: 'https://fieseros.com/fieseros-vs-housecall-pro',
    applicationCategory: 'BusinessApplication',
    offers: { price: '0', priceCurrency: 'USD' },
  });

  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      activePath="/fieseros-vs-housecall-pro"
      breadcrumbs={[
        { name: 'Home', url: 'https://fieseros.com' },
        { name: 'Compare', url: 'https://fieseros.com/jobber-alternatives' },
        { name: 'Fieseros vs Housecall Pro', url: 'https://fieseros.com/fieseros-vs-housecall-pro' },
      ]}
      additionalSchema={[appSchema, faqSchema]}
    >
      <CornerstoneHero
        eyebrow="2026 Software Comparison"
        title="Fieseros vs. Housecall Pro: The Modern Contractor Choice"
        subtitle="Evaluating Housecall Pro vs. Fieseros? Discover why trade businesses are upgrading to Fieseros for built-in 24/7 AI voice receptionists, 0% platform payment fees, and marketplace lead acquisition."
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
            href="/fieseros-vs-jobber"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Compare Fieseros vs Jobber
          </Link>
        </div>
      </CornerstoneHero>

      {/* Feature Comparison Matrix */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Feature & Pricing Breakdown
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare essential capabilities between Fieseros and Housecall Pro.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-muted/50 text-foreground font-bold border-b border-border">
              <tr>
                <th className="p-4">Key Capability</th>
                <th className="p-4 text-emerald-600 dark:text-emerald-400">Fieseros</th>
                <th className="p-4 text-slate-500">Housecall Pro</th>
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
                    {row.housecallPro ? (
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

      {/* Core Advantages */}
      <ContentSection
        eyebrow="Key Strategic Advantages"
        title="Why Fieseros Delivers Higher ROI for Field Service Teams"
        subtitle="Designed to maximize revenue capture, protect gross margins, and eliminate missed opportunities."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Phone className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Autonomous 24/7 Voice AI</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never let an emergency call slip away while on a ladder. Fieseros answers on the first ring, quotes your diagnostic fee, and books the customer live into your schedule.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
              <DollarSign className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Keep 100% of Your Processing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Housecall Pro mandates proprietary payment rails. Fieseros gives you 0% platform transaction fees and lets you bring your own Stripe, Square, or merchant accounts.
            </p>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
              <Sparkles className="size-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">Built-in Customer Acquisition</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fieseros connects directly to our verified local directory and marketplace, funneling homeowner quote requests and emergency repairs to your business.
            </p>
          </Card>
        </div>
      </ContentSection>

      <FaqSection
        title="Frequently Asked Questions: Fieseros vs Housecall Pro"
        subtitle="Answers to common questions about switching your field service business from Housecall Pro."
        faqs={faqs}
      />

      <CtaSection
        title="Ready to Switch to Fieseros?"
        subtitle="Start free with your first 100 jobs included. No credit card required, seamless CSV data migration."
        primaryCta="Start Free Trial"
        primaryHref="/#signup"
        secondaryCta="Explore All Features"
        secondaryHref="/features"
      />
    </CornerstoneLayout>
  );
}

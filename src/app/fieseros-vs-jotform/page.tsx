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
} from 'lucide-react';
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout';
import { FaqSection } from '@/components/seo/faq-section';
import { CtaSection } from '@/components/seo/cta-section';
import { Button } from '@/components/ui/button';
import { getSoftwareApplicationSchema, getFaqSchema, type FaqItem } from '@/lib/seo/schemas';
import type { BreadcrumbItem } from '@/components/seo/breadcrumbs';

export const metadata: Metadata = {
  title: 'Fieseros vs Jotform (2026 Comparison) — Why Businesses Are Switching',
  description:
    'Detailed feature-by-feature comparison between Fieseros AI Studio and Jotform. See why businesses choose Fieseros for autonomous AI chatbots, 24/7 voice receptionists, native CRM, and 0% payment transaction fees.',
  keywords: [
    'Fieseros vs Jotform',
    'Jotform alternative',
    'Jotform comparison',
    'Jotform AI chatbot alternative',
    'free Jotform alternative',
    '0 percent fee payment forms',
    'AI form builder vs Jotform',
  ],
  alternates: {
    canonical: 'https://fieseros.com/fieseros-vs-jotform',
  },
  openGraph: {
    title: 'Fieseros vs Jotform (2026 Comparison) | Fieseros',
    description:
      'Compare Fieseros AI Studio vs Jotform. Autonomous chatbots, AI phone receptionists, 0% platform payment fees, and native CRM.',
    url: 'https://fieseros.com/fieseros-vs-jotform',
    type: 'article',
  },
};

const comparisonMatrix = [
  { feature: 'Visual Drag-and-Drop Form Builder', fieseros: true, jotform: true, note: 'Both offer intuitive drag-and-drop interfaces' },
  { feature: 'AI Form Generation (Natural Language to Form)', fieseros: true, jotform: true, note: 'Prompt-based form generation' },
  { feature: 'Standalone AI Chatbot Builder (16 Channels)', fieseros: true, jotform: true, note: 'Fieseros supports WhatsApp, SMS, Canva, and phone' },
  { feature: '0% Platform Transaction Fees on Payments', fieseros: true, jotform: false, note: 'Jotform caps payment submissions on free/starter plans' },
  { feature: '24/7 AI Voice Phone Receptionist', fieseros: true, jotform: false, note: 'Fieseros answers phone calls and books jobs via voice' },
  { feature: 'Native Field Service CRM & Technician Dispatch', fieseros: true, jotform: false, note: 'Jotform requires 3rd-party Zapier sync' },
  { feature: '1-Click Form to Chatbot Conversion', fieseros: true, jotform: false, note: 'Instant slot-filling conversation from form fields' },
  { feature: '33+ Payment Gateways Supported', fieseros: true, jotform: true, note: 'Stripe, PayPal, Square, Authorize.net, Mollie, Razorpay' },
  { feature: 'Autonomous Business Actions (Jobs, Quotes, Invoices)', fieseros: true, jotform: false, note: 'Fieseros executes real operational actions' },
  { feature: 'Calculations & Live Math Formulas', fieseros: true, jotform: true, note: 'Dynamic pricing calculators' },
];

const faqs: FaqItem[] = [
  {
    question: 'Is Fieseros a good Jotform alternative?',
    answer:
      'Yes. Fieseros matches Jotform on form building (drag-and-drop, AI generation, 200+ widgets, 33+ payment gateways) and adds a 24/7 AI Voice Receptionist, native field-service CRM, technician dispatch, and 0% platform transaction fees. Jotform is form-only; Fieseros is a complete AI service operating system.',
  },
  {
    question: 'Can I migrate my Jotform forms to Fieseros?',
    answer:
      'Yes. Fieseros has an AI form generator that rebuilds any form from a URL or description. Your conditional logic, question types, and branding are preserved. Most customers migrate in under an hour.',
  },
  {
    question: 'Does Fieseros charge payment transaction fees?',
    answer:
      'No. Fieseros charges 0% platform transaction fees on payments — you only pay the gateway fee (Stripe, PayPal, Razorpay, etc.). Jotform caps payment submissions on free and starter plans (10/month on free), which limits revenue collection.',
  },
  {
    question: 'Does Jotform have an AI voice receptionist?',
    answer:
      'No. Jotform is a form and chatbot tool — it cannot answer phone calls. Fieseros includes a 24/7 AI Voice Receptionist that answers every call, captures leads, books appointments, and pages on-call technicians for emergencies.',
  },
];

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Compare', href: '/jobber-alternatives' },
  { label: 'Fieseros vs Jotform', href: '/fieseros-vs-jotform' },
];

export default function FieserosVsJotformPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: 'Fieseros vs Jotform — 2026 Comparison',
    description:
      'Detailed feature-by-feature comparison between Fieseros AI Studio and Jotform.',
    applicationCategory: 'BusinessApplication',
  });
  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      activePath="/fieseros-vs-jotform"
      additionalSchema={[appSchema, faqSchema]}
    >
      {/* Hero */}
      <CornerstoneHero
        eyebrow="2026 Head-to-Head Comparison"
        title="Fieseros vs Jotform: Which is Right for You?"
        subtitle="Jotform is a veteran online form builder with an AI chatbot addon. Fieseros was engineered from the ground up as a complete AI Service OS — seamlessly unifying smart forms, autonomous chatbots, 24/7 AI voice phone receptionists, and live field CRM with 0% platform transaction fees."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Try Fieseros Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/chatbot"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore AI Chatbots
          </Link>
        </div>
      </CornerstoneHero>

      {/* Comparison Table */}
      <section className="border-t bg-muted/15 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Feature Matrix: Fieseros vs Jotform
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Updated for 2026. Verified against official feature lists.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
            <div className="grid grid-cols-12 bg-muted/60 p-4 border-b border-border text-xs sm:text-sm font-bold">
              <div className="col-span-6 text-muted-foreground">Key Capabilities</div>
              <div className="col-span-3 text-center text-emerald-600 font-extrabold">Fieseros</div>
              <div className="col-span-3 text-center text-muted-foreground">Jotform</div>
            </div>

            <div className="divide-y divide-border text-xs sm:text-sm">
              {comparisonMatrix.map((row, i) => (
                <div key={i} className="grid grid-cols-12 p-4 items-center hover:bg-muted/10 transition">
                  <div className="col-span-6">
                    <p className="font-semibold text-foreground">{row.feature}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{row.note}</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    {row.fieseros ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full text-xs">
                        <Check className="size-3.5" /> Included
                      </span>
                    ) : (
                      <X className="size-4 text-red-500" />
                    )}
                  </div>
                  <div className="col-span-3 flex justify-center">
                    {row.jotform ? (
                      <Check className="size-4 text-muted-foreground" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 font-medium text-xs">
                        <X className="size-3.5" /> Not available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3 Reasons Why Users Choose Fieseros */}
      <section className="border-t bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              3 Reasons Businesses Choose Fieseros Over Jotform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <DollarSign className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">1. Zero Payment Submission Caps</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Jotform restricts payment submissions on free and lower tiers (capping free accounts at just 10 payment submissions per month). Fieseros charges 0% platform transaction fees and never caps your transactions.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">2. 24/7 AI Voice Receptionist</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Jotform does not have an AI voice receptionist. Fieseros gives you a dedicated phone line with human-grade natural speech that answers calls, quotes prices, and books appointments when you are busy in the field.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Layers className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">3. Native Field Service CRM</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When a customer submits a Jotform or chats with Jotform AI, you need Zapier or webhooks to pass data to your CRM and dispatch tools. Fieseros includes the CRM, dispatch calendar, and technician mobile app natively.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection
        title="Fieseros vs Jotform — frequently asked"
        subtitle="Everything you need to know. Still have questions? Talk to our team."
        faqs={faqs}
      />

      {/* CTA */}
      <CtaSection
        title="Ready to Upgrade From Jotform?"
        subtitle="Import your forms or build new smart forms and autonomous AI chatbots in seconds. 0% platform fees."
        primaryCta={{ label: 'Start Free with Fieseros', href: '/#signup' }}
        secondaryCta={{ label: 'Explore GPTForm Builder', href: '/gptform' }}
        bullets={['0% platform fees', 'No credit card required', 'Migrate in under an hour']}
      />
    </CornerstoneLayout>
  );
}

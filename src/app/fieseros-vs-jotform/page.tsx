import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Bot,
  CreditCard,
  DollarSign,
  Phone,
  Layers,
  Scale,
  ChevronDown,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

export default function FieserosVsJotformPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Fieseros vs Jotform: 2026 Detailed Comparison',
    description: 'Comprehensive comparison of Fieseros AI Studio vs Jotform covering form building, AI chatbots, payment fees, and CRM integrations.',
    author: { '@type': 'Organization', name: 'Fieseros' },
    publisher: { '@type': 'Organization', name: 'Fieseros', url: 'https://fieseros.com' },
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-emerald-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Scale className="size-3.5" />
            2026 Head-to-Head Comparison
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Fieseros vs Jotform:{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Which is Right for You?
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Jotform is a veteran online form builder with an AI chatbot addon. Fieseros was engineered from the ground up as a complete AI Service OS — seamlessly unifying smart forms, autonomous chatbots, 24/7 AI voice phone receptionists, and live field CRM with 0% platform transaction fees.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-xl shadow-emerald-600/25 rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/forms/new">
                Try Fieseros Free <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 font-semibold text-base rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/chatbot">
                Explore AI Chatbots
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground">
              Feature Matrix: Fieseros vs Jotform
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Updated for 2026. Verified against official feature lists.
            </p>
          </div>

          <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/60 p-4 border-b border-border text-xs sm:text-sm font-bold">
              <div className="col-span-6 text-muted-foreground">Key Capabilities</div>
              <div className="col-span-3 text-center text-emerald-600 font-extrabold">Fieseros AI Studio</div>
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
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-foreground">
              3 Reasons Businesses Choose Fieseros Over Jotform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

      {/* Bottom CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Upgrade From Jotform?
          </h2>
          <p className="text-emerald-100 text-base max-w-xl mx-auto">
            Import your forms or build new smart forms and autonomous AI chatbots in seconds. 0% platform fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button size="lg" className="h-12 px-8 bg-white text-emerald-900 hover:bg-slate-100 font-bold shadow-lg rounded-xl cursor-pointer" asChild>
              <Link href="/forms/new">
                Start Free with Fieseros <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold rounded-xl cursor-pointer" asChild>
              <Link href="/gptform">
                Explore GPTForm Builder
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AiMarketingLayout>
  );
}

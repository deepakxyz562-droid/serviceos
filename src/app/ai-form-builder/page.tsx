import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  FileInput,
  Wand2,
  Layers,
  CheckCircle2,
  ArrowRight,
  Sliders,
  CreditCard,
  Zap,
  Shield,
  FileCheck,
  MousePointerClick,
  Smartphone,
  LayoutTemplate,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'AI Form Builder — Create Smart Online Forms with AI & 200+ Widgets | Fieseros',
  description:
    'Generate production-ready smart forms in seconds from text prompts or website URLs. Includes 200+ widgets, 33 payment gateways, photo annotations, OTP verification, and 20,000+ templates.',
  alternates: { canonical: '/ai-form-builder' },
  openGraph: {
    title: 'AI Form Builder — 200+ Widgets, 20,000+ Templates | Fieseros',
    description:
      'The modern visual form builder powered by AI. Drag-and-drop 200+ field widgets, collect payments with 0% platform fee, and convert forms into AI agents.',
    type: 'website',
  },
};

export default function AiFormBuilderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Fieseros AI Form Builder',
    applicationCategory: 'BusinessApplication',
    description:
      'Elementor-style visual drag-and-drop AI form builder with 200+ widgets, 20,000+ free templates, and 33 payment gateways.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-teal-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Wand2 className="size-3.5" />
            Next-Gen Visual AI Form Studio
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Build High-Converting Forms in Seconds with{' '}
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Generative AI
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Describe what you need, paste an existing website URL, or choose from 20,000+ free templates. Customize with 200+ Elementor-style widgets, calculations, signatures, and instant payments.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base shadow-lg shadow-teal-600/25" asChild>
              <Link href="/forms/new">
                Generate Form with AI <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold text-base" asChild>
              <Link href="/templates">
                Browse 20,000+ Templates
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Everything You Need for Enterprise-Grade Forms
            </h2>
            <p className="mt-3 text-muted-foreground text-base">
              Engineered with Jotform and Typeform parity plus native AI superpowers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <MousePointerClick className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Elementor-Style Visual Canvas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Drag and drop 200+ advanced widgets including drawing annotations, dynamic calculations, e-signatures, and multi-step pages.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CreditCard className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">33 Payment Gateways (0% Fee)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Accept credit cards, Apple Pay, Google Pay, PayPal, Stripe, UPI QR, and BNPL installment plans with zero platform markup.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
                <LayoutTemplate className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">20,000+ Pre-Built Templates</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Instant access to 20,000+ validated templates across 40 categories and 60 industries. 1-click clone and customize.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Build Your First AI Form?
          </h2>
          <p className="text-teal-100 text-base max-w-xl mx-auto">
            Free forever tier. No credit card required. Launch your form in under 2 minutes.
          </p>
          <Button size="lg" className="h-12 px-8 bg-white text-teal-800 hover:bg-teal-50 font-bold shadow-lg" asChild>
            <Link href="/forms/new">
              Start Building Now
            </Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
